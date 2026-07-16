import { OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { getCorsOptions } from '../common/utils/cors.util';
import { PokeLoungeRoomEventsService } from './poke-lounge-room-events.service';
import { PokeLoungeRoomService } from './poke-lounge-room.service';

const MAX_SUBSCRIPTION_IDENTITY_LENGTH = 256;
const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;
const SUBSCRIPTION_ERROR = {
  code: 'POKE_LOUNGE_SUBSCRIPTION_REJECTED',
  message: 'Poke Lounge room subscription rejected',
} as const;

type PokeLoungeRoomSubscription = {
  roomCode: string;
  playerId: string;
  sessionId: string;
  afterRevision?: number;
};

type PokeLoungeSocketData = {
  pokeLoungeRoomName?: string;
  pokeLoungePlayerId?: string;
};

@WebSocketGateway({
  namespace: '/poke-lounge',
  cors: getCorsOptions(process.env.CORS_ORIGINS),
})
export class PokeLoungeGateway implements OnGatewayInit, OnModuleDestroy {
  @WebSocketServer()
  private server!: Namespace;

  private unsubscribeFromRoomEvents: (() => void) | null = null;

  constructor(
    private readonly roomService: PokeLoungeRoomService,
    private readonly roomEvents: PokeLoungeRoomEventsService,
  ) {}

  afterInit(server: Namespace): void {
    this.server = server;
    this.unsubscribeFromRoomEvents?.();
    this.unsubscribeFromRoomEvents = this.roomEvents.subscribe((event) => {
      if (event.type !== 'room.snapshot') {
        return;
      }

      this.server
        .to(roomName(event.room.roomCode))
        .emit('room.snapshot', { room: event.room });
    });
  }

  onModuleDestroy(): void {
    this.unsubscribeFromRoomEvents?.();
    this.unsubscribeFromRoomEvents = null;
  }

  @SubscribeMessage('room.subscribe')
  async subscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() input: unknown,
  ): Promise<void> {
    const subscription = parseSubscription(input);
    let joinedRoomName: string | null = null;

    if (!subscription) {
      rejectSubscription(socket);
      return;
    }

    try {
      const socketData = socket.data as PokeLoungeSocketData;
      const room = await this.roomService.authorizeSubscription(
        subscription.roomCode,
        subscription.playerId,
        subscription.sessionId,
        subscription.afterRevision,
      );
      const nextRoomName = roomName(room.roomCode);
      const previousRoomName = socketData.pokeLoungeRoomName;

      if (
        previousRoomName &&
        (previousRoomName !== nextRoomName ||
          (subscription.afterRevision !== undefined &&
            room.revision < subscription.afterRevision))
      ) {
        await socket.leave(previousRoomName);
        delete socketData.pokeLoungeRoomName;
        delete socketData.pokeLoungePlayerId;
      }

      if (
        subscription.afterRevision !== undefined &&
        room.revision < subscription.afterRevision
      ) {
        socket.emit('room.revision-conflict', { room });
        return;
      }

      await socket.join(nextRoomName);
      joinedRoomName = nextRoomName;
      const committedRoom = await this.roomService.authorizeSubscription(
        subscription.roomCode,
        subscription.playerId,
        subscription.sessionId,
        subscription.afterRevision,
      );
      socketData.pokeLoungeRoomName = nextRoomName;
      socketData.pokeLoungePlayerId = subscription.playerId;
      socket.emit('room.snapshot', { room: committedRoom });
    } catch {
      if (joinedRoomName) {
        try {
          await socket.leave(joinedRoomName);
        } catch {
          // The generic rejection below must still reach the client.
        }
      }
      const socketData = socket.data as PokeLoungeSocketData;
      delete socketData.pokeLoungeRoomName;
      delete socketData.pokeLoungePlayerId;
      rejectSubscription(socket);
    }
  }
}

function parseSubscription(input: unknown): PokeLoungeRoomSubscription | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const record = input as Record<string, unknown>;
  const roomCode = normalizeBoundedString(record.roomCode)?.toUpperCase();
  const playerId = normalizeBoundedString(record.playerId);
  const sessionId = normalizeBoundedString(record.sessionId);
  const afterRevision = record.afterRevision;

  if (
    !roomCode ||
    !ROOM_CODE_PATTERN.test(roomCode) ||
    !playerId ||
    !sessionId ||
    (afterRevision !== undefined &&
      (!Number.isSafeInteger(afterRevision) || (afterRevision as number) < 0))
  ) {
    return null;
  }

  return {
    roomCode,
    playerId,
    sessionId,
    ...(afterRevision === undefined
      ? {}
      : { afterRevision: afterRevision as number }),
  };
}

function normalizeBoundedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_SUBSCRIPTION_IDENTITY_LENGTH
  ) {
    return null;
  }

  return normalized;
}

function roomName(roomCode: string): string {
  return `room:${roomCode}`;
}

function rejectSubscription(socket: Socket): void {
  socket.emit('room.subscription-error', SUBSCRIPTION_ERROR);
}
