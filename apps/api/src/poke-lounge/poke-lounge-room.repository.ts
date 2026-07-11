import type { PokeLoungeRoomState } from './poke-lounge-room.types';
import type { CompetitiveActionProjection } from './competitive/competitive-action.types';

export const POKE_LOUNGE_ROOM_REPOSITORY = Symbol(
  'POKE_LOUNGE_ROOM_REPOSITORY',
);

export type PokeLoungeRoomSnapshot = PokeLoungeRoomState & {
  revision: number;
  expiresAtMs: number;
  competitive?: CompetitiveActionProjection;
};

export type PokeLoungeRepositoryResult = {
  snapshot: PokeLoungeRoomSnapshot;
  outcome:
    | 'committed'
    | 'replayed'
    | 'revision-conflict'
    | 'idempotency-conflict';
  committedChange: boolean;
};

export type PokeLoungeCreateResult =
  | PokeLoungeRepositoryResult
  | { outcome: 'capacity-reached' | 'room-code-collision' };

export interface PokeLoungeRoomRepository {
  create(input: {
    room: PokeLoungeRoomSnapshot;
    actorPlayerId: string;
    idempotencyKey: string;
    requestHash: string;
    nowMs: number;
  }): Promise<PokeLoungeCreateResult>;
  getAndAdvance(
    roomCode: string,
    nowMs: number,
  ): Promise<{
    snapshot: PokeLoungeRoomSnapshot | null;
    committedChange: boolean;
  }>;
  mutate(input: {
    roomCode: string;
    actorPlayerId: string;
    idempotencyKey: string;
    requestHash: string;
    expectedRevision: number;
    nowMs: number;
    apply: (room: PokeLoungeRoomSnapshot) => PokeLoungeRoomSnapshot;
  }): Promise<PokeLoungeRepositoryResult | null>;
  purgeExpired(nowMs: number): Promise<number>;
}
