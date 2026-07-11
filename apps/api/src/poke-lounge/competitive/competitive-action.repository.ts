import type { PokeLoungeRoomSnapshot } from '../poke-lounge-room.repository';
import type {
  CompetitiveActionProjection,
  SubmitCompetitiveActionInput,
} from './competitive-action.types';

export const COMPETITIVE_ACTION_REPOSITORY = Symbol(
  'COMPETITIVE_ACTION_REPOSITORY',
);

export type CompetitiveActionFailure =
  | 'room-not-found'
  | 'match-not-found'
  | 'actor-not-assigned'
  | 'assignment-revision-conflict'
  | 'turn-conflict'
  | 'command-conflict'
  | 'actor-turn-conflict'
  | 'terminal'
  | 'illegal-action';

export type CompetitiveActionResult =
  | { outcome: CompetitiveActionFailure }
  | {
      outcome: 'accepted' | 'replayed';
      response: CompetitiveActionProjection;
      room: PokeLoungeRoomSnapshot;
      committed: boolean;
    };

export interface CompetitiveActionRepository {
  submit(input: SubmitCompetitiveActionInput): Promise<CompetitiveActionResult>;
}
