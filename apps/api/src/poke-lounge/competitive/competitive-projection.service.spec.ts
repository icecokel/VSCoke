import {
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  createInitialBattleState,
  hashCanonicalState,
} from '@vscoke/poke-lounge-battle';
import { toCompetitiveProjection } from './competitive-projection.service';

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
