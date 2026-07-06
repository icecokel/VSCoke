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
export type PokeLoungeMatchStatus = 'pending' | 'completed';
export type PokeLoungeMatchResultReason =
  | 'faint'
  | 'timeout'
  | 'forfeit'
  | 'run'
  | 'capture';

export interface PokeLoungeRoomParticipant {
  sessionId: string;
  playerId: string;
  userId?: string;
  displayName: string;
  role: PokeLoungeParticipantRole;
  ready: boolean;
  connected: boolean;
  joinedAtMs: number;
  leftAtMs?: number;
}

export interface PokeLoungeTournamentMatch {
  matchId: string;
  participantIds: [string, string];
  status: PokeLoungeMatchStatus;
  winnerPlayerId?: string;
  loserPlayerId?: string;
  resultReason?: PokeLoungeMatchResultReason;
  completedAtMs?: number;
}

export interface PokeLoungeFinalStanding {
  playerId: string;
  displayName: string;
  rank: number;
  score: number;
}

export interface PokeLoungeRoomState {
  roomCode: string;
  status: PokeLoungeRoomStatus;
  createdAtMs: number;
  updatedAtMs: number;
  participants: PokeLoungeRoomParticipant[];
  round: {
    index: number;
    phase: PokeLoungeRoundPhase;
    durationMs: number;
    startedAtMs: number | null;
    endsAtMs: number | null;
  };
  tournament: {
    matches: PokeLoungeTournamentMatch[];
    cumulativeScores: Record<string, number>;
  };
  finalStandings: PokeLoungeFinalStanding[];
}

export interface CreatePokeLoungeRoomInput {
  playerId?: string;
  sessionId?: string;
  userId?: string;
  displayName?: string;
  roundDurationMs?: number;
  nowMs?: number;
}

export interface JoinPokeLoungeRoomInput {
  playerId?: string;
  sessionId?: string;
  userId?: string;
  displayName?: string;
  nowMs?: number;
}

export interface SubmitPokeLoungeMatchResultInput {
  reportingPlayerId: string;
  matchId: string;
  winnerPlayerId: string;
  loserPlayerId: string;
  reason: PokeLoungeMatchResultReason;
  nowMs?: number;
}
