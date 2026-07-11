import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { hashCanonicalState } from '@vscoke/poke-lounge-battle';
import { User } from '../src/auth/entities/user.entity';
import { GameHistory } from '../src/game/entities/game-history.entity';
import { GamePokeLoungeState } from '../src/game/entities/game-poke-lounge-state.entity';
import { GameType } from '../src/game/enums/game-type.enum';
import { GameService } from '../src/game/game.service';
import { VerifiedPokeLoungeHistoryWriter } from '../src/game/verified-poke-lounge-history-writer.service';
import { CreateLegacyCoreSchema1759999999999 } from '../src/migrations/1759999999999-create-legacy-core-schema';
import { AddPokeLoungeGameType1793664000000 } from '../src/migrations/1793664000000-add-poke-lounge-game-type';
import { CreateGamePokeLoungeState1793750400000 } from '../src/migrations/1793750400000-create-game-poke-lounge-state';
import { CreatePokeLoungeRoomStorage1794096000000 } from '../src/migrations/1794096000000-create-poke-lounge-room-storage';
import { CreatePokeLoungeCompetitiveAssignment1794182400000 } from '../src/migrations/1794182400000-create-poke-lounge-competitive-assignment';
import { CreatePokeLoungeCompetitiveAction1794268800000 } from '../src/migrations/1794268800000-create-poke-lounge-competitive-action';
import { AddGameResultTrust1794355200000 } from '../src/migrations/1794355200000-add-game-result-trust';
import { AddCompetitiveHistoryPublication1794441600000 } from '../src/migrations/1794441600000-add-competitive-history-publication';
import { CompetitiveMatchService } from '../src/poke-lounge/competitive/competitive-match.service';
import { PostgresCompetitiveMatchRepository } from '../src/poke-lounge/competitive/postgres-competitive-match.repository';
import { PostgresCompetitiveActionRepository } from '../src/poke-lounge/competitive/postgres-competitive-action.repository';
import { CompetitiveProjectionService } from '../src/poke-lounge/competitive/competitive-projection.service';
import { PokeLoungeCompetitiveAction } from '../src/poke-lounge/competitive/competitive-action.entity';
import { PokeLoungeCompetitiveMatch } from '../src/poke-lounge/entities/poke-lounge-competitive-match.entity';
import { PokeLoungeCompetitiveSeat } from '../src/poke-lounge/entities/poke-lounge-competitive-seat.entity';
import { PokeLoungeRoomCommand } from '../src/poke-lounge/entities/poke-lounge-room-command.entity';
import { PokeLoungeRoom } from '../src/poke-lounge/entities/poke-lounge-room.entity';
import { PostgresPokeLoungeRoomRepository } from '../src/poke-lounge/postgres-poke-lounge-room.repository';
import { PokeLoungeRoomService } from '../src/poke-lounge/poke-lounge-room.service';
import type { PokeLoungeRoomState } from '../src/poke-lounge/poke-lounge-room.types';
import type { PokeLoungeRoomRepository } from '../src/poke-lounge/poke-lounge-room.repository';
import type { PokeLoungeRoomCommittedEvent } from '../src/poke-lounge/poke-lounge-room-event.publisher';

const describePostgres = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

describePostgres('PostgresCompetitiveMatchRepository', () => {
  let dataSource: DataSource;
  let repository: PostgresCompetitiveMatchRepository;
  let actionRepository: PostgresCompetitiveActionRepository;
  let service: CompetitiveMatchService;
  let testDatabaseUrl: string;
  const publish = jest.fn<Promise<void>, [PokeLoungeRoomCommittedEvent]>(() =>
    Promise.resolve(),
  );
  const historyWriter = new VerifiedPokeLoungeHistoryWriter();

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
    publish.mockClear();
    await dataSource.query(
      'TRUNCATE TABLE "poke_lounge_competitive_action", "poke_lounge_competitive_match", "poke_lounge_competitive_seat", "poke_lounge_room_command", "poke_lounge_room", "game_history", "game_poke_lounge_state", "user" RESTART IDENTITY CASCADE',
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

  it('persists idempotent actions, resolves one concurrent second action, and reloads receipts', async () => {
    await insertRoom('ROOM05', ['player-a', 'player-b']);
    await service.bindSeat('ROOM05', 'session-a', 'account-a');
    const assignment = await service.bindSeat(
      'ROOM05',
      'session-b',
      'account-b',
    );
    if (!assignment) {
      throw new Error('Expected competitive assignment');
    }

    await expect(
      service.submitAction(actionInput(assignment.matchId, 'forged-account')),
    ).rejects.toThrow('Competitive action conflict');
    await expect(
      service.submitAction({
        ...actionInput(assignment.matchId, 'account-a'),
        assignmentRevision: 2,
      }),
    ).rejects.toThrow('Competitive action conflict');
    await expect(
      service.submitAction({
        ...actionInput(assignment.matchId, 'account-a'),
        turn: 1,
      }),
    ).rejects.toThrow('Competitive action conflict');
    await expect(
      service.submitAction({
        ...actionInput(assignment.matchId, 'account-a'),
        action: { kind: 'move', moveId: 'forged-move' },
      }),
    ).rejects.toThrow('Competitive action is illegal');

    const firstInput = actionInput(assignment.matchId, 'account-a');
    const pending = await service.submitAction(firstInput);
    expect(pending).toMatchObject({
      currentTurn: 0,
      submittedPlayerIds: ['player-a'],
      currentState: {
        turn: 0,
        participantIds: ['player-a', 'player-b'],
      },
    });
    await expect(service.submitAction(firstInput)).resolves.toEqual(pending);
    await expect(
      service.submitAction({
        ...firstInput,
        action: { kind: 'switch', slotIndex: 1 },
      }),
    ).rejects.toThrow('Competitive action conflict');
    await expect(
      service.submitAction({
        ...firstInput,
        clientCommandId: '00000000-0000-4000-8000-000000000005',
      }),
    ).rejects.toThrow('Competitive action conflict');

    const secondInputs = [
      actionInput(
        assignment.matchId,
        'account-b',
        '00000000-0000-4000-8000-000000000002',
      ),
      actionInput(
        assignment.matchId,
        'account-b',
        '00000000-0000-4000-8000-000000000003',
      ),
    ];
    const concurrent = await Promise.allSettled(
      secondInputs.map((input) => service.submitAction(input)),
    );
    const resolvedIndex = concurrent.findIndex(
      (result) => result.status === 'fulfilled',
    );
    expect(resolvedIndex).toBeGreaterThanOrEqual(0);
    expect(
      concurrent.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      concurrent.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      concurrent[resolvedIndex] as PromiseFulfilledResult<{
        currentTurn: number;
      }>,
    ).toMatchObject({ value: { currentTurn: 1 } });
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveAction).count(),
    ).resolves.toBe(2);
    await expect(
      dataSource.getRepository(PokeLoungeRoom).findOneByOrFail({
        roomCode: 'ROOM05',
      }),
    ).resolves.toMatchObject({ revision: 8 });

    const persisted = await repository.findAssignmentForParticipant({
      roomCode: 'ROOM05',
      playerId: 'player-a',
      accountId: 'account-a',
    });
    expect(persisted).toMatchObject({ currentTurn: 1, status: 'active' });

    const resolvedInput = secondInputs[resolvedIndex];
    const resolvedResponse = (
      concurrent[resolvedIndex] as PromiseFulfilledResult<unknown>
    ).value;
    const receipts = await dataSource
      .getRepository(PokeLoungeCompetitiveAction)
      .createQueryBuilder('action')
      .addSelect(['action.response'])
      .where('action.matchId = :matchId', { matchId: assignment.matchId })
      .orderBy('action.actorPlayerId', 'ASC')
      .getMany();
    expect(receipts.map((receipt) => receipt.status)).toEqual([
      'resolved',
      'resolved',
    ]);
    expect(receipts[0].resolvedAt).toEqual(receipts[1].resolvedAt);
    expect(receipts[0].response).toEqual(resolvedResponse);
    expect(receipts[1].response).toEqual(resolvedResponse);
    await dataSource.query(
      'UPDATE "poke_lounge_competitive_match" SET "ruleset_hash" = $1 WHERE "match_id" = $2',
      ['0'.repeat(64), assignment.matchId],
    );
    publish.mockClear();
    const revisionBeforeReplay = (
      await dataSource.getRepository(PokeLoungeRoom).findOneByOrFail({
        roomCode: 'ROOM05',
      })
    ).revision;
    await expect(service.submitAction(firstInput)).resolves.toEqual(
      resolvedResponse,
    );
    await expect(
      service.submitAction({
        ...firstInput,
        action: { kind: 'switch', slotIndex: 1 },
      }),
    ).rejects.toThrow('Competitive action conflict');
    await expect(
      dataSource.getRepository(PokeLoungeRoom).findOneByOrFail({
        roomCode: 'ROOM05',
      }),
    ).resolves.toMatchObject({ revision: revisionBeforeReplay });
    expect(publish.mock.calls).toHaveLength(0);

    await dataSource.destroy();
    dataSource = createDataSource(testDatabaseUrl);
    await dataSource.initialize();
    resetServices();

    await expect(service.submitAction(resolvedInput)).resolves.toEqual(
      resolvedResponse,
    );
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveAction).count(),
    ).resolves.toBe(2);

    await dataSource
      .getRepository(PokeLoungeCompetitiveMatch)
      .update({ matchId: assignment.matchId }, { status: 'completed' });
    await expect(
      service.submitAction({
        ...actionInput(
          assignment.matchId,
          'account-a',
          '00000000-0000-4000-8000-000000000004',
        ),
        turn: 1,
      }),
    ).rejects.toThrow('Competitive action conflict');
  });

  it('fails closed on unsupported persisted rulesets without mutation or events', async () => {
    await insertRoom('ROOM06', ['player-a', 'player-b']);
    await service.bindSeat('ROOM06', 'session-a', 'account-a');
    const assignment = await service.bindSeat(
      'ROOM06',
      'session-b',
      'account-b',
    );
    if (!assignment) {
      throw new Error('Expected competitive assignment');
    }
    const pendingInput = {
      ...actionInput(assignment.matchId, 'account-a'),
      roomCode: 'ROOM06',
    };
    const pendingResponse = await service.submitAction(pendingInput);
    publish.mockClear();
    await dataSource.query(
      'UPDATE "poke_lounge_competitive_match" SET "ruleset_hash" = $1 WHERE "match_id" = $2',
      ['0'.repeat(64), assignment.matchId],
    );

    await expect(service.submitAction(pendingInput)).resolves.toEqual(
      pendingResponse,
    );
    await expect(
      service.submitAction({
        ...pendingInput,
        action: { kind: 'switch', slotIndex: 1 },
      }),
    ).rejects.toThrow('Competitive action conflict');
    await expect(
      service.submitAction({
        ...pendingInput,
        clientCommandId: '00000000-0000-4000-8000-000000000006',
      }),
    ).rejects.toThrow('Competitive action conflict');
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveAction).count(),
    ).resolves.toBe(1);
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveMatch).findOneByOrFail({
        matchId: assignment.matchId,
      }),
    ).resolves.toMatchObject({ currentTurn: 0, status: 'active' });
    await expect(
      dataSource.getRepository(PokeLoungeRoom).findOneByOrFail({
        roomCode: 'ROOM06',
      }),
    ).resolves.toMatchObject({ revision: 7 });
    expect(publish.mock.calls).toHaveLength(0);
  });

  it('preserves command revision and stored replay when a later casual commit wins enrichment', async () => {
    await insertRoom('ROOM13', ['player-a', 'player-b']);
    await service.bindSeat('ROOM13', 'session-a', 'account-a');
    await service.bindSeat('ROOM13', 'session-b', 'account-b');
    const baseRepository = new PostgresPokeLoungeRoomRepository(dataSource);
    const roomPublish = jest.fn<Promise<void>, [PokeLoungeRoomCommittedEvent]>(
      () => Promise.resolve(),
    );
    const projection = new CompetitiveProjectionService(dataSource);
    const laterService = new PokeLoungeRoomService(
      baseRepository,
      { publish: roomPublish },
      projection,
      () => 'UNUSED',
      () => 0,
    );
    let laterCommitted = false;
    const wrappingRepository: PokeLoungeRoomRepository = {
      create: (input) => baseRepository.create(input),
      getAndAdvance: (roomCode, nowMs) =>
        baseRepository.getAndAdvance(roomCode, nowMs),
      purgeExpired: (nowMs) => baseRepository.purgeExpired(nowMs),
      mutate: async (input) => {
        const result = await baseRepository.mutate(input);
        if (
          result?.outcome === 'committed' &&
          !laterCommitted &&
          result.snapshot.revision === 7
        ) {
          laterCommitted = true;
          await laterService.setReady(
            'ROOM13',
            {
              playerId: 'player-b',
              sessionId: 'session-b',
              ready: true,
              nowMs: 2,
            },
            roomCommand(7, 15),
          );
        }
        return result;
      },
    };
    const commandService = new PokeLoungeRoomService(
      wrappingRepository,
      { publish: roomPublish },
      projection,
      () => 'UNUSED',
      () => 0,
    );
    roomPublish.mockClear();
    const firstCommand = roomCommand(6, 14);

    const revisionOne = await commandService.setReady(
      'ROOM13',
      {
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
        nowMs: 1,
      },
      firstCommand,
    );

    expect(revisionOne).toMatchObject({
      revision: 7,
      participants: [
        { playerId: 'player-a', ready: true },
        { playerId: 'player-b', ready: false },
      ],
    });
    expect(revisionOne.competitive).toBeUndefined();
    expect(
      roomPublish.mock.calls.map(([event]) => event.snapshot.revision),
    ).toEqual([8, 8]);
    expect(
      roomPublish.mock.calls.filter(([event]) => event.snapshot.revision === 8),
    ).toHaveLength(2);
    expect(
      roomPublish.mock.calls.some(([event]) => event.snapshot.revision === 7),
    ).toBe(false);
    expect(roomPublish.mock.calls[1][0].snapshot.competitive).toMatchObject({
      submittedPlayerIds: [],
    });

    roomPublish.mockClear();
    const replay = await commandService.setReady(
      'ROOM13',
      {
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
        nowMs: 1,
      },
      { ...firstCommand, expectedRevision: 999 },
    );

    expect(replay).toEqual(revisionOne);
    expect(roomPublish).not.toHaveBeenCalled();

    const latest = await commandService.getRoom('ROOM13', 0);
    expect(latest).toMatchObject({
      revision: 8,
      participants: [
        { playerId: 'player-a', ready: true },
        { playerId: 'player-b', ready: true },
      ],
      competitive: { submittedPlayerIds: [] },
    });
    expect(roomPublish).not.toHaveBeenCalled();
  });

  it('returns an old-all repeatable-read snapshot when an action commits between room and match reads', async () => {
    await insertRoom('ROOM10', ['player-a', 'player-b']);
    await service.bindSeat('ROOM10', 'session-a', 'account-a');
    const assignment = await service.bindSeat(
      'ROOM10',
      'session-b',
      'account-b',
    );
    if (!assignment) {
      throw new Error('Expected competitive assignment');
    }
    const firstInput = {
      ...actionInput(
        assignment.matchId,
        'account-a',
        '00000000-0000-4000-8000-000000000010',
      ),
      roomCode: 'ROOM10',
    };
    const secondInput = {
      ...actionInput(
        assignment.matchId,
        'account-b',
        '00000000-0000-4000-8000-000000000011',
      ),
      roomCode: 'ROOM10',
    };
    const pending = await service.submitAction(firstInput);

    class RacingProjectionService extends CompetitiveProjectionService {
      protected override afterRoomRead(): Promise<void> {
        return service.submitAction(secondInput).then(() => undefined);
      }
    }
    const racingReader = new RacingProjectionService(dataSource);

    const raced = await racingReader.findRoomSnapshot('ROOM10');

    expect(raced).toMatchObject({
      revision: 7,
      competitive: {
        currentTurn: 0,
        stateHash: pending.stateHash,
        submittedPlayerIds: ['player-a'],
      },
    });
    const fresh = await new CompetitiveProjectionService(
      dataSource,
    ).findRoomSnapshot('ROOM10');
    expect(fresh).toMatchObject({
      revision: 8,
      competitive: { currentTurn: 1, submittedPlayerIds: [] },
    });
  });

  it('rolls back terminal action publication on a changed source score and recovers after correction', async () => {
    await seedUsers(['account-a', 'account-b']);
    await insertRoom('ROOM11', ['player-a', 'player-b']);
    await service.bindSeat('ROOM11', 'session-a', 'account-a');
    const assignment = await service.bindSeat(
      'ROOM11',
      'session-b',
      'account-b',
    );
    if (!assignment) {
      throw new Error('Expected competitive assignment');
    }
    await prepareTerminalTurn(assignment.matchId, 'player-b');
    const room = await dataSource
      .getRepository(PokeLoungeRoom)
      .findOneByOrFail({ roomCode: 'ROOM11' });
    const conflictingSourceKey = `${room.id}:${assignment.matchId}:account-a`;
    const [{ id: conflictingHistoryId }] = await dataSource.query<
      Array<{ id: string }>
    >(
      `
      INSERT INTO game_history
        (score, "gameType", "userId", "resultTrust", "sourceKey")
      VALUES (50, 'POKE_LOUNGE', 'account-a', 'verified-room', $1)
      RETURNING id
      `,
      [conflictingSourceKey],
    );
    const firstInput = {
      ...actionInput(
        assignment.matchId,
        'account-a',
        '00000000-0000-4000-8000-000000000012',
      ),
      roomCode: 'ROOM11',
    };
    const secondInput = {
      ...actionInput(
        assignment.matchId,
        'account-b',
        '00000000-0000-4000-8000-000000000013',
      ),
      roomCode: 'ROOM11',
    };
    await service.submitAction(firstInput);
    publish.mockClear();

    await expect(service.submitAction(secondInput)).rejects.toThrow(
      /conflicts with the persisted server result/,
    );
    await expect(
      dataSource.query(
        `
        SELECT current_turn, status, terminal_result, history_publication
        FROM poke_lounge_competitive_match
        WHERE match_id = $1
        `,
        [assignment.matchId],
      ),
    ).resolves.toEqual([
      {
        current_turn: 0,
        status: 'active',
        terminal_result: null,
        history_publication: null,
      },
    ]);
    await expect(
      dataSource.query(
        `SELECT status, resolved_at FROM poke_lounge_competitive_action ORDER BY actor_player_id`,
      ),
    ).resolves.toEqual([{ status: 'pending', resolved_at: null }]);
    await expect(historyCount()).resolves.toBe(1);
    await expect(
      dataSource.getRepository(PokeLoungeRoom).findOneByOrFail({
        roomCode: 'ROOM11',
      }),
    ).resolves.toMatchObject({ revision: 7 });
    expect(publish).not.toHaveBeenCalled();

    await dataSource.query(
      `UPDATE game_history SET score = 100 WHERE id = $1`,
      [conflictingHistoryId],
    );
    await expect(service.submitAction(secondInput)).resolves.toMatchObject({
      status: 'completed',
      terminal: { winnerPlayerId: 'player-a', loserPlayerId: 'player-b' },
    });
    await expect(historyCount()).resolves.toBe(2);
    await expect(
      dataSource.query(`SELECT id FROM game_history WHERE "sourceKey" = $1`, [
        conflictingSourceKey,
      ]),
    ).resolves.toEqual([{ id: conflictingHistoryId }]);
    expect(publish.mock.calls).toHaveLength(1);
  });

  it('preserves a populated history publication column when migration down is attempted', async () => {
    await insertRoom('ROOM12', ['player-a', 'player-b']);
    await service.bindSeat('ROOM12', 'session-a', 'account-a');
    const assignment = await service.bindSeat(
      'ROOM12',
      'session-b',
      'account-b',
    );
    if (!assignment) {
      throw new Error('Expected competitive assignment');
    }
    const publication = {
      historyIdByAccountId: {
        'account-a': '11111111-1111-4111-8111-111111111111',
      },
    };
    await dataSource.query(
      `UPDATE poke_lounge_competitive_match SET history_publication = $1 WHERE match_id = $2`,
      [publication, assignment.matchId],
    );
    const queryRunner = dataSource.createQueryRunner();
    try {
      await expect(
        new AddCompetitiveHistoryPublication1794441600000().down(queryRunner),
      ).rejects.toThrow(/Cannot remove competitive history publication/);
    } finally {
      await queryRunner.release();
    }

    await expect(
      dataSource.query(
        `SELECT history_publication FROM poke_lounge_competitive_match WHERE match_id = $1`,
        [assignment.matchId],
      ),
    ).resolves.toEqual([{ history_publication: publication }]);
    await expect(
      dataSource.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name = 'poke_lounge_competitive_match' AND column_name = 'history_publication'`,
      ),
    ).resolves.toEqual([{ data_type: 'jsonb' }]);
  });

  it('atomically publishes terminal histories, retries once, and replays after restart without republishing', async () => {
    await seedUsers(['account-a', 'account-b']);
    await insertRoom('ROOM07', ['player-a', 'player-b']);
    await service.bindSeat('ROOM07', 'session-a', 'account-a');
    const assignment = await service.bindSeat(
      'ROOM07',
      'session-b',
      'account-b',
    );
    if (!assignment) {
      throw new Error('Expected competitive assignment');
    }
    expect(publish.mock.calls).toHaveLength(1);
    expect(publish.mock.calls[0][0]).toMatchObject({
      type: 'competitive-assignment-committed',
      snapshot: {
        competitive: {
          matchId: assignment.matchId,
          submittedPlayerIds: [],
        },
      },
    });
    await prepareTerminalTurn(assignment.matchId, 'player-b');

    const firstInput = {
      ...actionInput(
        assignment.matchId,
        'account-a',
        '00000000-0000-4000-8000-000000000007',
      ),
      roomCode: 'ROOM07',
    };
    const secondInput = {
      ...actionInput(
        assignment.matchId,
        'account-b',
        '00000000-0000-4000-8000-000000000008',
      ),
      roomCode: 'ROOM07',
    };
    await service.submitAction(firstInput);
    publish.mockClear();

    const failOnceWrite = jest
      .fn<
        ReturnType<VerifiedPokeLoungeHistoryWriter['write']>,
        Parameters<VerifiedPokeLoungeHistoryWriter['write']>
      >()
      .mockRejectedValueOnce(new Error('history publication failed'))
      .mockImplementation((manager, input) =>
        historyWriter.write(manager, input),
      );
    const failOnceWriter = { write: failOnceWrite };
    resetServices(failOnceWriter);

    await expect(service.submitAction(secondInput)).rejects.toThrow(
      'history publication failed',
    );
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveAction).find(),
    ).resolves.toMatchObject([{ status: 'pending', resolvedAt: null }]);
    await expect(
      dataSource.getRepository(PokeLoungeCompetitiveMatch).findOneByOrFail({
        matchId: assignment.matchId,
      }),
    ).resolves.toMatchObject({
      currentTurn: 0,
      status: 'active',
      completedAt: null,
    });
    await expect(
      dataSource.query(
        'SELECT history_publication FROM poke_lounge_competitive_match WHERE match_id = $1',
        [assignment.matchId],
      ),
    ).resolves.toEqual([{ history_publication: null }]);
    await expect(historyCount()).resolves.toBe(0);
    expect(publish).not.toHaveBeenCalled();

    const terminalResponse = await service.submitAction(secondInput);
    expect(terminalResponse).toMatchObject({
      status: 'completed',
      terminal: {
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'faint',
        scoreByPlayerId: { 'player-a': 100, 'player-b': 50 },
      },
    });
    expect(failOnceWrite.mock.calls).toHaveLength(2);
    expect(publish).toHaveBeenCalledTimes(1);

    const histories = await dataSource.query<GameHistory[]>(
      'SELECT * FROM game_history ORDER BY "userId" ASC',
    );
    expect(
      histories.map(({ userId, score, resultTrust, sourceKey }) => ({
        userId,
        score,
        resultTrust,
        sourceKey,
      })),
    ).toEqual([
      {
        userId: 'account-a',
        score: 100,
        resultTrust: 'verified-room',
        sourceKey: histories[0].sourceKey,
      },
      {
        userId: 'account-b',
        score: 50,
        resultTrust: 'verified-room',
        sourceKey: histories[1].sourceKey,
      },
    ]);
    expect(histories[0].sourceKey).toMatch(
      new RegExp(`^.+:${assignment.matchId}:account-a$`),
    );
    expect(histories[1].sourceKey).toMatch(
      new RegExp(`^.+:${assignment.matchId}:account-b$`),
    );
    const [audit] = await dataSource.query<
      Array<{
        history_publication: { historyIdByAccountId: Record<string, string> };
      }>
    >(
      'SELECT history_publication FROM poke_lounge_competitive_match WHERE match_id = $1',
      [assignment.matchId],
    );
    expect(audit.history_publication.historyIdByAccountId).toEqual({
      'account-a': histories[0].id,
      'account-b': histories[1].id,
    });
    expect(JSON.stringify(terminalResponse)).not.toContain(histories[0].id);
    expect(JSON.stringify(publish.mock.calls)).not.toContain(histories[0].id);

    const rankingDataSource = new DataSource({
      type: 'postgres',
      url: testDatabaseUrl,
      entities: [User, GameHistory, GamePokeLoungeState],
    });
    await rankingDataSource.initialize();
    const ranking = await new GameService(
      rankingDataSource.getRepository(GameHistory),
      rankingDataSource.getRepository(GamePokeLoungeState),
    ).getRanking(GameType.POKE_LOUNGE);
    await rankingDataSource.destroy();
    expect(ranking.map(({ userId, score }) => ({ userId, score }))).toEqual([
      { userId: 'account-a', score: 100 },
      { userId: 'account-b', score: 50 },
    ]);

    await dataSource.destroy();
    dataSource = createDataSource(testDatabaseUrl);
    await dataSource.initialize();
    resetServices();
    publish.mockClear();

    const recoveryService = new PokeLoungeRoomService(
      new PostgresPokeLoungeRoomRepository(dataSource),
      { publish },
      new CompetitiveProjectionService(dataSource),
      () => 'UNUSED',
      () => 0,
    );
    const recovered = await recoveryService.getRoom('ROOM07', 0);
    expect(recovered.competitive).toEqual(terminalResponse);
    const serializedRecovery = JSON.stringify(recovered.competitive);
    expect(serializedRecovery).not.toContain('account-a');
    expect(serializedRecovery).not.toContain('session-a');
    expect(serializedRecovery).not.toContain('serverSeed');
    expect(serializedRecovery).not.toContain('clientCommandId');
    expect(serializedRecovery).not.toContain(histories[0].id);

    await expect(service.submitAction(secondInput)).resolves.toEqual(
      terminalResponse,
    );
    await expect(historyCount()).resolves.toBe(2);
    expect(publish).not.toHaveBeenCalled();
  });

  function resetServices(writer = historyWriter) {
    repository = new PostgresCompetitiveMatchRepository(dataSource);
    actionRepository = new (PostgresCompetitiveActionRepository as unknown as {
      new (
        source: DataSource,
        verifiedWriter: VerifiedPokeLoungeHistoryWriter,
      ): PostgresCompetitiveActionRepository;
    })(dataSource, writer);
    service = new CompetitiveMatchService(repository, actionRepository, {
      publish,
    });
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

  async function seedUsers(accountIds: string[]) {
    for (const accountId of accountIds) {
      await dataSource.query(
        `INSERT INTO "user" (id, email, "firstName", "lastName") VALUES ($1, $2, 'Test', 'User')`,
        [accountId, `${accountId}@example.com`],
      );
    }
  }

  async function historyCount(): Promise<number> {
    const [{ count }] = await dataSource.query<Array<{ count: string }>>(
      'SELECT count(*) FROM game_history',
    );
    return Number(count);
  }

  async function prepareTerminalTurn(matchId: string, loserPlayerId: string) {
    const match = await dataSource
      .getRepository(PokeLoungeCompetitiveMatch)
      .createQueryBuilder('match')
      .addSelect(['match.currentState'])
      .where('match.matchId = :matchId', { matchId })
      .getOneOrFail();
    const losingTeam = match.currentState.playersById[loserPlayerId].team;
    losingTeam.forEach((combatant, index) => {
      combatant.currentHp = index === 0 ? 1 : 0;
    });
    match.currentStateHash = hashCanonicalState(match.currentState);
    await dataSource.getRepository(PokeLoungeCompetitiveMatch).save(match);
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
      PokeLoungeCompetitiveAction,
    ],
    migrations: [
      CreateLegacyCoreSchema1759999999999,
      AddPokeLoungeGameType1793664000000,
      CreateGamePokeLoungeState1793750400000,
      CreatePokeLoungeRoomStorage1794096000000,
      CreatePokeLoungeCompetitiveAssignment1794182400000,
      CreatePokeLoungeCompetitiveAction1794268800000,
      AddGameResultTrust1794355200000,
      AddCompetitiveHistoryPublication1794441600000,
    ],
    synchronize: false,
    migrationsTransactionMode: 'each',
  });
}

function actionInput(
  matchId: string,
  accountId: string,
  clientCommandId = '00000000-0000-4000-8000-000000000001',
) {
  return {
    roomCode: 'ROOM05',
    matchId,
    accountId,
    assignmentRevision: 1,
    turn: 0,
    clientCommandId,
    action: { kind: 'move' as const, moveId: 'steady-strike' },
  };
}

function roomCommand(expectedRevision: number, index: number) {
  return {
    expectedRevision,
    idempotencyKey: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  };
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
