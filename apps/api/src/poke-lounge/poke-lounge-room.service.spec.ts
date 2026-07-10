import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FakePokeLoungeRoomRepository } from '../../test/support/fake-poke-lounge-room.repository';
import type { PokeLoungeRoomEventPublisher } from './poke-lounge-room-event.publisher';
import type {
  PokeLoungeRoomRepository,
  PokeLoungeRoomSnapshot,
} from './poke-lounge-room.repository';
import { PokeLoungeRoomService } from './poke-lounge-room.service';

describe('PokeLoungeRoomService', () => {
  let repository: FakePokeLoungeRoomRepository;
  let publisher: jest.Mocked<PokeLoungeRoomEventPublisher>;
  let service: PokeLoungeRoomService;
  let currentTimeMs: number;
  let roomCodes: string[];

  beforeEach(() => {
    currentTimeMs = 0;
    roomCodes = ['ROOM01'];
    repository = new FakePokeLoungeRoomRepository();
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new PokeLoungeRoomService(
      repository,
      publisher,
      () => roomCodes.shift() ?? 'ROOM99',
      () => currentTimeMs,
    );
  });

  it('creates revision zero with durable expiry and publishes only the committed snapshot', async () => {
    const room = await service.createRoom(
      {
        sessionId: ' session-a ',
        userId: ' user-a ',
        roundDurationMs: 1000,
        nowMs: 100,
      },
      command(0, 1),
    );

    expect(room).toMatchObject({
      roomCode: 'ROOM01',
      revision: 0,
      expiresAtMs: 100 + 30 * 60_000,
      participants: [
        {
          playerId: 'player-1',
          sessionId: 'session-a',
          userId: 'user-a',
          displayName: 'Player 1',
        },
      ],
    });
    expectPublicEvent(publisher, 'room-created', room);
  });

  it('publishes a redacted snapshot after a room update', async () => {
    await createRoom();
    publisher.publish.mockClear();

    const room = await service.joinRoom(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2', nowMs: 1 },
      command(0, 2),
    );

    expectPublicEvent(publisher, 'room-updated', room);
  });

  it('retries room-code collisions and preserves the capacity error', async () => {
    await createRoom();
    roomCodes = ['ROOM01', 'ROOM02'];

    const room = await service.createRoom(
      { playerId: 'player-b', sessionId: 'session-b', nowMs: 1 },
      command(0, 2),
    );

    expect(room.roomCode).toBe('ROOM02');

    for (let index = 3; index <= 200; index += 1) {
      roomCodes = [`R${String(index).padStart(5, '0')}`];
      await service.createRoom(
        {
          playerId: `player-${index}`,
          sessionId: `session-${index}`,
          nowMs: 1,
        },
        command(0, index),
      );
    }

    await expect(
      service.createRoom(
        { playerId: 'overflow', sessionId: 'overflow', nowMs: 1 },
        command(0, 201),
      ),
    ).rejects.toThrow('Poke Lounge room capacity reached');
  });

  it('keeps participant authorization and spectator limits inside repository mutations', async () => {
    await createRoom();

    for (let index = 2; index <= 7; index += 1) {
      await service.joinRoom(
        'room01',
        {
          playerId: `player-${index}`,
          sessionId: `session-${index}`,
          nowMs: index,
        },
        command(index - 2, index),
      );
    }

    const room = await service.getRoom('ROOM01', 10);

    expect(
      room.participants.filter((row) => row.role === 'participant'),
    ).toHaveLength(6);
    expect(
      room.participants.find((row) => row.playerId === 'player-7'),
    ).toMatchObject({
      role: 'spectator',
      ready: false,
    });
    await expect(
      service.joinRoom(
        'ROOM01',
        { playerId: 'player-2', sessionId: 'wrong', nowMs: 11 },
        command(6, 20),
      ),
    ).rejects.toThrow('Join sessionId does not match this participant');
  });

  it('starts and durably advances the server round with one revision per commit', async () => {
    await createRoom({ roundDurationMs: 1000 });
    await service.joinRoom(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2', nowMs: 10 },
      command(0, 2),
    );
    const waiting = await service.setReady(
      'ROOM01',
      { playerId: 'player-1', sessionId: 'session-1', ready: true, nowMs: 100 },
      command(1, 3),
    );
    const started = await service.setReady(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2', ready: true, nowMs: 200 },
      command(2, 4),
    );

    expect(waiting.status).toBe('waiting');
    expect(started).toMatchObject({
      status: 'round-started',
      revision: 3,
      round: { startedAtMs: 200, endsAtMs: 1200 },
    });

    publisher.publish.mockClear();
    const tournament = await service.getRoom('room01', 1200);

    expect(tournament).toMatchObject({
      status: 'tournament',
      revision: 4,
      tournament: {
        matches: [
          {
            matchId: 'round-1-match-1',
            participantIds: ['player-1', 'player-2'],
          },
        ],
      },
    });
    expectPublicEvent(publisher, 'room-clock-advanced', tournament);
  });

  it('assigns the next participant id for an anonymous join and uses a stable opaque receipt actor', async () => {
    await createRoom();
    const mutateSpy = jest.spyOn(repository, 'mutate');

    const joined = await service.joinRoom(
      'ROOM01',
      { sessionId: 'guest-session', nowMs: 1 },
      command(0, 2),
    );
    const replay = await service.joinRoom(
      'ROOM01',
      { sessionId: 'guest-session', nowMs: 1 },
      command(joined.revision, 2),
    );

    expect(
      joined.participants.map((participant) => participant.playerId),
    ).toEqual(['player-1', 'player-2']);
    expect(replay).toEqual(joined);
    expect(mutateSpy.mock.calls[0]?.[0].actorPlayerId).toMatch(
      /^join-session-[0-9a-f]{64}$/,
    );
    expect(mutateSpy.mock.calls[0]?.[0].actorPlayerId).not.toContain(
      'guest-session',
    );
    expect(mutateSpy.mock.calls[0]?.[0].actorPlayerId).toBe(
      mutateSpy.mock.calls[1]?.[0].actorPlayerId,
    );
  });

  it('stores party snapshots and validates participant sessions and pokemon values', async () => {
    await createRoom();

    const room = await service.updatePartySnapshot(
      'ROOM01',
      {
        playerId: 'player-1',
        sessionId: 'session-1',
        displayName: ' Alpha ',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 12,
          currentHp: 18,
          maxHp: 30,
        },
        nowMs: 50,
      },
      command(0, 2),
    );

    expect(room.partySnapshots['player-1']).toEqual({
      playerId: 'player-1',
      displayName: 'Alpha',
      representativePokemon: {
        speciesId: 25,
        name: 'Pikachu',
        level: 12,
        currentHp: 18,
        maxHp: 30,
      },
      updatedAtMs: 50,
    });
    await expect(
      service.updatePartySnapshot(
        'ROOM01',
        {
          playerId: 'player-1',
          sessionId: 'wrong',
          representativePokemon: {
            speciesId: 25,
            name: 'Pikachu',
            level: 12,
            currentHp: 31,
            maxHp: 30,
          },
          nowMs: 51,
        },
        command(1, 3),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts authorized tournament results and returns final standings', async () => {
    const tournament = await createTournament();

    const completed = await service.submitMatchResult(
      'ROOM01',
      {
        reportingPlayerId: 'player-1',
        reportingSessionId: 'session-1',
        matchId: tournament.tournament.matches[0].matchId,
        winnerPlayerId: 'player-1',
        loserPlayerId: 'player-2',
        reason: 'faint',
        nowMs: 1201,
      },
      command(tournament.revision, 5),
    );

    expect(completed).toMatchObject({
      status: 'completed',
      revision: tournament.revision + 1,
      finalStandings: [
        { playerId: 'player-1', rank: 1, score: 100 },
        { playerId: 'player-2', rank: 2, score: 50 },
      ],
    });
    await expect(
      service.submitMatchResult(
        'ROOM01',
        {
          reportingPlayerId: 'player-1',
          reportingSessionId: 'session-1',
          matchId: tournament.tournament.matches[0].matchId,
          winnerPlayerId: 'player-1',
          loserPlayerId: 'player-2',
          reason: 'faint',
          nowMs: 1202,
        },
        command(completed.revision, 6),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('records a participant leave as a tournament forfeit', async () => {
    const tournament = await createTournament();

    const completed = await service.leaveRoom(
      'ROOM01',
      { playerId: 'player-1', sessionId: 'session-1', nowMs: 1300 },
      command(tournament.revision, 6),
    );

    expect(completed).toMatchObject({
      status: 'completed',
      tournament: {
        matches: [
          {
            status: 'completed',
            winnerPlayerId: 'player-2',
            loserPlayerId: 'player-1',
            resultReason: 'forfeit',
          },
        ],
      },
    });
  });

  it('returns fully redacted current snapshots for stale revisions', async () => {
    await createRoom();

    const error = await captureConflict(
      service.joinRoom(
        'ROOM01',
        { playerId: 'player-2', sessionId: 'session-2', nowMs: 10 },
        command(99, 2),
      ),
    );
    const response = error.getResponse() as {
      statusCode: number;
      code: string;
      message: string;
      snapshot: { roomCode: string; revision: number; expiresAtMs: number };
    };

    expect(response).toMatchObject({
      statusCode: 409,
      code: 'POKE_LOUNGE_REVISION_CONFLICT',
      message: 'Poke Lounge room revision conflict',
      snapshot: {
        roomCode: 'ROOM01',
        revision: 0,
      },
    });
    expect(typeof response.snapshot.expiresAtMs).toBe('number');
    expect(JSON.stringify(response)).not.toContain('session-1');
    expect(JSON.stringify(response)).not.toContain('sessionId');
  });

  it('replays an identical command but rejects changed auth or domain input under the same key', async () => {
    await createRoom();
    const first = await service.joinRoom(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2', displayName: 'Beta' },
      command(0, 2),
    );

    publisher.publish.mockClear();
    currentTimeMs = 500;
    const replay = await service.joinRoom(
      'room01',
      { playerId: 'player-2', sessionId: 'session-2', displayName: 'Beta' },
      command(999, 2),
    );

    expect(replay).toEqual(first);
    expect(publisher.publish.mock.calls).toHaveLength(0);

    const error = await captureConflict(
      service.joinRoom(
        'ROOM01',
        {
          playerId: 'player-2',
          sessionId: 'changed-session',
          displayName: 'Beta',
        },
        command(first.revision, 2),
      ),
    );

    expect(error.getResponse()).toMatchObject({
      code: 'POKE_LOUNGE_IDEMPOTENCY_CONFLICT',
      snapshot: { revision: first.revision },
    });
  });

  it('hashes explicit nowMs but keeps omitted nowMs stable across server clock changes', async () => {
    const createSpy = jest.spyOn(repository, 'create');

    await createRoom({ nowMs: undefined });
    const firstHash = createSpy.mock.calls[0][0].requestHash;
    currentTimeMs = 1000;
    await service.createRoom(
      { playerId: 'player-1', sessionId: 'session-1' },
      command(0, 1),
    );
    const replayHash = createSpy.mock.calls[1][0].requestHash;
    await service
      .createRoom(
        { playerId: 'player-1', sessionId: 'session-1', nowMs: 1000 },
        command(0, 1),
      )
      .catch(() => undefined);
    const explicitHash = createSpy.mock.calls[2][0].requestHash;

    expect(replayHash).toBe(firstHash);
    expect(explicitHash).not.toBe(firstHash);
  });

  it('publishes after repository resolution and swallows publisher failures', async () => {
    let resolveCreate:
      | ((
          value: Awaited<ReturnType<PokeLoungeRoomRepository['create']>>,
        ) => void)
      | undefined;
    const createPromise = new Promise<
      Awaited<ReturnType<PokeLoungeRoomRepository['create']>>
    >((resolve) => {
      resolveCreate = resolve;
    });
    const deferredRepository = {
      ...repository,
      create: jest.fn(() => createPromise),
    } as unknown as PokeLoungeRoomRepository;
    const deferredService = new PokeLoungeRoomService(
      deferredRepository,
      publisher,
      () => 'ROOM01',
      () => 0,
    );
    const pending = deferredService.createRoom(
      { playerId: 'player-1', sessionId: 'session-1', nowMs: 0 },
      command(0, 1),
    );

    await Promise.resolve();
    expect(publisher.publish.mock.calls).toHaveLength(0);

    const committed = await repository.create({
      room: createSnapshot(),
      actorPlayerId: 'player-1',
      idempotencyKey: command(0, 1).idempotencyKey,
      requestHash: 'hash',
      nowMs: 0,
    });
    resolveCreate?.(committed);
    await pending;
    expect(publisher.publish.mock.calls).toHaveLength(1);

    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    publisher.publish.mockRejectedValueOnce(new Error('publisher unavailable'));
    roomCodes = ['ROOM02'];
    await expect(
      service.createRoom(
        { playerId: 'player-2', sessionId: 'session-2', nowMs: 1 },
        command(0, 2),
      ),
    ).resolves.toMatchObject({ roomCode: 'ROOM02' });
    expect(loggerError.mock.calls[0]?.[0]).toContain('ROOM02');
    expect(loggerError.mock.calls[0]?.[1]).toContain('publisher unavailable');
    loggerError.mockRestore();
  });

  it('returns not found for expired repository state', async () => {
    await createRoom({ nowMs: 0 });

    await expect(service.getRoom('ROOM01', 30 * 60_000 + 1)).rejects.toThrow(
      NotFoundException,
    );
  });

  async function createRoom(
    input: Partial<{
      playerId: string;
      sessionId: string;
      roundDurationMs: number;
      nowMs: number | undefined;
    }> = {},
  ) {
    return service.createRoom(
      {
        playerId: input.playerId ?? 'player-1',
        sessionId: input.sessionId ?? 'session-1',
        roundDurationMs: input.roundDurationMs,
        ...(Object.prototype.hasOwnProperty.call(input, 'nowMs')
          ? { nowMs: input.nowMs }
          : { nowMs: 0 }),
      },
      command(0, 1),
    );
  }

  async function createTournament() {
    await createRoom({ roundDurationMs: 1000 });
    await service.joinRoom(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2', nowMs: 10 },
      command(0, 2),
    );
    await service.setReady(
      'ROOM01',
      { playerId: 'player-1', sessionId: 'session-1', ready: true, nowMs: 100 },
      command(1, 3),
    );
    await service.setReady(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2', ready: true, nowMs: 200 },
      command(2, 4),
    );

    return service.getRoom('ROOM01', 1200);
  }
});

function command(expectedRevision: number, index: number) {
  return {
    expectedRevision,
    idempotencyKey: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  };
}

function createSnapshot() {
  return {
    roomCode: 'ROOM01',
    status: 'waiting' as const,
    createdAtMs: 0,
    updatedAtMs: 0,
    participants: [
      {
        playerId: 'player-1',
        sessionId: 'session-1',
        displayName: 'Player 1',
        role: 'participant' as const,
        ready: false,
        connected: true,
        joinedAtMs: 0,
      },
    ],
    partySnapshots: {},
    round: {
      index: 1,
      phase: 'waiting' as const,
      durationMs: 1000,
      startedAtMs: null,
      endsAtMs: null,
    },
    tournament: { matches: [], cumulativeScores: {} },
    finalStandings: [],
    revision: 0,
    expiresAtMs: 30 * 60_000,
  };
}

function expectPublicEvent(
  publisher: jest.Mocked<PokeLoungeRoomEventPublisher>,
  type: 'room-created' | 'room-updated' | 'room-clock-advanced',
  room: PokeLoungeRoomSnapshot,
): void {
  const [event] = publisher.publish.mock.calls.at(-1) ?? [];

  expect(event).toMatchObject({
    type,
    snapshot: {
      roomCode: room.roomCode,
      revision: room.revision,
      expiresAtMs: room.expiresAtMs,
    },
  });
  expect(JSON.stringify(event)).not.toContain('session-1');
  expect(JSON.stringify(event)).not.toContain('session-2');
  expect(JSON.stringify(event)).not.toContain('sessionId');
}

async function captureConflict(
  promise: Promise<unknown>,
): Promise<ConflictException> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ConflictException);
    return error as ConflictException;
  }

  throw new Error('Expected a conflict');
}
