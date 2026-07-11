import { randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  createInitialBattleState,
  hashCanonicalState,
} from '@vscoke/poke-lounge-battle';
import {
  COMPETITIVE_MATCH_REPOSITORY,
  type CompetitiveMatchRepository,
  type CompetitiveSeatBindingFailure,
} from './competitive-match.repository';
import type {
  CompetitiveAssignmentCreateContext,
  CompetitiveAssignmentProjection,
  CompetitiveMatchAssignment,
} from './competitive-match.types';

@Injectable()
export class CompetitiveMatchService {
  constructor(
    @Inject(COMPETITIVE_MATCH_REPOSITORY)
    private readonly repository: CompetitiveMatchRepository,
  ) {}

  async bindSeat(
    roomCode: string,
    sessionId: string,
    accountId: string,
  ): Promise<CompetitiveAssignmentProjection | null> {
    const result = await this.repository.bindSeatAndAssign({
      roomCode: roomCode.trim().toUpperCase(),
      sessionId: sessionId.trim(),
      accountId: accountId.trim(),
      createAssignment,
    });

    if (!('assignment' in result)) {
      throwBindingError(result.outcome);
    }

    if (result.outcome === 'bound-ineligible') {
      throw new ConflictException({
        statusCode: 409,
        code: 'POKE_LOUNGE_COMPETITIVE_ASSIGNMENT_INELIGIBLE',
        message: 'Account is not eligible for this competitive assignment',
        eligible: false,
      });
    }

    return result.assignment ? toPublicAssignment(result.assignment) : null;
  }
}

function createAssignment(
  context: CompetitiveAssignmentCreateContext,
): CompetitiveMatchAssignment {
  const initialState = createInitialBattleState(
    context.players.map((player) => player.playerId) as [string, string],
  );
  const initialStateHash = hashCanonicalState(initialState);

  return {
    ...context,
    matchId: randomUUID(),
    playerAccounts: context.players,
    rulesetVersion: COMPETITIVE_RULESET_VERSION,
    rulesetHash: COMPETITIVE_RULESET_HASH,
    serverSeed: randomBytes(32).toString('hex'),
    initialState,
    initialStateHash,
    currentState: structuredClone(initialState),
    currentStateHash: initialStateHash,
    currentTurn: initialState.turn,
    status: 'pending',
    terminalResult: null,
    completedAt: null,
  };
}

function toPublicAssignment(
  assignment: CompetitiveMatchAssignment,
): CompetitiveAssignmentProjection {
  return {
    matchId: assignment.matchId,
    assignmentRevision: assignment.assignmentRevision,
    rulesetVersion: assignment.rulesetVersion,
    rulesetHash: assignment.rulesetHash,
    currentTurn: assignment.currentTurn,
    status: assignment.status,
    playerIds: [
      assignment.initialState.participantIds[0],
      assignment.initialState.participantIds[1],
    ],
  };
}

function throwBindingError(outcome: CompetitiveSeatBindingFailure): never {
  if (outcome === 'seat-account-conflict') {
    throw new ConflictException('Competitive seat is already bound');
  }
  if (outcome === 'duplicate-account') {
    throw new ConflictException('Account already occupies a competitive seat');
  }

  throw new BadRequestException('Competitive seat binding rejected');
}
