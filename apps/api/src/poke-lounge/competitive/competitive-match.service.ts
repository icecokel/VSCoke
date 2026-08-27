import { randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  createInitialBattleState,
  hashCanonicalState,
} from '@vscoke/poke-lounge-battle';
import {
  COMPETITIVE_MATCH_REPOSITORY,
  createSessionCompetitiveAccountId,
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
  COMPETITIVE_TURN_DEADLINE_MS,
  type CompetitiveActionFailure,
  type CompetitiveActionRepository,
} from './competitive-action.repository';
import type {
  CompetitiveActionProjection,
  SubmitCompetitiveActionInput,
} from './competitive-action.types';
import {
  POKE_LOUNGE_ROOM_EVENT_PUBLISHER,
  type PokeLoungeRoomEventPublisher,
} from '../poke-lounge-room-event.publisher';
import { toPokeLoungePublicRoomState } from '../poke-lounge-room-conflict';
import type { PokeLoungeRoomSnapshot } from '../poke-lounge-room.repository';
import { toCompetitiveProjection } from './competitive-projection.service';

@Injectable()
export class CompetitiveMatchService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CompetitiveMatchService.name);
  private readonly turnTimeouts = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private unsubscribeFromRoomSnapshots: (() => void) | null = null;

  constructor(
    @Inject(COMPETITIVE_MATCH_REPOSITORY)
    private readonly repository: CompetitiveMatchRepository,
    @Inject(COMPETITIVE_ACTION_REPOSITORY)
    private readonly actionRepository: CompetitiveActionRepository,
    @Inject(POKE_LOUNGE_ROOM_EVENT_PUBLISHER)
    private readonly eventPublisher: PokeLoungeRoomEventPublisher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.unsubscribeFromRoomSnapshots?.();
    this.unsubscribeFromRoomSnapshots =
      this.eventPublisher.subscribeSnapshots?.((snapshot) => {
        if (snapshot.competitive) {
          this.ensureTurnTimeout(
            snapshot.roomCode,
            snapshot.competitive,
            snapshot.updatedAtMs,
          );
        }
      }) ?? null;

    if (!this.actionRepository.findPendingTurns) {
      return;
    }

    try {
      const pendingTurns = await this.actionRepository.findPendingTurns();
      for (const pending of pendingTurns) {
        this.scheduleTurnTimeout(
          pending.roomCode,
          pending.matchId,
          pending.turn,
          pending.deadlineMs,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to restore competitive turn deadlines',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  onModuleDestroy(): void {
    this.unsubscribeFromRoomSnapshots?.();
    this.unsubscribeFromRoomSnapshots = null;
    for (const timeout of this.turnTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.turnTimeouts.clear();
  }

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

    this.ensureTurnTimeout(
      result.assignment.roomCode,
      toPublicAssignment(result.assignment),
      result.assignment.turnStartedAtMs,
    );

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

    const timeoutKey = competitiveTurnTimeoutKey(
      input.roomCode,
      input.matchId,
      input.turn,
    );
    if (
      result.committed &&
      (result.response.status === 'completed' ||
        result.response.currentTurn !== input.turn)
    ) {
      this.clearTurnTimeout(timeoutKey);
    }

    if (result.committed) {
      await this.publishCommittedAction(
        input.matchId,
        result.response,
        result.room,
      );
      if (result.room.competitive) {
        this.ensureTurnTimeout(
          result.room.roomCode,
          result.room.competitive,
          result.room.updatedAtMs,
        );
      }
    }

    return structuredClone(result.response);
  }

  submitSessionAction(
    input: Omit<SubmitCompetitiveActionInput, 'accountId'> & {
      sessionId: string;
    },
  ) {
    const { sessionId, ...actionInput } = input;
    return this.submitAction({
      ...actionInput,
      accountId: createSessionCompetitiveAccountId(input.roomCode, sessionId),
    });
  }

  private scheduleTurnTimeout(
    roomCode: string,
    matchId: string,
    turn: number,
    deadlineMs: number,
  ): void {
    const key = competitiveTurnTimeoutKey(roomCode, matchId, turn);
    this.clearTurnTimeout(key);
    const timeout = setTimeout(
      () => {
        this.turnTimeouts.delete(key);
        void this.expireTurn(roomCode, matchId, turn);
      },
      Math.max(0, deadlineMs - Date.now()),
    );
    timeout.unref();
    this.turnTimeouts.set(key, timeout);
  }

  private ensureTurnTimeout(
    roomCode: string,
    projection: CompetitiveActionProjection,
    turnStartedAtMs: number,
  ): void {
    if (projection.status === 'completed') {
      return;
    }
    const key = competitiveTurnTimeoutKey(
      roomCode,
      projection.matchId,
      projection.currentTurn,
    );
    if (!this.turnTimeouts.has(key)) {
      this.scheduleTurnTimeout(
        roomCode,
        projection.matchId,
        projection.currentTurn,
        turnStartedAtMs + COMPETITIVE_TURN_DEADLINE_MS,
      );
    }
  }

  private clearTurnTimeout(key: string): void {
    const timeout = this.turnTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.turnTimeouts.delete(key);
    }
  }

  private async expireTurn(
    roomCode: string,
    matchId: string,
    turn: number,
  ): Promise<void> {
    try {
      const result = await this.actionRepository.expirePendingTurn({
        roomCode,
        matchId,
        turn,
        nowMs: Date.now(),
      });
      if (result.outcome === 'not-due') {
        this.scheduleTurnTimeout(roomCode, matchId, turn, result.retryAtMs);
      } else if (result.outcome === 'resolved') {
        await this.publishCommittedAction(
          matchId,
          result.response,
          result.room,
        );
        if (result.room.competitive) {
          this.ensureTurnTimeout(
            result.room.roomCode,
            result.room.competitive,
            result.room.updatedAtMs,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to expire competitive turn for ${matchId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async publishCommittedAction(
    matchId: string,
    response: CompetitiveActionProjection,
    room: PokeLoungeRoomSnapshot,
  ): Promise<void> {
    try {
      const snapshot = toPokeLoungePublicRoomState(room);
      if (
        !snapshot.competitive &&
        response.status !== 'completed' &&
        (snapshot.tournament.activeMatchId === null ||
          snapshot.tournament.activeMatchId === response.bracketMatchId)
      ) {
        snapshot.competitive = response;
      }
      await this.eventPublisher.publish({
        type: 'competitive-action-committed',
        snapshot,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish committed competitive action for ${matchId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

function competitiveTurnTimeoutKey(
  roomCode: string,
  matchId: string,
  turn: number,
): string {
  return `${roomCode.trim().toUpperCase()}:${matchId}:${turn}`;
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
    context.players.map((player) => ({
      playerId: player.playerId,
      party: context.parties[player.playerId],
    })) as [
      { playerId: string; party: (typeof context.parties)[string] },
      { playerId: string; party: (typeof context.parties)[string] },
    ],
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
    turnStartedAtMs: context.turnStartedAtMs ?? Date.now(),
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
