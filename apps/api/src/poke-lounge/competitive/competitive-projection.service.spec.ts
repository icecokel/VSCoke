import {
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  createInitialBattleState,
  hashCanonicalState,
} from '@vscoke/poke-lounge-battle';
import { toCompetitiveProjection } from './competitive-projection.service';
import { CompetitiveProjectionService } from './competitive-projection.service';
import type { DataSource } from 'typeorm';

describe('toCompetitiveProjection', () => {
  it('exposes only the recoverable approved battle state and current submissions', () => {
    const state = createInitialBattleState(['player-a', 'player-b']);

    const projection = toCompetitiveProjection(
      {
        matchId: 'match-1',
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
      assignmentRevision: 1,
      rulesetVersion: COMPETITIVE_RULESET_VERSION,
      rulesetHash: COMPETITIVE_RULESET_HASH,
      currentTurn: 0,
      status: 'active',
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
});

describe('CompetitiveProjectionService', () => {
  it('reads room, match, and receipts through one repeatable-read manager', async () => {
    const room = {
      roomCode: 'ROOM01',
      state: {
        roomCode: 'ROOM01',
        participants: [],
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
    expect(directGetRepository.mock.calls).toHaveLength(0);
  });
});

function queryBuilder(result: unknown) {
  return {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };
}
