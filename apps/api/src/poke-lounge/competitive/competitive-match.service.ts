import { randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
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
import {
  COMPETITIVE_ACTION_REPOSITORY,
  type CompetitiveActionFailure,
  type CompetitiveActionRepository,
} from './competitive-action.repository';
import type { SubmitCompetitiveActionInput } from './competitive-action.types';
import {
  POKE_LOUNGE_ROOM_EVENT_PUBLISHER,
  type PokeLoungeRoomEventPublisher,
} from '../poke-lounge-room-event.publisher';
import { toPokeLoungePublicRoomState } from '../poke-lounge-room-conflict';
import { toCompetitiveProjection } from './competitive-projection.service';

@Injectable()
export class CompetitiveMatchService {
  private readonly logger = new Logger(CompetitiveMatchService.name);

  constructor(
    @Inject(COMPETITIVE_MATCH_REPOSITORY)
    private readonly repository: CompetitiveMatchRepository,
    @Inject(COMPETITIVE_ACTION_REPOSITORY)
    private readonly actionRepository: CompetitiveActionRepository,
    @Inject(POKE_LOUNGE_ROOM_EVENT_PUBLISHER)
    private readonly eventPublisher: PokeLoungeRoomEventPublisher,
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
      createAssignment: createCompetitiveAssignment,
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

    if (!result.assignment) {
      return null;
    }

    if (result.committed) {
      try {
        await this.eventPublisher.publish({
          type: 'competitive-assignment-committed',
          snapshot: {
            ...toPokeLoungePublicRoomState(result.room),
            competitive: result.projection,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to publish committed competitive assignment for ${result.assignment.matchId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return toPublicAssignment(result.assignment);
  }

  async submitAction(input: SubmitCompetitiveActionInput) {
    const result = await this.actionRepository.submit({
      ...input,
      roomCode: input.roomCode.trim().toUpperCase(),
      accountId: input.accountId.trim(),
    });

    if (!('response' in result)) {
      throwActionError(result.outcome);
    }

    if (result.committed) {
      try {
        const snapshot = toPokeLoungePublicRoomState(result.room);
        if (
          !snapshot.competitive &&
          result.response.status !== 'completed' &&
          (snapshot.tournament.activeMatchId === null ||
            snapshot.tournament.activeMatchId ===
              result.response.bracketMatchId)
        ) {
          snapshot.competitive = result.response;
        }
        await this.eventPublisher.publish({
          type: 'competitive-action-committed',
          snapshot,
        });
      } catch (error) {
        this.logger.error(
          `Failed to publish committed competitive action for ${input.matchId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return structuredClone(result.response);
  }
}

function throwActionError(outcome: CompetitiveActionFailure): never {
  if (outcome === 'illegal-action') {
    throw new BadRequestException('Competitive action is illegal');
  }
  if (outcome === 'room-not-found' || outcome === 'match-not-found') {
    throw new BadRequestException('Competitive match not found');
  }

  throw new ConflictException({
    statusCode: 409,
    code: `POKE_LOUNGE_COMPETITIVE_${outcome.replaceAll('-', '_').toUpperCase()}`,
    message: 'Competitive action conflict',
  });
}

export function createCompetitiveAssignment(
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
    terminalEventId: null,
    terminalRoomRevision: null,
    terminalResult: null,
    completedAt: null,
  };
}

function toPublicAssignment(
  assignment: CompetitiveMatchAssignment,
): CompetitiveAssignmentProjection {
  return toCompetitiveProjection(assignment, []);
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
