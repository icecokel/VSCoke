export type PokeLoungeParticipantRole = 'participant' | 'spectator';
export type PokeLoungeRoomStatus =
  | 'waiting'
  | 'round-started'
  | 'tournament'
  | 'completed'
  | 'closed';
export type PokeLoungeRoundPhase =
  | 'waiting'
  | 'round-started'
  | 'tournament'
  | 'completed';
export type PokeLoungeMatchStatus = TournamentMatch['status'];
export type PokeLoungeMatchResultReason = TournamentMatchResultReason;
export type PokeLoungeTournamentMatch = TournamentMatch;
export type PokeLoungeActiveMatchAuthority = 'casual' | 'server';
export type PokeLoungeRoomCloseReason =
  | 'legacy-room-restart-required'
  | 'competitive-party-not-ready';

export interface PokeLoungeRoomParticipant {
  sessionId: string;
  playerId: string;
  userId?: string;
  displayName: string;
  role: PokeLoungeParticipantRole;
  ready: boolean;
  connected: boolean;
  presencePendingUntilMs?: number;
  presenceEpoch?: string;
  joinedAtMs: number;
  leftAtMs?: number;
}

export type PokeLoungePublicRoomParticipant = Omit<
  PokeLoungeRoomParticipant,
  'sessionId' | 'userId' | 'presencePendingUntilMs' | 'presenceEpoch'
>;

export interface PokeLoungeFinalStanding {
  playerId: string;
  displayName: string;
  rank: number;
  score: number;
}

export interface PokeLoungePartySnapshot {
  playerId: string;
  displayName?: string;
  activePartySlotIndex?: number;
  party?: PokeLoungePartyPokemonSnapshot[];
  representativePokemon?: {
    speciesId: number;
    name: string;
    level: number;
    currentHp: number;
    maxHp: number;
  };
  updatedAtMs: number;
}

export interface PokeLoungePublicPartySnapshot {
  playerId: string;
  displayName?: string;
  representativePokemon?: {
    speciesId: number;
    level: number;
    currentHp: number;
    maxHp: number;
  };
  partySize: number;
  updatedAtMs: number;
}

export interface PokeLoungePartyPokemonSnapshot {
  slotIndex: number;
  speciesId: number;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  status: 'none' | 'paralyzed' | 'poisoned' | 'burned' | 'fainted';
  moves: Array<{
    moveId: number;
    name: string;
    pp: number;
    maxPp: number;
  }>;
}

export interface PokeLoungeRoomState {
  roomCode: string;
  status: PokeLoungeRoomStatus;
  closeReason?: PokeLoungeRoomCloseReason;
  createdAtMs: number;
  updatedAtMs: number;
  participants: PokeLoungeRoomParticipant[];
  partySnapshots: Record<string, PokeLoungePartySnapshot>;
  round: {
    index: number;
    phase: PokeLoungeRoundPhase;
    durationMs: number;
    startedAtMs: number | null;
    endsAtMs: number | null;
  };
  tournament: {
    version: 2;
    bracket: TournamentBracketState | null;
    activeMatchId: string | null;
    activeMatchAuthority: PokeLoungeActiveMatchAuthority | null;
    cumulativeScores: Record<string, number>;
  };
  finalStandings: PokeLoungeFinalStanding[];
}

export interface CompetitiveTerminalTransition {
  terminalEventId: string;
  terminalRoomRevision: number;
  projection: CompetitiveActionProjection;
}

export type PokeLoungePublicRoomState = Omit<
  PokeLoungeRoomState,
  'participants' | 'partySnapshots'
> & {
  participants: PokeLoungePublicRoomParticipant[];
  partySnapshots: Record<string, PokeLoungePublicPartySnapshot>;
  revision: number;
  expiresAtMs: number;
  competitiveTransitions: CompetitiveTerminalTransition[];
  competitive?: CompetitiveActionProjection;
};

export interface CreatePokeLoungeRoomInput {
  playerId?: string;
  sessionId: string;
  userId?: string;
  displayName?: string;
  roundDurationMs?: number;
  nowMs?: number;
}

export interface JoinPokeLoungeRoomInput {
  playerId?: string;
  sessionId: string;
  userId?: string;
  displayName?: string;
  nowMs?: number;
}

export interface SetPokeLoungeReadyInput {
  playerId: string;
  sessionId?: string;
  ready: boolean;
  nowMs?: number;
}

export interface SubmitPokeLoungeMatchResultInput {
  reportingPlayerId: string;
  reportingSessionId?: string;
  matchId: string;
  winnerPlayerId: string;
  loserPlayerId: string;
  reason: PokeLoungeMatchResultReason;
  nowMs?: number;
}

export interface LeavePokeLoungeRoomInput {
  playerId?: string;
  sessionId?: string;
  nowMs?: number;
}

export interface UpdatePokeLoungePartySnapshotInput {
  playerId: string;
  sessionId: string;
  displayName?: string;
  activePartySlotIndex?: number;
  party?: PokeLoungePartySnapshot['party'];
  representativePokemon?: PokeLoungePartySnapshot['representativePokemon'];
  nowMs?: number;
}
import type {
  TournamentBracketState,
  TournamentMatch,
  TournamentMatchResultReason,
} from '@vscoke/poke-lounge-battle';
import type { CompetitiveActionProjection } from './competitive/competitive-action.types';
