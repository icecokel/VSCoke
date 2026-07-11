import type { PokeLoungeRoomState } from '../poke-lounge-room.types';
import type {
  CompetitiveAssignmentCreateContext,
  CompetitiveMatchAssignment,
  CompetitivePlayerAccount,
} from './competitive-match.types';

export const COMPETITIVE_MATCH_REPOSITORY = Symbol(
  'COMPETITIVE_MATCH_REPOSITORY',
);

export interface CompetitiveSeatRecord extends CompetitivePlayerAccount {
  sessionId: string;
}

export type CompetitiveSeatBindingFailure =
  | 'room-not-found'
  | 'seat-not-found'
  | 'inactive-seat'
  | 'seat-account-conflict'
  | 'duplicate-account';

export type CompetitiveSeatBindingResult =
  | { outcome: CompetitiveSeatBindingFailure }
  | {
      outcome: 'bound-casual' | 'bound-ineligible';
      assignment: null;
      eligible: false;
    }
  | {
      outcome: 'assigned' | 'already-assigned';
      assignment: CompetitiveMatchAssignment;
      eligible: true;
    };

export interface CompetitiveMatchRepository {
  bindSeatAndAssign(input: {
    roomCode: string;
    sessionId: string;
    accountId: string;
    createAssignment: (
      context: CompetitiveAssignmentCreateContext,
    ) => CompetitiveMatchAssignment;
  }): Promise<CompetitiveSeatBindingResult>;
  findAssignmentForParticipant(input: {
    roomCode: string;
    playerId: string;
    accountId: string;
  }): Promise<CompetitiveMatchAssignment | null>;
}

export function isCompetitiveAssignmentMember(
  assignment: Pick<CompetitiveMatchAssignment, 'playerAccounts'>,
  identity: CompetitivePlayerAccount,
): boolean {
  return assignment.playerAccounts.some(
    (member) =>
      member.playerId === identity.playerId &&
      member.accountId === identity.accountId,
  );
}

export type CompetitiveSeatBindingPlan =
  | { outcome: Exclude<CompetitiveSeatBindingFailure, 'room-not-found'> }
  | {
      outcome: 'bind' | 'already-bound';
      seat: CompetitiveSeatRecord;
      assignmentPlayers:
        | [CompetitivePlayerAccount, CompetitivePlayerAccount]
        | null;
    };

export function planCompetitiveSeatBinding(input: {
  room: PokeLoungeRoomState;
  seats: readonly CompetitiveSeatRecord[];
  sessionId: string;
  accountId: string;
}): CompetitiveSeatBindingPlan {
  const participant = input.room.participants.find(
    (candidate) => candidate.sessionId === input.sessionId,
  );

  if (!participant) {
    return { outcome: 'seat-not-found' };
  }
  if (participant.role !== 'participant' || !participant.connected) {
    return { outcome: 'inactive-seat' };
  }

  const existingSeat = input.seats.find(
    (seat) =>
      seat.sessionId === input.sessionId ||
      seat.playerId === participant.playerId,
  );
  if (existingSeat && existingSeat.accountId !== input.accountId) {
    return { outcome: 'seat-account-conflict' };
  }
  if (
    input.seats.some(
      (seat) =>
        seat.accountId === input.accountId &&
        seat.playerId !== participant.playerId,
    )
  ) {
    return { outcome: 'duplicate-account' };
  }

  const seat: CompetitiveSeatRecord = existingSeat ?? {
    sessionId: input.sessionId,
    playerId: participant.playerId,
    accountId: input.accountId,
  };
  const resultingSeats = existingSeat
    ? [...input.seats]
    : [...input.seats, seat];
  const activeParticipants = input.room.participants.filter(
    (candidate) => candidate.role === 'participant' && candidate.connected,
  );
  const assignmentPlayers =
    activeParticipants.length === 2 &&
    resultingSeats.length === 2 &&
    activeParticipants.every((candidate) =>
      resultingSeats.some((bound) => bound.playerId === candidate.playerId),
    )
      ? (resultingSeats
          .map(({ playerId, accountId }) => ({ playerId, accountId }))
          .sort((left, right) =>
            left.playerId.localeCompare(right.playerId),
          ) as [CompetitivePlayerAccount, CompetitivePlayerAccount])
      : null;

  return {
    outcome: existingSeat ? 'already-bound' : 'bind',
    seat,
    assignmentPlayers,
  };
}
