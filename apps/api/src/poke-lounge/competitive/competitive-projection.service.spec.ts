import {
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  createCanonicalIdRecord,
  createInitialBattleState,
  hashCanonicalState,
} from '@vscoke/poke-lounge-battle';
import type { CanonicalTerminalResult } from '@vscoke/poke-lounge-battle';
import {
  toCompetitiveProjection,
  toCompetitiveTerminalTransition,
} from './competitive-projection.service';
import { CompetitiveProjectionService } from './competitive-projection.service';
import type { DataSource } from 'typeorm';

describe('toCompetitiveProjection', () => {
  it('exposes only the recoverable approved battle state and current submissions', () => {
    const state = createInitialBattleState(['player-a', 'player-b']);

    const projection = toCompetitiveProjection(
      {
        matchId: 'match-1',
        bracketMatchId: 'game-round-1-bracket-1-match-1',
        kind: 'tournament-unranked',
        assignmentRevision: 1,
        rulesetVersion: COMPETITIVE_RULESET_VERSION,
        rulesetHash: COMPETITIVE_RULESET_HASH,
        currentTurn: 0,
        status: 'active',
        currentState: state,
        currentStateHash: hashCanonicalState(state),
        terminalResult: null,
      },
      ['player-b', 'player-a'],
    );

    expect(projection).toMatchObject({
      matchId: 'match-1',
      bracketMatchId: 'game-round-1-bracket-1-match-1',
      kind: 'tournament-unranked',
      assignmentRevision: 1,
      rulesetVersion: COMPETITIVE_RULESET_VERSION,
      rulesetHash: COMPETITIVE_RULESET_HASH,
      currentTurn: 0,
      status: 'active',
      terminalEventId: null,
      terminalRoomRevision: null,
      playerIds: ['player-a', 'player-b'],
      submittedPlayerIds: ['player-a', 'player-b'],
      currentState: {
        playersById: {
          'player-a': {
            activeSlotIndex: 0,
          },
        },
      },
    });
    expect(projection.currentState.playersById['player-a'].team[0]).toEqual({
      speciesId: 'vscoke-alpha',
      maxHp: 120,
      currentHp: 120,
      status: 'none',
      moves: [
        { moveId: 'steady-strike', pp: 20 },
        { moveId: 'stun-spark', pp: 15 },
      ],
    });
    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain('attack');
    expect(serialized).not.toContain('defense');
    expect(serialized).not.toContain('speed');
    expect(serialized).not.toContain('"level"');
    expect(serialized).not.toContain('account');
    expect(serialized).not.toContain('session');
    expect(serialized).not.toContain('seed');
    expect(serialized).not.toContain('history');
    expect(serialized).not.toContain('clientCommandId');
  });

  it('projects completed terminal metadata and creates an exactly matching wrapper', () => {
    const terminalEventId = '00000000-0000-4000-8000-000000000050';
    const terminalRoomRevision = 50;
    const match = terminalMatch({ terminalEventId, terminalRoomRevision });

    const projection = toCompetitiveProjection(match, []);
    const transition = toCompetitiveTerminalTransition(projection);

    expect(projection).toMatchObject({
      status: 'completed',
      terminalEventId,
      terminalRoomRevision,
      terminal: {
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'faint',
      },
    });
    expect(transition.terminalEventId).toBe(projection.terminalEventId);
    expect(transition.terminalRoomRevision).toBe(
      projection.terminalRoomRevision,
    );
    expect(transition.projection).toEqual(projection);
  });

  it('rejects incomplete metadata pairs, active metadata, and inconsistent terminal state', () => {
    expect(() =>
      toCompetitiveProjection(
        terminalMatch({
          terminalEventId: null,
          terminalRoomRevision: null,
        }),
        [],
      ),
    ).toThrow('requires terminal metadata');

    const activeState = createInitialBattleState(['player-a', 'player-b']);
    expect(() =>
      toCompetitiveProjection(
        {
          matchId: 'match-active',
          bracketMatchId: 'game-round-1-bracket-1-match-1',
          kind: 'tournament-unranked',
          assignmentRevision: 1,
          rulesetVersion: COMPETITIVE_RULESET_VERSION,
          rulesetHash: COMPETITIVE_RULESET_HASH,
          currentTurn: 0,
          status: 'active',
          terminalEventId: '00000000-0000-4000-8000-000000000051',
          terminalRoomRevision: 51,
          currentState: activeState,
          currentStateHash: hashCanonicalState(activeState),
          terminalResult: null,
        },
        [],
      ),
    ).toThrow('cannot carry terminal metadata');

    const inconsistent = terminalMatch({
      terminalEventId: '00000000-0000-4000-8000-000000000052',
      terminalRoomRevision: 52,
    });
    inconsistent.currentState.terminal = {
      ...inconsistent.currentState.terminal!,
      winnerPlayerId: 'player-b',
      loserPlayerId: 'player-a',
    };
    expect(() => toCompetitiveProjection(inconsistent, [])).toThrow(
      'terminal projection state is inconsistent',
    );
  });
});

describe('CompetitiveProjectionService', () => {
  it('reads room, match, and receipts through one repeatable-read manager', async () => {
    const room = {
      id: '00000000-0000-4000-8000-000000000001',
      roomCode: 'ROOM01',
      state: {
        roomCode: 'ROOM01',
        participants: [],
        tournament: {
          activeMatchId: 'game-round-1-bracket-1-match-1',
          activeMatchAuthority: 'server',
        },
      },
      revision: 7,
      expiresAt: new Date('2026-07-11T01:00:00.000Z'),
    };
    const roomQuery = queryBuilder(room);
    const matchQuery = queryBuilder(null);
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce({
          createQueryBuilder: jest.fn().mockReturnValue(roomQuery),
        })
        .mockReturnValueOnce({
          createQueryBuilder: jest.fn().mockReturnValue(matchQuery),
        }),
    };
    const transaction = jest.fn(
      (_isolation: string, run: (value: typeof manager) => unknown) =>
        run(manager),
    );
    const directGetRepository = jest.fn().mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder(null)),
    });
    const dataSource = {
      transaction,
      getRepository: directGetRepository,
    } as unknown as DataSource;
    const service = new CompetitiveProjectionService(dataSource);

    await service.findRoomSnapshot('room01');

    expect(transaction).toHaveBeenCalledWith(
      'REPEATABLE READ',
      expect.any(Function),
    );
    expect(manager.getRepository.mock.calls.length).toBeGreaterThan(0);
    expect(matchQuery.where).toHaveBeenCalledWith('match.roomId = :roomId', {
      roomId: '00000000-0000-4000-8000-000000000001',
    });
    expect(matchQuery.andWhere).toHaveBeenCalledWith(
      'match.bracketMatchId = :bracketMatchId',
      { bracketMatchId: 'game-round-1-bracket-1-match-1' },
    );
    expect(matchQuery.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('match.status IN'),
      { statuses: ['pending', 'active'] },
    );
    expect(directGetRepository.mock.calls).toHaveLength(0);
  });

  it('returns at most eight completed transitions in the durable cursor window and stable order', async () => {
    const room = {
      id: '00000000-0000-4000-8000-000000000001',
      roomCode: 'ROOM01',
      state: {
        roomCode: 'ROOM01',
        participants: [],
        tournament: {
          activeMatchId: null,
          activeMatchAuthority: null,
        },
      },
      revision: 12,
      expiresAt: new Date('2026-07-11T01:00:00.000Z'),
    };
    const roomQuery = queryBuilder(room);
    const matches = Array.from({ length: 8 }, (_, index) => ({
      ...terminalMatch({
        terminalEventId: `00000000-0000-4000-8000-${String(index + 5).padStart(12, '0')}`,
        terminalRoomRevision: index + 5,
      }),
      matchId: `match-${index + 5}`,
    }));
    const transitionQuery = queryBuilder(null, matches);
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce({
          createQueryBuilder: jest.fn().mockReturnValue(roomQuery),
        })
        .mockReturnValueOnce({
          createQueryBuilder: jest.fn().mockReturnValue(transitionQuery),
        }),
    };
    const dataSource = {
      transaction: jest.fn(
        (_isolation: string, run: (value: typeof manager) => unknown) =>
          run(manager),
      ),
    } as unknown as DataSource;

    const snapshot = await new CompetitiveProjectionService(
      dataSource,
    ).findRoomSnapshot('room01', 4);

    expect(transitionQuery.andWhere).toHaveBeenCalledWith(
      'transition.terminalRoomRevision > :afterRevision',
      { afterRevision: 4 },
    );
    expect(transitionQuery.andWhere).toHaveBeenCalledWith(
      'transition.terminalRoomRevision <= :currentRevision',
      { currentRevision: 12 },
    );
    expect(transitionQuery.orderBy).toHaveBeenCalledWith(
      'transition.terminalRoomRevision',
      'ASC',
    );
    expect(transitionQuery.addOrderBy).toHaveBeenCalledWith(
      'transition.terminalEventId',
      'ASC',
    );
    expect(transitionQuery.take).toHaveBeenCalledWith(8);
    expect(snapshot?.competitiveTransitions).toHaveLength(8);
    expect(
      snapshot?.competitiveTransitions.map(
        (transition) => transition.terminalRoomRevision,
      ),
    ).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

function queryBuilder(result: unknown, results: unknown[] = []) {
  return {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
    getMany: jest.fn().mockResolvedValue(results),
  };
}

function terminalMatch(metadata: {
  terminalEventId: string | null;
  terminalRoomRevision: number | null;
}) {
  const state = createInitialBattleState(['player-a', 'player-b']);
  const terminal: CanonicalTerminalResult = {
    winnerPlayerId: 'player-a',
    loserPlayerId: 'player-b',
    reason: 'faint' as const,
    scoreByPlayerId: createCanonicalIdRecord([
      ['player-a', 100],
      ['player-b', 50],
    ]),
  };
  state.terminal = terminal;

  return {
    matchId: 'match-terminal',
    bracketMatchId: 'game-round-1-bracket-1-match-1',
    kind: 'tournament-unranked' as const,
    assignmentRevision: 1,
    rulesetVersion: COMPETITIVE_RULESET_VERSION,
    rulesetHash: COMPETITIVE_RULESET_HASH,
    currentTurn: 1,
    status: 'completed' as const,
    ...metadata,
    currentState: state,
    currentStateHash: hashCanonicalState(state),
    terminalResult: terminal,
  };
}
