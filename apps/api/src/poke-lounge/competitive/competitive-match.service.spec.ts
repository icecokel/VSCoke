import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  createInitialBattleState,
  hashCanonicalState,
} from '@vscoke/poke-lounge-battle';
import type { CompetitiveMatchRepository } from './competitive-match.repository';
import { CompetitiveMatchService } from './competitive-match.service';

describe('CompetitiveMatchService', () => {
  let repository: jest.Mocked<CompetitiveMatchRepository>;
  let service: CompetitiveMatchService;

  beforeEach(() => {
    repository = {
      bindSeatAndAssign: jest.fn(),
      findAssignmentForParticipant: jest.fn(),
    };
    service = new CompetitiveMatchService(repository);
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
});
