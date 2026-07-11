import { Injectable } from '@nestjs/common';
import type {
  PokeLoungeRoomCommittedEvent,
  PokeLoungeRoomEventPublisher,
} from './poke-lounge-room-event.publisher';
import type { PokeLoungePublicRoomState } from './poke-lounge-room.types';

export type PokeLoungeRoomTransportEvent =
  | { type: 'room.snapshot'; room: PokeLoungePublicRoomState }
  | { type: 'room.revision-conflict'; room: PokeLoungePublicRoomState };

type PokeLoungeRoomTransportListener = (
  event: PokeLoungeRoomTransportEvent,
) => void;

@Injectable()
export class PokeLoungeRoomEventsService implements PokeLoungeRoomEventPublisher {
  private readonly listeners = new Set<PokeLoungeRoomTransportListener>();

  subscribe(listener: PokeLoungeRoomTransportListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(event: PokeLoungeRoomCommittedEvent): Promise<void> {
    this.publishCommitted(event.snapshot);
    return Promise.resolve();
  }

  publishCommitted(room: PokeLoungePublicRoomState): void {
    for (const listener of this.listeners) {
      listener({ type: 'room.snapshot', room: structuredClone(room) });
    }
  }
}
