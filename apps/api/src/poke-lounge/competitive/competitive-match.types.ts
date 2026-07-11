import type {
  CanonicalBattleState,
  CanonicalTerminalResult,
} from '@vscoke/poke-lounge-battle';
import type { PublicCompetitiveBattleState } from './competitive-action.types';

export type CompetitiveMatchStatus = 'pending' | 'active' | 'completed';

export interface CompetitivePlayerAccount {
  playerId: string;
  accountId: string;
}

export interface CompetitiveMatchAssignment {
  roomId: string;
  roomCode: string;
  matchId: string;
  assignmentRevision: number;
  playerAccounts: [CompetitivePlayerAccount, CompetitivePlayerAccount];
  rulesetVersion: number;
  rulesetHash: string;
  serverSeed: string;
  initialState: CanonicalBattleState;
  initialStateHash: string;
  currentState: CanonicalBattleState;
  currentStateHash: string;
  currentTurn: number;
  status: CompetitiveMatchStatus;
  terminalResult: CanonicalTerminalResult | null;
  completedAt: Date | null;
}

export interface CompetitiveAssignmentProjection {
  matchId: string;
  assignmentRevision: number;
  rulesetVersion: number;
  rulesetHash: string;
  currentTurn: number;
  status: CompetitiveMatchStatus;
  playerIds: [string, string];
  currentState: PublicCompetitiveBattleState;
  stateHash: string;
  submittedPlayerIds: string[];
  terminal: CanonicalTerminalResult | null;
}

export interface CompetitiveAssignmentCreateContext {
  roomId: string;
  roomCode: string;
  assignmentRevision: number;
  players: [CompetitivePlayerAccount, CompetitivePlayerAccount];
}
