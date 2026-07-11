import type {
  CanonicalBattleStatus,
  CanonicalCompetitiveAction,
  CanonicalTerminalResult,
} from '@vscoke/poke-lounge-battle';
import type { CompetitiveMatchStatus } from './competitive-match.types';

export type CompetitiveActionReceiptStatus = 'pending' | 'resolved';

export interface PublicCompetitiveBattleState {
  rulesetVersion: 1;
  turn: number;
  participantIds: readonly [string, string];
  playersById: Readonly<
    Record<
      string,
      {
        playerId: string;
        activeSlotIndex: number;
        team: readonly {
          speciesId: string;
          maxHp: number;
          currentHp: number;
          status: CanonicalBattleStatus;
          moves: readonly { moveId: string; pp: number }[];
        }[];
      }
    >
  >;
  terminal: CanonicalTerminalResult | null;
}

export interface CompetitiveActionProjection {
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

export interface SubmitCompetitiveActionInput {
  roomCode: string;
  matchId: string;
  accountId: string;
  assignmentRevision: number;
  turn: number;
  clientCommandId: string;
  action: CanonicalCompetitiveAction;
}
