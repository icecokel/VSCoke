import { summarizeActionEvidence } from '../../scripts/start-poke-lounge-e2e-api';

describe('Poke Lounge E2E assertion evidence', () => {
  it('counts action kinds and exposes only switch match/player/turn evidence', () => {
    expect(
      summarizeActionEvidence([
        {
          matchId: '11111111-1111-4111-8111-111111111111',
          playerId: 'player-4',
          turn: 0,
          kind: 'move',
        },
        {
          matchId: '11111111-1111-4111-8111-111111111111',
          playerId: 'player-5',
          turn: 0,
          kind: 'move',
        },
        {
          matchId: '11111111-1111-4111-8111-111111111111',
          playerId: 'player-4',
          turn: 3,
          kind: 'switch',
        },
      ]),
    ).toEqual({
      actionKindCounts: { move: 2, switch: 1 },
      forcedSwitchTurns: [
        {
          matchId: '11111111-1111-4111-8111-111111111111',
          playerId: 'player-4',
          turn: 3,
        },
      ],
    });
  });

  it('rejects an unknown stored action kind', () => {
    expect(() =>
      summarizeActionEvidence([
        {
          matchId: '11111111-1111-4111-8111-111111111111',
          playerId: 'player-4',
          turn: 0,
          kind: 'unknown',
        },
      ]),
    ).toThrow('Unknown competitive action kind');
  });
});
