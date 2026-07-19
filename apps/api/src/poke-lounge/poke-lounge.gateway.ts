import { OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
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
const PARTICIPANT_DISCONNECT_GRACE_MS = 15_000;
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
  pokeLoungeSessionId?: string;
  pokeLoungePresenceKey?: string;
};

type PendingPresenceExpiry = {
  controller: AbortController;
  timer: ReturnType<typeof setTimeout>;
};

type PresenceGroup = {
  controller: AbortController;
  epoch: string;
};

@WebSocketGateway({
  namespace: '/poke-lounge',
  cors: getCorsOptions(process.env.CORS_ORIGINS),
})
export class PokeLoungeGateway
  implements OnGatewayInit, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  private server!: Namespace;

  private unsubscribeFromRoomEvents: (() => void) | null = null;
  private readonly socketsByPresence = new Map<string, Set<Socket>>();
  private readonly disconnectTimers = new Map<string, PendingPresenceExpiry>();
  private readonly presenceGroups = new Map<string, PresenceGroup>();

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
    for (const pending of this.disconnectTimers.values()) {
      clearTimeout(pending.timer);
      pending.controller.abort();
    }
    this.disconnectTimers.clear();
    this.socketsByPresence.clear();
    for (const group of this.presenceGroups.values()) {
      group.controller.abort();
    }
    this.presenceGroups.clear();
  }

  handleDisconnect(socket: Socket): void {
    this.unregisterPresence(socket, true);
  }

  @SubscribeMessage('room.subscribe')
  async subscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() input: unknown,
  ): Promise<void> {
    const subscription = parseSubscription(input);
    const socketData = socket.data as PokeLoungeSocketData;
    const previousRoomName = socketData.pokeLoungeRoomName ?? null;
    let attemptedRoomName: string | null = null;

    if (!subscription) {
      rejectSubscription(socket);
      return;
    }

    try {
      const room = await this.roomService.authorizeSubscription(
        subscription.roomCode,
        subscription.playerId,
        subscription.sessionId,
        subscription.afterRevision,
      );
      const nextRoomName = roomName(room.roomCode);

      if (
        previousRoomName &&
        (previousRoomName !== nextRoomName ||
          (subscription.afterRevision !== undefined &&
            room.revision < subscription.afterRevision))
      ) {
        this.unregisterPresence(socket, true);
        await socket.leave(previousRoomName);
        delete socketData.pokeLoungeRoomName;
        delete socketData.pokeLoungePlayerId;
        delete socketData.pokeLoungeSessionId;
        delete socketData.pokeLoungePresenceKey;
      }

      if (
        subscription.afterRevision !== undefined &&
        room.revision < subscription.afterRevision
      ) {
        socket.emit('room.revision-conflict', { room });
        return;
      }

      // Register before replacing the stored identity so an identity switch
      // expires the participant that actually owned the previous presence.
      // Registration also makes a disconnect during room join or durable
      // acknowledgement observable by handleDisconnect.
      const presenceGroup = this.registerPresence(socket, subscription);
      socketData.pokeLoungeRoomName = nextRoomName;
      socketData.pokeLoungePlayerId = subscription.playerId;
      socketData.pokeLoungeSessionId = subscription.sessionId;
      attemptedRoomName = nextRoomName;
      await socket.join(nextRoomName);
      if (socket.connected === false) {
        throw new Error('Socket disconnected before room subscription');
      }
      const committedRoom =
        await this.roomService.acknowledgeParticipantPresence(
          subscription.roomCode,
          subscription.playerId,
          subscription.sessionId,
          subscription.afterRevision,
          presenceGroup.epoch,
          presenceGroup.controller.signal,
        );
      socket.emit('room.snapshot', { room: committedRoom });
    } catch {
      for (const roomNameToLeave of new Set(
        [attemptedRoomName, previousRoomName].filter(
          (value): value is string => value !== null,
        ),
      )) {
        try {
          await socket.leave(roomNameToLeave);
        } catch {
          // The generic rejection below must still reach the client.
        }
      }
      this.unregisterPresence(socket, true);
      delete socketData.pokeLoungeRoomName;
      delete socketData.pokeLoungePlayerId;
      delete socketData.pokeLoungeSessionId;
      delete socketData.pokeLoungePresenceKey;
      rejectSubscription(socket);
    }
  }

  private registerPresence(
    socket: Socket,
    subscription: PokeLoungeRoomSubscription,
  ): PresenceGroup {
    const socketData = socket.data as PokeLoungeSocketData;
    const key = presenceKey(subscription);
    if (socketData.pokeLoungePresenceKey !== key) {
      this.unregisterPresence(socket, true);
    }

    const existingSockets = this.socketsByPresence.get(key);
    let presenceGroup = this.presenceGroups.get(key);
    if (
      !presenceGroup ||
      presenceGroup.controller.signal.aborted ||
      !existingSockets ||
      existingSockets.size === 0
    ) {
      presenceGroup?.controller.abort();
      presenceGroup = {
        controller: new AbortController(),
        epoch: randomUUID(),
      };
      this.presenceGroups.set(key, presenceGroup);
    }

    const sockets = existingSockets ?? new Set<Socket>();
    sockets.add(socket);
    this.socketsByPresence.set(key, sockets);
    socketData.pokeLoungePresenceKey = key;
    const pendingDisconnect = this.disconnectTimers.get(key);
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect.timer);
      pendingDisconnect.controller.abort();
      this.disconnectTimers.delete(key);
    }
    return presenceGroup;
  }

  private unregisterPresence(socket: Socket, scheduleExpiry: boolean): void {
    const socketData = socket.data as PokeLoungeSocketData;
    const key = socketData.pokeLoungePresenceKey;
    if (!key) {
      return;
    }

    const sockets = this.socketsByPresence.get(key);
    sockets?.delete(socket);
    delete socketData.pokeLoungePresenceKey;
    if (sockets && sockets.size > 0) {
      return;
    }

    this.socketsByPresence.delete(key);
    const presenceGroup = this.presenceGroups.get(key);
    presenceGroup?.controller.abort();
    if (!scheduleExpiry || this.disconnectTimers.has(key)) {
      if (!scheduleExpiry) {
        this.presenceGroups.delete(key);
      }
      return;
    }

    const roomCode = socketData.pokeLoungeRoomName?.replace(/^room:/, '');
    const playerId = socketData.pokeLoungePlayerId;
    const sessionId = socketData.pokeLoungeSessionId;
    if (!roomCode || !playerId || !sessionId) {
      this.presenceGroups.delete(key);
      return;
    }
    if (!presenceGroup) {
      return;
    }
    const presenceEpoch = presenceGroup.epoch;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      const pending = this.disconnectTimers.get(key);
      if (!pending || pending.timer !== timer) {
        return;
      }
      if (
        (this.socketsByPresence.get(key)?.size ?? 0) > 0 ||
        this.presenceGroups.get(key)?.epoch !== presenceEpoch
      ) {
        this.disconnectTimers.delete(key);
        controller.abort();
        return;
      }
      void this.roomService
        .expireParticipantPresence(
          roomCode,
          playerId,
          sessionId,
          undefined,
          controller.signal,
        )
        .catch(() => undefined)
        .finally(() => {
          const current = this.disconnectTimers.get(key);
          if (current?.timer === timer) {
            this.disconnectTimers.delete(key);
          }
          if (
            (this.socketsByPresence.get(key)?.size ?? 0) === 0 &&
            this.presenceGroups.get(key)?.epoch === presenceEpoch
          ) {
            this.presenceGroups.delete(key);
          }
        });
    }, PARTICIPANT_DISCONNECT_GRACE_MS);
    timer.unref();
    this.disconnectTimers.set(key, { controller, timer });
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

function presenceKey(subscription: PokeLoungeRoomSubscription): string {
  return JSON.stringify([
    subscription.roomCode,
    subscription.playerId,
    subscription.sessionId,
  ]);
}

function rejectSubscription(socket: Socket): void {
  socket.emit('room.subscription-error', SUBSCRIPTION_ERROR);
}
