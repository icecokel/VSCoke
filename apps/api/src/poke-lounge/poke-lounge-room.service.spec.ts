import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createTournamentBracketState } from '@vscoke/poke-lounge-battle';
import { FakePokeLoungeRoomRepository } from '../../test/support/fake-poke-lounge-room.repository';
import type { PokeLoungeRoomEventPublisher } from './poke-lounge-room-event.publisher';
import type {
  PokeLoungeRoomRepository,
  PokeLoungeRoomSnapshot,
} from './poke-lounge-room.repository';
import { PokeLoungeRoomService } from './poke-lounge-room.service';
import type { PokeLoungePublicRoomState } from './poke-lounge-room.types';

describe('PokeLoungeRoomService', () => {
  let repository: FakePokeLoungeRoomRepository;
  let publisher: jest.Mocked<PokeLoungeRoomEventPublisher>;
  let service: PokeLoungeRoomService;
  let currentTimeMs: number;
  let roomCodes: string[];
  let competitiveProjection: {
    findRoomSnapshot: jest.Mock;
  };

  beforeEach(() => {
    currentTimeMs = 0;
    roomCodes = ['ROOM01'];
    repository = new FakePokeLoungeRoomRepository();
    competitiveProjection = {
      findRoomSnapshot: jest.fn((roomCode: string) =>
        Promise.resolve(repository.snapshot(roomCode)),
      ),
    };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new PokeLoungeRoomService(
      repository,
      publisher,
      competitiveProjection as never,
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

  it('authorizes a durable participant session and returns only the public snapshot', async () => {
    await createRoom();

    const room = await Promise.resolve().then(() =>
      (
        service as unknown as {
          authorizeSubscription(
            roomCode: string,
            playerId: string,
            sessionId: string,
          ): Promise<PokeLoungePublicRoomState>;
        }
      ).authorizeSubscription(' room01 ', 'player-1', 'session-1'),
    );

    expect(room).toMatchObject({ roomCode: 'ROOM01', revision: 0 });
    expect(JSON.stringify(room)).not.toContain('sessionId');
    expect(JSON.stringify(room)).not.toContain('userId');
    expect(JSON.stringify(room)).not.toContain('session-1');
  });

  it('forwards the optional recovery cursor for REST reads and subscription authorization', async () => {
    await createRoom();
    competitiveProjection.findRoomSnapshot.mockClear();

    await service.getRoom('ROOM01', 7);
    await service.authorizeSubscription('ROOM01', 'player-1', 'session-1', 8);

    expect(competitiveProjection.findRoomSnapshot).toHaveBeenNthCalledWith(
      1,
      'ROOM01',
      7,
    );
    expect(competitiveProjection.findRoomSnapshot).toHaveBeenNthCalledWith(
      2,
      'ROOM01',
      8,
    );
  });

  it('uses only the injected server clock when reading and purging rooms', async () => {
    await createRoom();
    const getAndAdvance = jest.spyOn(repository, 'getAndAdvance');
    currentTimeMs = 42_000;

    await service.getRoom('ROOM01');

    expect(getAndAdvance).toHaveBeenCalledWith('ROOM01', 42_000);
  });

  it('keeps ready commands pending until socket acknowledgement and starts only after both acknowledgements', async () => {
    const created = await service.createRoom(
      { playerId: 'player-1', sessionId: 'session-1', nowMs: 0 },
      command(0, 1),
      { requireSocketAcknowledgement: true },
    );
    const joined = await service.joinRoom(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2', nowMs: 1 },
      command(created.revision, 2),
      { requireSocketAcknowledgement: true },
    );
    const hostReady = await service.setReady(
      'ROOM01',
      { playerId: 'player-1', sessionId: 'session-1', ready: true, nowMs: 2 },
      command(joined.revision, 3),
    );
    const bothReady = await service.setReady(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2', ready: true, nowMs: 3 },
      command(hostReady.revision, 4),
    );

    expect(bothReady.status).toBe('waiting');
    const hostAcknowledged = await service.acknowledgeParticipantPresence(
      'ROOM01',
      'player-1',
      'session-1',
      bothReady.revision,
    );
    expect(hostAcknowledged.status).toBe('waiting');
    const guestAcknowledged = await service.acknowledgeParticipantPresence(
      'ROOM01',
      'player-2',
      'session-2',
      hostAcknowledged.revision,
    );

    expect(guestAcknowledged).toMatchObject({
      status: 'round-started',
      round: { startedAtMs: 0, endsAtMs: 60_000 },
      participants: [
        { playerId: 'player-1', ready: true, connected: true },
        { playerId: 'player-2', ready: true, connected: true },
      ],
    });
    expect(JSON.stringify(guestAcknowledged)).not.toContain(
      'presencePendingUntilMs',
    );
  });

  it('expires an unacknowledged HTTP participant and does not expose the pending lease', async () => {
    const created = await service.createRoom(
      { playerId: 'player-1', sessionId: 'session-1', nowMs: 0 },
      command(0, 1),
      { requireSocketAcknowledgement: true },
    );

    expect(created.participants[0]).toMatchObject({
      connected: true,
      presencePendingUntilMs: 15_000,
    });
    const published = publisher.publish.mock.calls.at(-1)?.[0].snapshot;
    expect(published?.participants[0]).toMatchObject({ connected: false });
    expect(JSON.stringify(published)).not.toContain('presencePendingUntilMs');

    currentTimeMs = 15_000;
    await expect(service.getRoom('ROOM01')).resolves.toMatchObject({
      status: 'closed',
      revision: 1,
      participants: [],
    });
  });

  it('does not replace an already acknowledged session with a pending lease', async () => {
    await createRoom();

    await service.joinRoom(
      'ROOM01',
      { playerId: 'player-1', sessionId: 'session-1', nowMs: 1 },
      command(0, 2),
      { requireSocketAcknowledgement: true },
    );
    currentTimeMs = 20_000;

    await expect(service.getRoom('ROOM01')).resolves.toMatchObject({
      status: 'waiting',
      revision: 1,
      participants: [{ playerId: 'player-1', connected: true }],
    });
    expect(repository.snapshot('ROOM01')?.participants[0]).not.toHaveProperty(
      'presencePendingUntilMs',
    );
  });

  it('expires a still-connected participant through a revision-checked leave', async () => {
    await createRoom();
    currentTimeMs = 42_000;

    await service.expireParticipantPresence(
      ' room01 ',
      ' player-1 ',
      ' session-1 ',
    );

    expect(repository.snapshot('ROOM01')).toMatchObject({
      status: 'closed',
      revision: 1,
      participants: [],
      round: { phase: 'completed' },
    });
  });

  it('does not mutate presence for a stale session or an already absent participant', async () => {
    await createRoom();

    await service.expireParticipantPresence(
      'ROOM01',
      'player-1',
      'stale-session',
    );
    await service.expireParticipantPresence(
      'ROOM01',
      'missing-player',
      'session-1',
    );

    expect(repository.snapshot('ROOM01')).toMatchObject({
      status: 'waiting',
      revision: 0,
      participants: [{ playerId: 'player-1', connected: true }],
    });
  });

  it('does not let a stale disconnect epoch remove a reconnected participant', async () => {
    await createRoom();
    await service.acknowledgeParticipantPresence(
      'ROOM01',
      'player-1',
      'session-1',
      undefined,
      'presence-epoch-old',
    );
    const mutate = repository.mutate.bind(repository);
    let reconnectCommitted = false;
    jest.spyOn(repository, 'mutate').mockImplementation(async (input) => {
      if (input.operation === 'leave' && !reconnectCommitted) {
        reconnectCommitted = true;
        await service.acknowledgeParticipantPresence(
          'ROOM01',
          'player-1',
          'session-1',
          undefined,
          'presence-epoch-new',
        );
      }

      return mutate(input);
    });

    await service.expireParticipantPresence(
      'ROOM01',
      'player-1',
      'session-1',
      'presence-epoch-old',
    );

    expect(reconnectCommitted).toBe(true);
    expect(repository.snapshot('ROOM01')).toMatchObject({
      status: 'waiting',
      revision: 2,
      participants: [
        {
          playerId: 'player-1',
          sessionId: 'session-1',
          connected: true,
          presenceEpoch: 'presence-epoch-new',
        },
      ],
    });
    await expect(
      service.authorizeSubscription('ROOM01', 'player-1', 'session-1'),
    ).resolves.not.toHaveProperty('participants.0.presenceEpoch');
  });

  it('cancels an in-flight expiry before its repository apply after reconnect', async () => {
    await createRoom();
    await service.acknowledgeParticipantPresence(
      'ROOM01',
      'player-1',
      'session-1',
      undefined,
      'presence-epoch-old',
    );
    const controller = new AbortController();
    const mutate = repository.mutate.bind(repository);
    jest.spyOn(repository, 'mutate').mockImplementation(async (input) => {
      if (input.operation === 'leave') {
        controller.abort();
      }
      return mutate(input);
    });

    await service.expireParticipantPresence(
      'ROOM01',
      'player-1',
      'session-1',
      'presence-epoch-old',
      controller.signal,
    );

    expect(repository.snapshot('ROOM01')).toMatchObject({
      status: 'waiting',
      revision: 1,
      participants: [
        {
          playerId: 'player-1',
          connected: true,
          presenceEpoch: 'presence-epoch-old',
        },
      ],
    });
  });

  it('cancels an old acknowledgement after a zero-socket reconnect epoch wins', async () => {
    await createRoom();
    const mutate = repository.mutate.bind(repository);
    let releaseOldMutation: (() => void) | undefined;
    let oldMutationStarted: (() => void) | undefined;
    const oldMutationReady = new Promise<void>((resolve) => {
      oldMutationStarted = resolve;
    });
    let oldMutationHeld = false;
    jest.spyOn(repository, 'mutate').mockImplementation(async (input) => {
      if (input.operation === 'presence' && !oldMutationHeld) {
        oldMutationHeld = true;
        oldMutationStarted?.();
        await new Promise<void>((resolve) => {
          releaseOldMutation = resolve;
        });
      }
      return mutate(input);
    });
    const oldController = new AbortController();
    const oldAcknowledgement = service.acknowledgeParticipantPresence(
      'ROOM01',
      'player-1',
      'session-1',
      undefined,
      'presence-epoch-old',
      oldController.signal,
    );
    await oldMutationReady;

    oldController.abort();
    await service.acknowledgeParticipantPresence(
      'ROOM01',
      'player-1',
      'session-1',
      undefined,
      'presence-epoch-new',
      new AbortController().signal,
    );
    const cancelled = expect(oldAcknowledgement).rejects.toThrow(
      'Poke Lounge presence mutation cancelled',
    );
    releaseOldMutation?.();
    await cancelled;

    expect(repository.snapshot('ROOM01')).toMatchObject({
      revision: 1,
      participants: [
        {
          playerId: 'player-1',
          connected: true,
          presenceEpoch: 'presence-epoch-new',
        },
      ],
    });
  });

  it.each([
    ['ROOM99', 'player-1', 'session-1'],
    ['ROOM01', 'unknown-player', 'session-1'],
    ['ROOM01', 'player-1', 'wrong-session'],
  ])(
    'rejects subscription credentials without disclosing which value failed (%s)',
    async (roomCode, playerId, sessionId) => {
      await createRoom();

      const attempt = Promise.resolve().then(() =>
        (
          service as unknown as {
            authorizeSubscription(
              roomCode: string,
              playerId: string,
              sessionId: string,
            ): Promise<PokeLoungePublicRoomState>;
          }
        ).authorizeSubscription(roomCode, playerId, sessionId),
      );

      await expect(attempt).rejects.toMatchObject({
        message: 'Poke Lounge room subscription rejected',
      });
    },
  );

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

    currentTimeMs = 10;
    const room = await service.getRoom('ROOM01');

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
    currentTimeMs = 1200;
    const tournament = await service.getRoom('room01');

    expect(tournament).toMatchObject({
      status: 'tournament',
      revision: 4,
      tournament: {
        version: 2,
        activeMatchId: 'game-round-1-bracket-1-match-1',
        bracket: {
          currentRound: {
            matches: [
              {
                matchId: 'game-round-1-bracket-1-match-1',
                participantIds: ['player-1', 'player-2'],
              },
            ],
          },
        },
      },
    });
    expectPublicEvent(publisher, 'room-clock-advanced', tournament);
  });

  it('accepts late participants during preparation without extending the deadline', async () => {
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
    const started = await service.setReady(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2', ready: true, nowMs: 200 },
      command(2, 4),
    );

    const joined = await service.joinRoom(
      'ROOM01',
      { playerId: 'player-3', sessionId: 'session-3', nowMs: 300 },
      command(started.revision, 5),
    );
    const ready = await service.setReady(
      'ROOM01',
      { playerId: 'player-3', sessionId: 'session-3', ready: true, nowMs: 400 },
      command(joined.revision, 6),
    );

    expect(joined).toMatchObject({
      status: 'round-started',
      round: { startedAtMs: 200, endsAtMs: 1200 },
    });
    expect(ready.round).toMatchObject({ startedAtMs: 200, endsAtMs: 1200 });

    currentTimeMs = 1200;
    const tournament = await service.getRoom('ROOM01');
    expect(tournament).toMatchObject({
      status: 'tournament',
      tournament: {
        bracket: {
          participants: [
            { playerId: 'player-1' },
            { playerId: 'player-2' },
            { playerId: 'player-3' },
          ],
        },
      },
    });
    await expect(
      service.joinRoom(
        'ROOM01',
        { playerId: 'player-4', sessionId: 'session-4', nowMs: 1201 },
        command(tournament.revision, 7),
      ),
    ).rejects.toThrow('Room is not joinable');
  });

  it('allows an existing player with the same session to reconnect during a tournament', async () => {
    const tournament = await createTournament();

    const rejoined = await service.joinRoom(
      'ROOM01',
      { playerId: 'player-1', sessionId: 'session-1', nowMs: 1201 },
      command(tournament.revision, 10),
    );

    expect(rejoined).toMatchObject({
      status: 'tournament',
      revision: tournament.revision + 1,
      tournament: { activeMatchId: tournament.tournament.activeMatchId },
    });
    await expect(
      service.joinRoom(
        'ROOM01',
        { playerId: 'player-1', sessionId: 'wrong', nowMs: 1202 },
        command(rejoined.revision, 11),
      ),
    ).rejects.toThrow('Join sessionId does not match this participant');
    await expect(
      service.joinRoom(
        'ROOM01',
        { playerId: 'player-3', sessionId: 'session-3', nowMs: 1202 },
        command(rejoined.revision, 12),
      ),
    ).rejects.toThrow('Room is not joinable');
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

  it('finds the first free player id without parsing unsafe or arbitrary participant suffixes', async () => {
    const seeded = createSnapshot();
    seeded.participants.push(
      {
        playerId: 'player-2',
        sessionId: 'session-2',
        displayName: 'Player 2',
        role: 'participant',
        ready: false,
        connected: true,
        joinedAtMs: 0,
      },
      {
        playerId: 'player-9007199254740992',
        sessionId: 'session-large',
        displayName: 'Large Player',
        role: 'participant',
        ready: false,
        connected: true,
        joinedAtMs: 0,
      },
      {
        playerId: 'player-not-a-number',
        sessionId: 'session-arbitrary',
        displayName: 'Arbitrary Player',
        role: 'spectator',
        ready: false,
        connected: true,
        joinedAtMs: 0,
      },
    );
    repository.seed(seeded);

    const joined = await service.joinRoom(
      'ROOM01',
      { sessionId: 'anonymous-session', nowMs: 1 },
      command(0, 2),
    );
    const playerIds = joined.participants.map(
      (participant) => participant.playerId,
    );

    expect(playerIds).toContain('player-3');
    expect(new Set(playerIds).size).toBe(playerIds.length);
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
        matchId: tournament.tournament.activeMatchId!,
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
        { playerId: 'player-2', rank: 2, score: 70 },
      ],
    });
    publisher.publish.mockClear();
    await expect(
      service.submitMatchResult(
        'ROOM01',
        {
          reportingPlayerId: 'player-1',
          reportingSessionId: 'session-1',
          matchId: tournament.tournament.activeMatchId!,
          winnerPlayerId: 'player-1',
          loserPlayerId: 'player-2',
          reason: 'faint',
          nowMs: 1201,
        },
        command(999, 5),
      ),
    ).resolves.toEqual(completed);
    expect(publisher.publish.mock.calls).toHaveLength(0);

    const changedNowMs = await captureConflict(
      service.submitMatchResult(
        'ROOM01',
        {
          reportingPlayerId: 'player-1',
          reportingSessionId: 'session-1',
          matchId: tournament.tournament.activeMatchId!,
          winnerPlayerId: 'player-1',
          loserPlayerId: 'player-2',
          reason: 'faint',
          nowMs: 1202,
        },
        command(completed.revision, 5),
      ),
    );
    expect(changedNowMs.getResponse()).toMatchObject({
      code: 'POKE_LOUNGE_IDEMPOTENCY_CONFLICT',
      snapshot: { revision: completed.revision },
    });
    await expect(
      service.submitMatchResult(
        'ROOM01',
        {
          reportingPlayerId: 'player-1',
          reportingSessionId: 'session-1',
          matchId: tournament.tournament.activeMatchId!,
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
        bracket: {
          completedRounds: [
            {
              matches: [
                {
                  status: 'completed',
                  winnerPlayerId: 'player-2',
                  loserPlayerId: 'player-1',
                  resultReason: 'forfeit',
                },
              ],
            },
          ],
        },
      },
    });
  });

  it('converges a casual five-player bye disconnect when that player reaches a later match', async () => {
    const room = createSnapshot();
    room.status = 'tournament';
    room.round.phase = 'tournament';
    room.participants = Array.from({ length: 5 }, (_, index) => ({
      playerId: `player-${index + 1}`,
      sessionId: `session-${index + 1}`,
      displayName: `Player ${index + 1}`,
      role: 'participant' as const,
      ready: true,
      connected: true,
      joinedAtMs: index,
    }));
    const bracket = createTournamentBracketState(
      room.participants.map(({ playerId, displayName }) => ({
        playerId,
        displayName,
      })),
      1,
    );
    room.tournament = {
      version: 2,
      bracket,
      activeMatchId: bracket.currentRound!.matches[0].matchId,
      activeMatchAuthority: 'casual',
      cumulativeScores: {},
    };
    repository.seed(room);

    const left = await service.leaveRoom(
      'ROOM01',
      { playerId: 'player-1', sessionId: 'session-1', nowMs: 5 },
      command(0, 70),
    );
    const afterOpening = await service.submitMatchResult(
      'ROOM01',
      {
        reportingPlayerId: 'player-4',
        reportingSessionId: 'session-4',
        matchId: 'game-round-1-bracket-1-match-1',
        winnerPlayerId: 'player-4',
        loserPlayerId: 'player-5',
        reason: 'faint',
        nowMs: 10,
      },
      command(left.revision, 71),
    );

    expect(afterOpening.tournament).toMatchObject({
      activeMatchId: 'game-round-1-bracket-2-match-2',
      bracket: {
        currentRound: {
          matches: [
            {
              participantIds: ['player-1', 'player-4'],
              status: 'completed',
              winnerPlayerId: 'player-4',
              loserPlayerId: 'player-1',
              resultReason: 'forfeit',
            },
            {
              participantIds: ['player-3', 'player-2'],
              status: 'ready',
            },
          ],
        },
      },
    });

    const afterSemifinal = await service.submitMatchResult(
      'ROOM01',
      {
        reportingPlayerId: 'player-3',
        reportingSessionId: 'session-3',
        matchId: afterOpening.tournament.activeMatchId!,
        winnerPlayerId: 'player-3',
        loserPlayerId: 'player-2',
        reason: 'faint',
        nowMs: 20,
      },
      command(afterOpening.revision, 72),
    );
    const completed = await service.submitMatchResult(
      'ROOM01',
      {
        reportingPlayerId: 'player-4',
        reportingSessionId: 'session-4',
        matchId: afterSemifinal.tournament.activeMatchId!,
        winnerPlayerId: 'player-4',
        loserPlayerId: 'player-3',
        reason: 'faint',
        nowMs: 30,
      },
      command(afterSemifinal.revision, 73),
    );

    expect(completed).toMatchObject({
      status: 'completed',
      tournament: {
        activeMatchId: null,
        bracket: { championPlayerId: 'player-4' },
      },
    });
  });

  it('rejects casual results for a server-authoritative active match', async () => {
    const tournament = await createTournament();
    tournament.tournament.activeMatchAuthority = 'server';
    repository.seed(tournament);

    await expect(
      service.submitMatchResult(
        'ROOM01',
        {
          reportingPlayerId: 'player-1',
          reportingSessionId: 'session-1',
          matchId: tournament.tournament.activeMatchId!,
          winnerPlayerId: 'player-1',
          loserPlayerId: 'player-2',
          reason: 'faint',
          nowMs: 1201,
        },
        command(tournament.revision, 50),
      ),
    ).rejects.toThrow(
      'Server-authoritative matches only accept competitive actions',
    );
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

  it('preserves a committed command snapshot when the room advances before enrichment', async () => {
    const revisionOne = {
      ...createSnapshot(),
      revision: 1,
      updatedAtMs: 1,
      competitiveTransitions: [
        {
          terminalEventId: '00000000-0000-4000-8000-000000000001',
          terminalRoomRevision: 1,
          projection: { matchId: 'completed-match-1' },
        },
      ],
    } as unknown as PokeLoungeRoomSnapshot;
    const revisionTwo = {
      ...revisionOne,
      revision: 2,
      updatedAtMs: 2,
      competitive: { matchId: 'match-2' },
      competitiveTransitions: [],
    } as unknown as PokeLoungeRoomSnapshot;
    jest.spyOn(repository, 'mutate').mockResolvedValueOnce({
      snapshot: revisionOne,
      outcome: 'committed',
      committedChange: true,
    });
    competitiveProjection.findRoomSnapshot.mockResolvedValueOnce(revisionTwo);

    const committed = await service.joinRoom(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2' },
      command(0, 20),
    );

    expect(committed).toEqual(revisionOne);
    expect(publisher.publish.mock.calls).toHaveLength(1);
    expect(publisher.publish.mock.calls[0][0].snapshot).toMatchObject({
      revision: 2,
      updatedAtMs: 2,
      competitiveTransitions: [
        {
          terminalEventId: '00000000-0000-4000-8000-000000000001',
          projection: { matchId: 'completed-match-1' },
        },
      ],
      competitive: { matchId: 'match-2' },
    });

    jest.spyOn(repository, 'mutate').mockResolvedValueOnce({
      snapshot: revisionOne,
      outcome: 'replayed',
      committedChange: false,
    });
    publisher.publish.mockClear();
    competitiveProjection.findRoomSnapshot.mockClear();
    competitiveProjection.findRoomSnapshot.mockResolvedValue(revisionTwo);

    const replay = await service.joinRoom(
      'ROOM01',
      { playerId: 'player-2', sessionId: 'session-2' },
      command(999, 20),
    );

    expect(replay).toEqual(revisionOne);
    expect(competitiveProjection.findRoomSnapshot.mock.calls).toHaveLength(0);
    expect(publisher.publish.mock.calls).toHaveLength(0);

    jest.spyOn(repository, 'getAndAdvance').mockResolvedValueOnce({
      snapshot: revisionTwo,
      committedChange: false,
    });
    const latest = await service.getRoom('ROOM01');

    expect(latest).toEqual(revisionTwo);
    expect(publisher.publish.mock.calls).toHaveLength(0);
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
      competitiveProjection as never,
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
    currentTimeMs = 1;
    await expect(service.getRoom('ROOM02')).resolves.toMatchObject({
      roomCode: 'ROOM02',
      revision: 0,
    });
    await expect(
      service.authorizeSubscription('ROOM02', 'player-2', 'session-2'),
    ).resolves.toMatchObject({ roomCode: 'ROOM02', revision: 0 });
    loggerError.mockRestore();
  });

  it('returns not found for expired repository state', async () => {
    await createRoom({ nowMs: 0 });

    currentTimeMs = 30 * 60_000 + 1;
    await expect(service.getRoom('ROOM01')).rejects.toThrow(NotFoundException);
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

    currentTimeMs = 1200;
    return service.getRoom('ROOM01');
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
    tournament: {
      version: 2 as const,
      bracket: null,
      activeMatchId: null,
      activeMatchAuthority: null,
      cumulativeScores: {},
    },
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
