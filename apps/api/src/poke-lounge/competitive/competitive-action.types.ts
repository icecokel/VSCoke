import type {
  CanonicalCompetitiveAction,
  CanonicalTerminalResult,
} from '@vscoke/poke-lounge-battle';
import type { CompetitiveMatchStatus } from './competitive-match.types';

export type CompetitiveActionReceiptStatus = 'pending' | 'resolved';

export interface CompetitiveActionProjection {
  matchId: string;
  assignmentRevision: number;
  submittedTurn: number;
  currentTurn: number;
  status: CompetitiveMatchStatus;
  playerIds: [string, string];
  stateHash: string;
  terminal: CanonicalTerminalResult | null;
}

export interface SubmitCompetitiveActionInput {
  roomCode: string;
  matchId: string;
  accountId: string;
  assignmentRevision: number;
  turn: number;
  clientCommandId: string;
  action: CanonicalCompetitiveAction;
}
