import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  createInitialBattleState,
  hashCanonicalState,
} from '@vscoke/poke-lounge-battle';
import type { CompetitiveMatchRepository } from './competitive-match.repository';
import type { CompetitiveActionRepository } from './competitive-action.repository';
import type { PokeLoungeRoomEventPublisher } from '../poke-lounge-room-event.publisher';
import { CompetitiveMatchService } from './competitive-match.service';

describe('CompetitiveMatchService', () => {
  let repository: jest.Mocked<CompetitiveMatchRepository>;
  let actionRepository: jest.Mocked<CompetitiveActionRepository>;
  let publisher: jest.Mocked<PokeLoungeRoomEventPublisher>;
  let service: CompetitiveMatchService;

  beforeEach(() => {
    repository = {
      bindSeatAndAssign: jest.fn(),
      findAssignmentForParticipant: jest.fn(),
    };
    actionRepository = { submit: jest.fn() };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new CompetitiveMatchService(
      repository,
      actionRepository,
      publisher,
    );
  });

  it('creates a full approved assignment and returns only its public projection', async () => {
    repository.bindSeatAndAssign.mockImplementation((input) => {
      const match = input.createAssignment({
        roomId: 'room-id',
        roomCode: 'ROOM01',
        assignmentRevision: 1,
        players: [
          { playerId: 'player-a', accountId: 'account-a' },
          { playerId: 'player-b', accountId: 'account-b' },
        ],
      });

      expect(match.initialState).toEqual(
        createInitialBattleState(['player-a', 'player-b']),
      );
      expect(match.initialStateHash).toBe(
        hashCanonicalState(match.initialState),
      );
      expect(match.currentState).toEqual(match.initialState);
      expect(match.rulesetVersion).toBe(COMPETITIVE_RULESET_VERSION);
      expect(match.rulesetHash).toBe(COMPETITIVE_RULESET_HASH);
      expect(match.serverSeed).toMatch(/^[0-9a-f]{64}$/);
      expect(match.playerAccounts).toEqual([
        { playerId: 'player-a', accountId: 'account-a' },
        { playerId: 'player-b', accountId: 'account-b' },
      ]);

      return Promise.resolve({
        outcome: 'assigned',
        assignment: match,
        eligible: true,
      });
    });

    const result = await service.bindSeat('room01', ' session-a ', 'account-a');

    expect(typeof result?.matchId).toBe('string');
    expect(result).toMatchObject({
      assignmentRevision: 1,
      rulesetVersion: COMPETITIVE_RULESET_VERSION,
      rulesetHash: COMPETITIVE_RULESET_HASH,
      currentTurn: 0,
      status: 'pending',
      playerIds: ['player-a', 'player-b'],
    });
    expect(JSON.stringify(result)).not.toContain('account-a');
    expect(JSON.stringify(result)).not.toContain('session-a');
    expect(JSON.stringify(result)).not.toContain('serverSeed');
    expect(JSON.stringify(result)).not.toContain('playersById');
    expect(repository.bindSeatAndAssign.mock.calls[0]?.[0]).toMatchObject({
      roomCode: 'ROOM01',
      sessionId: 'session-a',
      accountId: 'account-a',
    });
  });

  it.each([
    ['room-not-found', BadRequestException],
    ['seat-not-found', BadRequestException],
    ['inactive-seat', BadRequestException],
    ['seat-account-conflict', ConflictException],
    ['duplicate-account', ConflictException],
  ] as const)('rejects repository outcome %s', async (outcome, errorType) => {
    repository.bindSeatAndAssign.mockResolvedValue({ outcome });

    await expect(
      service.bindSeat('ROOM01', 'session-a', 'account-a'),
    ).rejects.toBeInstanceOf(errorType);
  });

  it('returns null while anonymous or extra active participants keep the room casual', async () => {
    repository.bindSeatAndAssign.mockResolvedValue({
      outcome: 'bound-casual',
      assignment: null,
      eligible: false,
    });

    await expect(
      service.bindSeat('ROOM01', 'session-a', 'account-a'),
    ).resolves.toBeNull();
  });

  it('returns an eligible false conflict without exposing an existing assignment to a third participant', async () => {
    repository.bindSeatAndAssign.mockResolvedValue({
      outcome: 'bound-ineligible',
      assignment: null,
      eligible: false,
    });

    try {
      await service.bindSeat('ROOM01', 'session-c', 'account-c');
      throw new Error('Expected third participant binding to conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        statusCode: 409,
        code: 'POKE_LOUNGE_COMPETITIVE_ASSIGNMENT_INELIGIBLE',
        message: 'Account is not eligible for this competitive assignment',
        eligible: false,
      });
    }
  });

  it('publishes a sanitized competitive projection only after a committed action', async () => {
    const response = actionProjection();
    const order: string[] = [];
    actionRepository.submit.mockImplementation(() => {
      order.push('transaction-committed');
      return Promise.resolve({
        outcome: 'accepted',
        response,
        room: roomSnapshot(),
        committed: true,
      });
    });
    publisher.publish.mockImplementation(() => {
      order.push('event-published');
      return Promise.resolve();
    });

    await expect(
      service.submitAction({
        roomCode: 'room01',
        matchId: 'match-1',
        accountId: 'account-a',
        assignmentRevision: 1,
        turn: 0,
        clientCommandId: '00000000-0000-4000-8000-000000000001',
        action: { kind: 'move', moveId: 'steady-strike' },
      }),
    ).resolves.toEqual(response);

    expect(publisher.publish.mock.calls[0]?.[0]).toMatchObject({
      type: 'competitive-action-committed',
      snapshot: {
        roomCode: 'ROOM01',
        competitive: response,
      },
    });
    expect(JSON.stringify(publisher.publish.mock.calls)).not.toContain(
      'account-a',
    );
    expect(JSON.stringify(publisher.publish.mock.calls)).not.toContain('seed');
    expect(JSON.stringify(publisher.publish.mock.calls)).not.toContain(
      'playersById',
    );
    expect(order).toEqual(['transaction-committed', 'event-published']);
  });

  it('does not publish replayed receipts or failed transactions', async () => {
    actionRepository.submit.mockResolvedValueOnce({
      outcome: 'replayed',
      response: actionProjection(),
      room: roomSnapshot(),
      committed: false,
    });
    await service.submitAction(actionInput());
    expect(publisher.publish.mock.calls).toHaveLength(0);

    actionRepository.submit.mockRejectedValueOnce(new Error('rollback'));
    await expect(service.submitAction(actionInput())).rejects.toThrow(
      'rollback',
    );
    expect(publisher.publish.mock.calls).toHaveLength(0);
  });

  it.each([
    'actor-not-assigned',
    'assignment-revision-conflict',
    'turn-conflict',
    'command-conflict',
    'actor-turn-conflict',
    'terminal',
    'illegal-action',
  ] as const)('rejects competitive action outcome %s', async (outcome) => {
    actionRepository.submit.mockResolvedValue({ outcome });

    await expect(service.submitAction(actionInput())).rejects.toBeInstanceOf(
      outcome === 'illegal-action' ? BadRequestException : ConflictException,
    );
    expect(publisher.publish.mock.calls).toHaveLength(0);
  });
});

function actionInput() {
  return {
    roomCode: 'ROOM01',
    matchId: 'match-1',
    accountId: 'account-a',
    assignmentRevision: 1,
    turn: 0,
    clientCommandId: '00000000-0000-4000-8000-000000000001',
    action: { kind: 'move' as const, moveId: 'steady-strike' },
  };
}

function actionProjection() {
  return {
    matchId: 'match-1',
    assignmentRevision: 1,
    submittedTurn: 0,
    currentTurn: 0,
    status: 'active' as const,
    playerIds: ['player-a', 'player-b'] as [string, string],
    stateHash: 'a'.repeat(64),
    terminal: null,
  };
}

function roomSnapshot() {
  return {
    roomCode: 'ROOM01',
    status: 'waiting' as const,
    createdAtMs: 0,
    updatedAtMs: 0,
    participants: [],
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
    revision: 1,
    expiresAtMs: 60_000,
  };
}
