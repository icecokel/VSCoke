import { DelayedError } from 'bullmq';
import {
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
} from '@vscoke/poke-lounge-battle';
import { createTestInitialBattleState } from '../../../test/support/competitive-party.fixture';
import type { CompetitiveActionRepository } from './competitive-action.repository';
import { CompetitiveTurnWorkerService } from './competitive-turn-worker.service';

describe('CompetitiveTurnWorkerService', () => {
  it('publishes only the public snapshot after resolving an expired turn', async () => {
    const actionRepository = repository();
    actionRepository.expirePendingTurn.mockResolvedValue({
      outcome: 'resolved',
      response: competitiveProjection(),
      room: roomSnapshot(),
    });
    const service = new CompetitiveTurnWorkerService(
      {} as never,
      {} as never,
      actionRepository,
    );

    const result = await service.process(job());

    expect(result).toMatchObject({
      outcome: 'resolved',
      event: {
        type: 'competitive-action-committed',
        snapshot: {
          roomCode: 'ROOM01',
          competitive: { matchId: 'match-1' },
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain('session-secret');
  });

  it('returns an early job to its durable Redis deadline', async () => {
    const actionRepository = repository();
    actionRepository.expirePendingTurn.mockResolvedValue({
      outcome: 'not-due',
      retryAtMs: 31_000,
    });
    const service = new CompetitiveTurnWorkerService(
      {} as never,
      {} as never,
      actionRepository,
    );
    const turnJob = job();

    await expect(service.process(turnJob)).rejects.toBeInstanceOf(DelayedError);
    expect(turnJob.moveToDelayed).toHaveBeenCalledWith(31_000, 'lock-token');
  });
});

function repository(): jest.Mocked<CompetitiveActionRepository> {
  return {
    submit: jest.fn(),
    findPendingTurns: jest.fn(),
    expirePendingTurn: jest.fn(),
  };
}

function job() {
  return {
    data: {
      roomCode: 'ROOM01',
      matchId: 'match-1',
      turn: 0,
      deadlineMs: 30_000,
    },
    token: 'lock-token',
    moveToDelayed: jest.fn().mockResolvedValue(undefined),
  } as never;
}

function competitiveProjection() {
  return {
    matchId: 'match-1',
    bracketMatchId: 'game-round-1-bracket-1-match-1',
    kind: 'tournament-unranked' as const,
    assignmentRevision: 1,
    rulesetVersion: COMPETITIVE_RULESET_VERSION,
    rulesetHash: COMPETITIVE_RULESET_HASH,
    currentTurn: 1,
    status: 'active' as const,
    terminalEventId: null,
    terminalRoomRevision: null,
    playerIds: ['player-a', 'player-b'] as [string, string],
    currentState: createTestInitialBattleState(['player-a', 'player-b']),
    stateHash: 'a'.repeat(64),
    submittedPlayerIds: [],
    terminal: null,
  };
}

function roomSnapshot() {
  return {
    roomCode: 'ROOM01',
    status: 'tournament' as const,
    createdAtMs: 0,
    updatedAtMs: 1_000,
    participants: [
      {
        playerId: 'player-a',
        sessionId: 'session-secret',
        displayName: 'Player A',
        role: 'host' as const,
        ready: true,
        connected: true,
        joinedAtMs: 0,
      },
    ],
    partySnapshots: {},
    round: {
      index: 1,
      phase: 'tournament' as const,
      durationMs: 180_000,
      startedAtMs: 0,
      endsAtMs: 180_000,
    },
    tournament: {
      version: 2,
      bracket: null,
      activeMatchId: 'game-round-1-bracket-1-match-1',
      activeMatchAuthority: 'server' as const,
      cumulativeScores: {},
    },
    finalStandings: [],
    revision: 2,
    expiresAtMs: 360_000,
    competitive: competitiveProjection(),
  };
}
