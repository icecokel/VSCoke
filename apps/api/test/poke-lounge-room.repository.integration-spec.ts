import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { PokeLoungeRoomCommand } from '../src/poke-lounge/entities/poke-lounge-room-command.entity';
import { PokeLoungeRoom } from '../src/poke-lounge/entities/poke-lounge-room.entity';
import { PostgresPokeLoungeRoomRepository } from '../src/poke-lounge/postgres-poke-lounge-room.repository';
import type { PokeLoungeRoomSnapshot } from '../src/poke-lounge/poke-lounge-room.repository';
import {
  POKE_LOUNGE_ACTIVE_ROOM_EXPIRES_AT_MS,
  getPokeLoungeRoomExpiresAtMs,
} from '../src/poke-lounge/poke-lounge-room-policy';
import {
  createPokeLoungeTestDataSource,
  truncatePokeLoungeRoomStorage,
} from './support/poke-lounge-test-database';

describe('PostgresPokeLoungeRoomRepository', () => {
  let dataSource: DataSource;
  let repository: PostgresPokeLoungeRoomRepository;

  beforeAll(async () => {
    dataSource = createPokeLoungeTestDataSource();
    await dataSource.initialize();
    repository = new PostgresPokeLoungeRoomRepository(dataSource);
  });

  beforeEach(async () => {
    await truncatePokeLoungeRoomStorage(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('round-trips the migrated entities and reloads through a new data source', async () => {
    const room = createSnapshot({ roomCode: 'RELOAD' });

    await expect(createRoom(repository, room)).resolves.toMatchObject({
      outcome: 'committed',
      snapshot: { roomCode: 'RELOAD', revision: 0 },
    });

    await dataSource.destroy();
    dataSource = createPokeLoungeTestDataSource();
    await dataSource.initialize();
    repository = new PostgresPokeLoungeRoomRepository(dataSource);

    await expect(
      repository.getAndAdvance('reload', room.updatedAtMs),
    ).resolves.toMatchObject({
      committedChange: false,
      snapshot: { roomCode: 'RELOAD', revision: 0 },
    });
  });

  it('replays creation globally by actor and key and rejects a changed request', async () => {
    const idempotencyKey = randomUUID();
    const createInput = {
      room: createSnapshot({ roomCode: 'FIRST1' }),
      actorPlayerId: 'creator-a',
      idempotencyKey,
      requestHash: 'a'.repeat(64),
      nowMs: 1_000,
    };

    await expect(repository.create(createInput)).resolves.toMatchObject({
      outcome: 'committed',
      committedChange: true,
      snapshot: { roomCode: 'FIRST1', revision: 0 },
    });
    await expect(
      repository.create({
        ...createInput,
        room: createSnapshot({ roomCode: 'OTHER1' }),
      }),
    ).resolves.toMatchObject({
      outcome: 'replayed',
      committedChange: false,
      snapshot: { roomCode: 'FIRST1', revision: 0 },
    });
    await expect(
      repository.create({
        ...createInput,
        room: createSnapshot({ roomCode: 'OTHER1' }),
        requestHash: 'b'.repeat(64),
      }),
    ).resolves.toMatchObject({
      outcome: 'idempotency-conflict',
      committedChange: false,
      snapshot: { roomCode: 'FIRST1', revision: 0 },
    });
  });

  it('purges only waiting, completed, and closed rooms past their strict expiry', async () => {
    const nowMs = 5_000_000;
    const rooms = [
      createSnapshot({ roomCode: 'WAIT01', status: 'waiting' }),
      createSnapshot({ roomCode: 'DONE01', status: 'completed' }),
      createSnapshot({ roomCode: 'CLOSE1', status: 'closed' }),
      createSnapshot({
        roomCode: 'ACTIVE',
        status: 'round-started',
        round: {
          index: 1,
          phase: 'round-started',
          durationMs: 10_000,
          startedAtMs: nowMs,
          endsAtMs: nowMs + 10_000,
        },
      }),
      createSnapshot({ roomCode: 'TOUR01', status: 'tournament' }),
    ].map((room) => ({
      ...room,
      expiresAtMs:
        room.status === 'round-started' || room.status === 'tournament'
          ? POKE_LOUNGE_ACTIVE_ROOM_EXPIRES_AT_MS
          : nowMs - 1,
    }));

    await dataSource.getRepository(PokeLoungeRoom).insert(
      rooms.map((snapshot) => ({
        roomCode: snapshot.roomCode,
        state: toStoredState(snapshot),
        revision: snapshot.revision,
        expiresAt: new Date(snapshot.expiresAtMs),
      })),
    );

    await expect(repository.purgeExpired(nowMs)).resolves.toBe(3);
    await expect(
      repository.getAndAdvance('ACTIVE', nowMs),
    ).resolves.toMatchObject({ snapshot: { roomCode: 'ACTIVE' } });
    await expect(
      repository.getAndAdvance('TOUR01', nowMs),
    ).resolves.toMatchObject({ snapshot: { roomCode: 'TOUR01' } });
    await expect(repository.getAndAdvance('WAIT01', nowMs)).resolves.toEqual({
      snapshot: null,
      committedChange: false,
    });
  });

  it('deletes command receipts through the room foreign key when purging', async () => {
    const room = createSnapshot({ roomCode: 'PURGE1' });
    await createRoom(repository, room);

    await expect(repository.purgeExpired(room.expiresAtMs + 1)).resolves.toBe(
      1,
    );
    await expect(
      dataSource.getRepository(PokeLoungeRoomCommand).count(),
    ).resolves.toBe(0);
  });

  it('increments once, replays the exact receipt, and rejects a changed payload', async () => {
    await createRoom(repository, createSnapshot());
    const idempotencyKey = randomUUID();
    const first = await repository.mutate({
      roomCode: 'ROOM01',
      actorPlayerId: 'player-a',
      idempotencyKey,
      requestHash: 'a'.repeat(64),
      expectedRevision: 0,
      nowMs: 2_000,
      apply: (room) => ({ ...room, updatedAtMs: 2_000 }),
    });
    await repository.mutate({
      roomCode: 'ROOM01',
      actorPlayerId: 'player-b',
      idempotencyKey: randomUUID(),
      requestHash: 'b'.repeat(64),
      expectedRevision: 1,
      nowMs: 3_000,
      apply: (room) => ({ ...room, updatedAtMs: 3_000 }),
    });

    expect(first).toMatchObject({
      outcome: 'committed',
      committedChange: true,
      snapshot: { revision: 1, updatedAtMs: 2_000 },
    });
    await expect(
      repository.mutate({
        roomCode: 'room01',
        actorPlayerId: 'player-a',
        idempotencyKey,
        requestHash: 'a'.repeat(64),
        expectedRevision: 0,
        nowMs: 4_000,
        apply: (room) => ({ ...room, updatedAtMs: 4_000 }),
      }),
    ).resolves.toMatchObject({
      outcome: 'replayed',
      committedChange: false,
      snapshot: { revision: 1, updatedAtMs: 2_000 },
    });
    await expect(
      repository.mutate({
        roomCode: 'ROOM01',
        actorPlayerId: 'player-a',
        idempotencyKey,
        requestHash: 'c'.repeat(64),
        expectedRevision: 2,
        nowMs: 4_000,
        apply: (room) => room,
      }),
    ).resolves.toMatchObject({
      outcome: 'idempotency-conflict',
      committedChange: false,
      snapshot: { revision: 2, updatedAtMs: 3_000 },
    });
  });

  it('serializes concurrent writers at one expected revision', async () => {
    await createRoom(repository, createSnapshot());

    const results = await Promise.all([
      repository.mutate({
        roomCode: 'ROOM01',
        actorPlayerId: 'player-a',
        idempotencyKey: randomUUID(),
        requestHash: 'a'.repeat(64),
        expectedRevision: 0,
        nowMs: 2_000,
        apply: (room) => ({ ...room, updatedAtMs: 2_000 }),
      }),
      repository.mutate({
        roomCode: 'ROOM01',
        actorPlayerId: 'player-b',
        idempotencyKey: randomUUID(),
        requestHash: 'b'.repeat(64),
        expectedRevision: 0,
        nowMs: 2_001,
        apply: (room) => ({ ...room, updatedAtMs: 2_001 }),
      }),
    ]);

    expect(results.map((result) => result?.outcome).sort()).toEqual([
      'committed',
      'revision-conflict',
    ]);
    expect(results.map((result) => result?.snapshot.revision)).toEqual([1, 1]);
  });

  it('commits one automatic clock advancement across concurrent reads', async () => {
    const room = createSnapshot({
      status: 'round-started',
      round: {
        index: 1,
        phase: 'round-started',
        durationMs: 1_000,
        startedAtMs: 1_000,
        endsAtMs: 2_000,
      },
      participants: [
        createParticipant('player-a', 1_000),
        createParticipant('player-b', 1_001),
      ],
    });
    await createRoom(repository, room);

    const results = await Promise.all([
      repository.getAndAdvance('ROOM01', 2_000),
      repository.getAndAdvance('ROOM01', 2_000),
    ]);

    expect(results.map((result) => result.committedChange).sort()).toEqual([
      false,
      true,
    ]);
    expect(results[0].snapshot).toMatchObject({
      status: 'tournament',
      revision: 1,
    });
    expect(results[1].snapshot).toMatchObject({
      status: 'tournament',
      revision: 1,
    });
  });

  it('lets a due automatic transition win before a client mutation', async () => {
    const room = createSnapshot({
      status: 'round-started',
      round: {
        index: 1,
        phase: 'round-started',
        durationMs: 1_000,
        startedAtMs: 1_000,
        endsAtMs: 2_000,
      },
      participants: [
        createParticipant('player-a', 1_000),
        createParticipant('player-b', 1_001),
      ],
    });
    await createRoom(repository, room);
    const idempotencyKey = randomUUID();

    await expect(
      repository.mutate({
        roomCode: 'ROOM01',
        actorPlayerId: 'player-a',
        idempotencyKey,
        requestHash: 'a'.repeat(64),
        expectedRevision: 0,
        nowMs: 2_000,
        apply: (snapshot) => ({ ...snapshot, updatedAtMs: 2_000 }),
      }),
    ).resolves.toMatchObject({
      outcome: 'revision-conflict',
      committedChange: true,
      snapshot: { status: 'tournament', revision: 1 },
    });
    await expect(
      repository.mutate({
        roomCode: 'ROOM01',
        actorPlayerId: 'player-a',
        idempotencyKey,
        requestHash: 'a'.repeat(64),
        expectedRevision: 1,
        nowMs: 2_000,
        apply: (snapshot) => ({ ...snapshot, updatedAtMs: 2_000 }),
      }),
    ).resolves.toMatchObject({
      outcome: 'committed',
      snapshot: { revision: 2 },
    });
  });

  it('enforces capacity atomically and reclaims an expired room', async () => {
    const base = createSnapshot();
    const roomRows = Array.from({ length: 199 }, (_, index) => {
      const roomCode = `C${String(index).padStart(5, '0')}`;
      const snapshot = createSnapshot({ roomCode });

      return {
        roomCode,
        state: toStoredState(snapshot),
        revision: 0,
        expiresAt: new Date(snapshot.expiresAtMs),
      };
    });
    await dataSource.getRepository(PokeLoungeRoom).insert(roomRows);

    const atCapacity = await Promise.all([
      createRoom(repository, { ...base, roomCode: 'LAST01' }),
      createRoom(repository, { ...base, roomCode: 'LAST02' }),
    ]);

    expect(atCapacity.map((result) => result.outcome).sort()).toEqual([
      'capacity-reached',
      'committed',
    ]);

    await dataSource
      .getRepository(PokeLoungeRoom)
      .update({ roomCode: 'C00000' }, { expiresAt: new Date(999) });
    await expect(
      createRoom(repository, {
        ...base,
        roomCode: 'RECLAM',
        updatedAtMs: 1_000,
      }),
    ).resolves.toMatchObject({ outcome: 'committed' });
  });

  it('surfaces a room-code collision so a bounded caller retry can succeed', async () => {
    await createRoom(repository, createSnapshot({ roomCode: 'SAME01' }));
    const candidates = ['SAME01', 'NEXT01'];
    const outcomes = [];

    for (const roomCode of candidates) {
      const result = await createRoom(repository, createSnapshot({ roomCode }));
      outcomes.push(result.outcome);
      if (result.outcome !== 'room-code-collision') {
        break;
      }
    }

    expect(outcomes).toEqual(['room-code-collision', 'committed']);
  });
});

function createRoom(
  repository: PostgresPokeLoungeRoomRepository,
  room: PokeLoungeRoomSnapshot,
) {
  return repository.create({
    room,
    actorPlayerId: `creator-${room.roomCode}`,
    idempotencyKey: randomUUID(),
    requestHash: 'f'.repeat(64),
    nowMs: room.updatedAtMs,
  });
}

function createSnapshot(
  overrides: Partial<PokeLoungeRoomSnapshot> = {},
): PokeLoungeRoomSnapshot {
  const room: PokeLoungeRoomSnapshot = {
    roomCode: 'ROOM01',
    status: 'waiting',
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
    participants: [],
    partySnapshots: {},
    round: {
      index: 1,
      phase: 'waiting',
      durationMs: 1_000,
      startedAtMs: null,
      endsAtMs: null,
    },
    tournament: { matches: [], cumulativeScores: {} },
    finalStandings: [],
    revision: 0,
    expiresAtMs: 0,
    ...overrides,
  };

  return { ...room, expiresAtMs: getPokeLoungeRoomExpiresAtMs(room) };
}

function createParticipant(playerId: string, joinedAtMs: number) {
  return {
    sessionId: `session-${playerId}`,
    playerId,
    displayName: playerId,
    role: 'participant' as const,
    ready: true,
    connected: true,
    joinedAtMs,
  };
}

function toStoredState(snapshot: PokeLoungeRoomSnapshot) {
  const state = structuredClone(snapshot);

  return {
    roomCode: state.roomCode,
    status: state.status,
    createdAtMs: state.createdAtMs,
    updatedAtMs: state.updatedAtMs,
    participants: state.participants,
    partySnapshots: state.partySnapshots,
    round: state.round,
    tournament: state.tournament,
    finalStandings: state.finalStandings,
  };
}
