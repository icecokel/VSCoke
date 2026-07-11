import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreatePokeLoungeRoomStorage1794096000000 } from '../src/migrations/1794096000000-create-poke-lounge-room-storage';
import { CreatePokeLoungeCompetitiveAssignment1794182400000 } from '../src/migrations/1794182400000-create-poke-lounge-competitive-assignment';
import { CompetitiveMatchService } from '../src/poke-lounge/competitive/competitive-match.service';
import { PostgresCompetitiveMatchRepository } from '../src/poke-lounge/competitive/postgres-competitive-match.repository';
import { PokeLoungeCompetitiveMatch } from '../src/poke-lounge/entities/poke-lounge-competitive-match.entity';
import { PokeLoungeCompetitiveSeat } from '../src/poke-lounge/entities/poke-lounge-competitive-seat.entity';
import { PokeLoungeRoomCommand } from '../src/poke-lounge/entities/poke-lounge-room-command.entity';
import { PokeLoungeRoom } from '../src/poke-lounge/entities/poke-lounge-room.entity';
import type { PokeLoungeRoomState } from '../src/poke-lounge/poke-lounge-room.types';

const describePostgres = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

describePostgres('PostgresCompetitiveMatchRepository', () => {
  let dataSource: DataSource;
  let repository: PostgresCompetitiveMatchRepository;
  let service: CompetitiveMatchService;
  let testDatabaseUrl: string;

  beforeAll(async () => {
    const configuredUrl = process.env.TEST_DATABASE_URL;
    if (!configuredUrl) {
      throw new Error('TEST_DATABASE_URL is required for PostgreSQL tests');
    }
    const databaseName = new URL(configuredUrl).pathname.replace(
      /^\/+|\/+$/g,
      '',
    );
    if (!databaseName.endsWith('_test')) {
      throw new Error('TEST_DATABASE_URL database name must end in _test');
    }
    testDatabaseUrl = configuredUrl;
    dataSource = createDataSource(testDatabaseUrl);
    await dataSource.initialize();
    await dataSource.runMigrations();
    resetServices();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "poke_lounge_competitive_match", "poke_lounge_competitive_seat", "poke_lounge_room_command", "poke_lounge_room" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('serializes concurrent second bindings, creates one immutable assignment, and reloads after restart', async () => {
    await insertRoom('ROOM01', ['player-a', 'player-b']);
    await expect(
      service.bindSeat('ROOM01', 'session-a', 'account-a'),
    ).resolves.toBeNull();

    const concurrent = await Promise.allSettled([
      service.bindSeat('ROOM01', 'session-b', 'account-b'),
      service.bindSeat('ROOM01', 'session-b', 'account-c'),
    ]);
    const fulfilled = concurrent.filter(
      (result): result is PromiseFulfilledResult<unknown> =>
        result.status === 'fulfilled',
    );
    const rejected = concurrent.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveMatch).count(),
    ).resolves.toBe(1);
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveSeat).count(),
    ).resolves.toBe(2);

    const original = await repository.findAssignmentForParticipant({
      roomCode: 'ROOM01',
      playerId: 'player-a',
      accountId: 'account-a',
    });
    expect(original).toMatchObject({
      assignmentRevision: 1,
      currentTurn: 0,
      status: 'pending',
    });
    expect(original?.serverSeed).toMatch(/^[0-9a-f]{64}$/);

    const roomRepository = dataSource.getRepository(PokeLoungeRoom);
    const room = await roomRepository.findOneByOrFail({ roomCode: 'ROOM01' });
    room.state.partySnapshots['player-a'] = {
      playerId: 'player-a',
      displayName: 'Mutated browser party',
      updatedAtMs: 999,
    };
    await roomRepository.save(room);

    await dataSource.destroy();
    dataSource = createDataSource(testDatabaseUrl);
    await dataSource.initialize();
    resetServices();

    const reloaded = await repository.findAssignmentForParticipant({
      roomCode: 'ROOM01',
      playerId: 'player-a',
      accountId: 'account-a',
    });
    expect(reloaded).toEqual(original);
    expect(JSON.stringify(reloaded?.initialState)).not.toContain(
      'Mutated browser party',
    );
    await expect(
      service.bindSeat('ROOM01', 'session-a', 'account-a'),
    ).resolves.toMatchObject({ matchId: original?.matchId });
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveSeat).count(),
    ).resolves.toBe(2);
  });

  it('rejects forged sessions, duplicate accounts, and account overwrites durably', async () => {
    await insertRoom('ROOM02', ['player-a', 'player-b']);

    await expect(
      service.bindSeat('ROOM02', 'forged', 'account-a'),
    ).rejects.toThrow('Competitive seat binding rejected');
    await service.bindSeat('ROOM02', 'session-a', 'account-a');
    await expect(
      service.bindSeat('ROOM02', 'session-b', 'account-a'),
    ).rejects.toThrow('Account already occupies a competitive seat');
    await expect(
      service.bindSeat('ROOM02', 'session-a', 'account-other'),
    ).rejects.toThrow('Competitive seat is already bound');
  });

  it('keeps more than two active participants casual even when all are authenticated', async () => {
    await insertRoom('ROOM03', ['player-a', 'player-b', 'player-c']);

    await expect(
      service.bindSeat('ROOM03', 'session-a', 'account-a'),
    ).resolves.toBeNull();
    await expect(
      service.bindSeat('ROOM03', 'session-b', 'account-b'),
    ).resolves.toBeNull();
    await expect(
      service.bindSeat('ROOM03', 'session-c', 'account-c'),
    ).resolves.toBeNull();
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveMatch).count(),
    ).resolves.toBe(0);
  });

  it('keeps post-assignment third participants ineligible under duplicate and concurrent binds', async () => {
    await insertRoom('ROOM04', ['player-a', 'player-b']);
    await service.bindSeat('ROOM04', 'session-a', 'account-a');
    const assignment = await service.bindSeat(
      'ROOM04',
      'session-b',
      'account-b',
    );
    await appendParticipants('ROOM04', ['player-c', 'player-d']);

    try {
      await service.bindSeat('ROOM04', 'session-c', 'account-a');
      throw new Error('Expected assigned account reuse to conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'POKE_LOUNGE_COMPETITIVE_ASSIGNMENT_INELIGIBLE',
        eligible: false,
      });
    }

    try {
      await service.bindSeat('ROOM04', 'session-c', 'account-c');
      throw new Error('Expected third participant binding to conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'POKE_LOUNGE_COMPETITIVE_ASSIGNMENT_INELIGIBLE',
        eligible: false,
      });
    }

    await expect(
      repository.findAssignmentForParticipant({
        roomCode: 'ROOM04',
        playerId: 'player-c',
        accountId: 'account-c',
      }),
    ).resolves.toBeNull();
    await expect(
      repository.findAssignmentForParticipant({
        roomCode: 'ROOM04',
        playerId: 'player-a',
        accountId: 'account-c',
      }),
    ).resolves.toBeNull();
    await expect(
      repository.findAssignmentForParticipant({
        roomCode: 'ROOM04',
        playerId: 'player-a',
        accountId: 'account-a',
      }),
    ).resolves.toMatchObject({ matchId: assignment?.matchId });

    const concurrent = await Promise.allSettled([
      service.bindSeat('ROOM04', 'session-d', 'account-d'),
      service.bindSeat('ROOM04', 'session-d', 'account-e'),
    ]);
    expect(concurrent.every((result) => result.status === 'rejected')).toBe(
      true,
    );
    expect(
      concurrent.every(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof ConflictException &&
          (result.reason.getResponse() as { eligible?: unknown }).eligible ===
            false,
      ),
    ).toBe(true);
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveSeat).count(),
    ).resolves.toBe(4);
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveMatch).count(),
    ).resolves.toBe(1);
  });

  function resetServices() {
    repository = new PostgresCompetitiveMatchRepository(dataSource);
    service = new CompetitiveMatchService(repository);
  }

  async function insertRoom(roomCode: string, playerIds: string[]) {
    await dataSource.getRepository(PokeLoungeRoom).save({
      roomCode,
      state: roomState(roomCode, playerIds),
      revision: 5,
      expiresAt: new Date(Date.now() + 60_000),
    });
  }

  async function appendParticipants(roomCode: string, playerIds: string[]) {
    const roomRepository = dataSource.getRepository(PokeLoungeRoom);
    const room = await roomRepository.findOneByOrFail({ roomCode });

    for (const playerId of playerIds) {
      const suffix = playerId.slice(-1);
      room.state.participants.push({
        sessionId: `session-${suffix}`,
        playerId,
        displayName: playerId,
        role: 'participant',
        ready: false,
        connected: true,
        joinedAtMs: room.state.participants.length,
      });
    }

    await roomRepository.save(room);
  }
});

function createDataSource(testDatabaseUrl: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: testDatabaseUrl,
    entities: [
      PokeLoungeRoom,
      PokeLoungeRoomCommand,
      PokeLoungeCompetitiveSeat,
      PokeLoungeCompetitiveMatch,
    ],
    migrations: [
      CreatePokeLoungeRoomStorage1794096000000,
      CreatePokeLoungeCompetitiveAssignment1794182400000,
    ],
    synchronize: false,
  });
}

function roomState(roomCode: string, playerIds: string[]): PokeLoungeRoomState {
  return {
    roomCode,
    status: 'waiting',
    createdAtMs: 0,
    updatedAtMs: 0,
    participants: playerIds.map((playerId, index) => ({
      sessionId: `session-${String.fromCharCode(97 + index)}`,
      playerId,
      displayName: playerId,
      role: 'participant',
      ready: false,
      connected: true,
      joinedAtMs: index,
    })),
    partySnapshots: {},
    round: {
      index: 1,
      phase: 'waiting',
      durationMs: 60_000,
      startedAtMs: null,
      endsAtMs: null,
    },
    tournament: { matches: [], cumulativeScores: {} },
    finalStandings: [],
  };
}
