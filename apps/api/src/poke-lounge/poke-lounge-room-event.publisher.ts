import { Injectable } from '@nestjs/common';
import type { PokeLoungeRoomSnapshot } from './poke-lounge-room.repository';

export const POKE_LOUNGE_ROOM_EVENT_PUBLISHER = Symbol(
  'POKE_LOUNGE_ROOM_EVENT_PUBLISHER',
);

export interface PokeLoungeRoomCommittedEvent {
  type: 'room-created' | 'room-updated' | 'room-clock-advanced';
  snapshot: PokeLoungeRoomSnapshot;
}

export interface PokeLoungeRoomEventPublisher {
  publish(event: PokeLoungeRoomCommittedEvent): Promise<void>;
}

@Injectable()
export class NoopPokeLoungeRoomEventPublisher implements PokeLoungeRoomEventPublisher {
  async publish(): Promise<void> {}
}
