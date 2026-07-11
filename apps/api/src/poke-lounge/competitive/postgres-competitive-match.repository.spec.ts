import type { DataSource, EntityManager } from 'typeorm';
import { PostgresCompetitiveMatchRepository } from './postgres-competitive-match.repository';

type SeatRow = {
  sessionId: string;
  playerId: string;
  accountId: string;
};

type ScriptedQueryBuilder = {
  setLock: jest.Mock<ScriptedQueryBuilder, [string]>;
  addSelect: jest.Mock<ScriptedQueryBuilder, [string[]]>;
  where: jest.Mock<ScriptedQueryBuilder, [string, Record<string, unknown>]>;
  getOne: jest.Mock<Promise<unknown>, []>;
};

describe('PostgresCompetitiveMatchRepository', () => {
  it('locks the room and stores the second seat and assignment in one transaction', async () => {
    const calls: string[] = [];
    const room = {
      id: 'room-id',
      roomCode: 'ROOM01',
      state: roomState(),
      revision: 7,
    };
    const existingSeats: SeatRow[] = [
      {
        sessionId: 'session-a',
        playerId: 'player-a',
        accountId: 'account-a',
      },
    ];
    const seatRepository = {
      find: jest.fn<Promise<SeatRow[]>, []>(() =>
        Promise.resolve(existingSeats),
      ),
      create: jest.fn<SeatRow, [SeatRow]>((value) => value),
      save: jest.fn<Promise<SeatRow>, [SeatRow]>((value) => {
        calls.push('seat-save');
        return Promise.resolve(value);
      }),
    };
    type MatchAssignment = ReturnType<typeof assignment>;
    const matchRepository = {
      createQueryBuilder: jest.fn<ScriptedQueryBuilder, []>(() =>
        chainQueryBuilder(null, calls),
      ),
      create: jest.fn<MatchAssignment, [MatchAssignment]>((value) => value),
      save: jest.fn<Promise<MatchAssignment>, [MatchAssignment]>((value) => {
        calls.push('match-save');
        return Promise.resolve(value);
      }),
    };
    const roomQueryBuilder = chainQueryBuilder(room, calls, true);
    const roomRepository = {
      createQueryBuilder: jest.fn<ScriptedQueryBuilder, []>(
        () => roomQueryBuilder,
      ),
    };
    const getRepository = jest
      .fn<unknown, [unknown]>()
      .mockReturnValueOnce(roomRepository)
      .mockReturnValueOnce(seatRepository)
      .mockReturnValueOnce(matchRepository);
    const manager = {
      getRepository,
    } as unknown as EntityManager;
    const repository = new PostgresCompetitiveMatchRepository(
      managerDataSource(manager),
    );

    const result = await repository.bindSeatAndAssign({
      roomCode: 'room01',
      sessionId: 'session-b',
      accountId: 'account-b',
      createAssignment: (context) => assignment(context),
    });

    expect(roomQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(seatRepository.save).toHaveBeenCalledTimes(1);
    expect(matchRepository.save).toHaveBeenCalledTimes(1);
    expect(calls.indexOf('seat-save')).toBeLessThan(
      calls.indexOf('match-save'),
    );
    expect(result).toMatchObject({ outcome: 'assigned' });
  });
});

function chainQueryBuilder(
  result: unknown,
  calls: string[],
  room = false,
): ScriptedQueryBuilder {
  const builder = {} as ScriptedQueryBuilder;
  builder.setLock = jest.fn<ScriptedQueryBuilder, [string]>(() => builder);
  builder.addSelect = jest.fn<ScriptedQueryBuilder, [string[]]>(() => builder);
  builder.where = jest.fn<
    ScriptedQueryBuilder,
    [string, Record<string, unknown>]
  >(() => builder);
  builder.getOne = jest.fn<Promise<unknown>, []>(() => {
    calls.push(room ? 'room-lock' : 'match-read');
    return Promise.resolve(result);
  });
  return builder;
}

function managerDataSource(manager: EntityManager): DataSource {
  return {
    transaction<T>(runInTransaction: (value: EntityManager) => Promise<T>) {
      return runInTransaction(manager);
    },
  } as unknown as DataSource;
}

function assignment(context: {
  roomId: string;
  roomCode: string;
  assignmentRevision: number;
  players: [
    { playerId: string; accountId: string },
    { playerId: string; accountId: string },
  ];
}) {
  const participantIds = context.players.map((player) => player.playerId) as [
    string,
    string,
  ];
  const state = {
    rulesetVersion: 1 as const,
    turn: 0,
    participantIds,
    playersById: {},
    terminal: null,
  };
  return {
    ...context,
    matchId: '00000000-0000-4000-8000-000000000001',
    playerAccounts: context.players,
    rulesetVersion: 1,
    rulesetHash: 'a'.repeat(64),
    serverSeed: 'b'.repeat(64),
    initialState: state,
    initialStateHash: 'c'.repeat(64),
    currentState: state,
    currentStateHash: 'c'.repeat(64),
    currentTurn: 0,
    status: 'pending' as const,
    terminalResult: null,
    completedAt: null,
  };
}

function roomState() {
  return {
    roomCode: 'ROOM01',
    status: 'waiting' as const,
    createdAtMs: 0,
    updatedAtMs: 0,
    participants: [
      participant('session-a', 'player-a'),
      participant('session-b', 'player-b'),
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
  };
}

function participant(sessionId: string, playerId: string) {
  return {
    sessionId,
    playerId,
    displayName: playerId,
    role: 'participant' as const,
    ready: false,
    connected: true,
    joinedAtMs: 0,
  };
}
