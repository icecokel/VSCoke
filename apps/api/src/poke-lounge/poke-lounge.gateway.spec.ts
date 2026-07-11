import { BadRequestException } from '@nestjs/common';
import type { Namespace, Socket } from 'socket.io';
import { PokeLoungeRoomEventsService } from './poke-lounge-room-events.service';
import type { PokeLoungePublicRoomState } from './poke-lounge-room.types';
import { PokeLoungeGateway } from './poke-lounge.gateway';
import type { PokeLoungeRoomService } from './poke-lounge-room.service';

describe('PokeLoungeGateway', () => {
  let roomService: jest.Mocked<
    Pick<PokeLoungeRoomService, 'authorizeSubscription'>
  >;
  let events: PokeLoungeRoomEventsService;
  let gateway: PokeLoungeGateway;
  let namespaceEmit: jest.Mock;
  let namespaceTo: jest.Mock;

  beforeEach(() => {
    roomService = {
      authorizeSubscription: jest.fn().mockResolvedValue(publicRoom()),
    };
    events = new PokeLoungeRoomEventsService();
    gateway = new PokeLoungeGateway(
      roomService as unknown as PokeLoungeRoomService,
      events,
    );
    namespaceEmit = jest.fn();
    namespaceTo = jest.fn(() => ({ emit: namespaceEmit }));
    gateway.afterInit({ to: namespaceTo } as unknown as Namespace);
  });

  afterEach(() => {
    gateway.onModuleDestroy();
  });

  it('authorizes, normalizes, and sends the same initial revision to two subscribers', async () => {
    const first = socket();
    const second = socket();

    await gateway.subscribe(first.value, {
      roomCode: ' room01 ',
      playerId: ' player-1 ',
      sessionId: ' session-1 ',
      afterRevision: 7,
    });
    await gateway.subscribe(second.value, {
      roomCode: 'ROOM01',
      playerId: 'player-2',
      sessionId: 'session-2',
      afterRevision: 7,
    });

    expect(roomService.authorizeSubscription).toHaveBeenNthCalledWith(
      1,
      'ROOM01',
      'player-1',
      'session-1',
    );
    expect(first.join).toHaveBeenCalledWith('room:ROOM01');
    expect(second.join).toHaveBeenCalledWith('room:ROOM01');
    expect(first.emit).toHaveBeenCalledWith('room.snapshot', {
      room: publicRoom(),
    });
    expect(second.emit).toHaveBeenCalledWith('room.snapshot', {
      room: publicRoom(),
    });
    expect(JSON.stringify(first.emit.mock.calls)).not.toContain('sessionId');
  });

  it('leaves a previous Poke Lounge room before joining the authorized room', async () => {
    const client = socket({ pokeLoungeRoomName: 'room:OLD001' });

    await gateway.subscribe(client.value, validSubscription());

    expect(client.leave).toHaveBeenCalledWith('room:OLD001');
    expect(client.leave.mock.invocationCallOrder[0]).toBeLessThan(
      client.join.mock.invocationCallOrder[0],
    );
  });

  it.each([
    { ...validSubscription(), roomCode: 'SHORT' },
    { ...validSubscription(), playerId: ' ' },
    { ...validSubscription(), sessionId: 'x'.repeat(257) },
    { ...validSubscription(), afterRevision: -1 },
    { ...validSubscription(), afterRevision: Number.MAX_SAFE_INTEGER + 1 },
  ])(
    'rejects malformed subscriptions with one generic error',
    async (input) => {
      const client = socket();

      await gateway.subscribe(client.value, input);

      expect(roomService.authorizeSubscription).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('room.subscription-error', {
        code: 'POKE_LOUNGE_SUBSCRIPTION_REJECTED',
        message: 'Poke Lounge room subscription rejected',
      });
      expect(JSON.stringify(client.emit.mock.calls)).not.toContain('session-1');
      expect(JSON.stringify(client.emit.mock.calls)).not.toContain('ROOM01');
    },
  );

  it('uses the same generic error for unknown participants and wrong sessions', async () => {
    roomService.authorizeSubscription.mockRejectedValue(
      new BadRequestException('Poke Lounge room subscription rejected'),
    );
    const client = socket();

    await gateway.subscribe(client.value, validSubscription());

    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('room.subscription-error', {
      code: 'POKE_LOUNGE_SUBSCRIPTION_REJECTED',
      message: 'Poke Lounge room subscription rejected',
    });
    expect(JSON.stringify(client.emit.mock.calls)).not.toContain('session-1');
    expect(JSON.stringify(client.emit.mock.calls)).not.toContain('ROOM01');
  });

  it('broadcasts only committed public snapshots to the authorized room', async () => {
    const room = publicRoom({ revision: 8 });

    await events.publish({ type: 'room-updated', snapshot: room });

    expect(namespaceTo).toHaveBeenCalledWith('room:ROOM01');
    expect(namespaceEmit).toHaveBeenCalledWith('room.snapshot', {
      room,
    });
    expect(JSON.stringify(namespaceEmit.mock.calls)).not.toContain('sessionId');
  });

  it('reports cursor regression without joining or applying the lower snapshot', async () => {
    roomService.authorizeSubscription.mockResolvedValue(
      publicRoom({ revision: 6 }),
    );
    const client = socket({ pokeLoungeRoomName: 'room:OLD001' });

    await gateway.subscribe(client.value, {
      ...validSubscription(),
      afterRevision: 7,
    });

    expect(client.leave).toHaveBeenCalledWith('room:OLD001');
    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('room.revision-conflict', {
      room: publicRoom({ revision: 6 }),
    });
  });
});

function validSubscription() {
  return {
    roomCode: 'ROOM01',
    playerId: 'player-1',
    sessionId: 'session-1',
    afterRevision: 7,
  };
}

function socket(data: Record<string, unknown> = {}) {
  const join = jest.fn().mockResolvedValue(undefined);
  const leave = jest.fn().mockResolvedValue(undefined);
  const emit = jest.fn();

  return {
    value: { data, join, leave, emit } as unknown as Socket,
    join,
    leave,
    emit,
  };
}

function publicRoom(
  overrides: Partial<PokeLoungePublicRoomState> = {},
): PokeLoungePublicRoomState {
  return {
    roomCode: 'ROOM01',
    status: 'waiting',
    createdAtMs: 0,
    updatedAtMs: 0,
    participants: [
      {
        playerId: 'player-1',
        displayName: 'Player 1',
        role: 'participant',
        ready: false,
        connected: true,
        joinedAtMs: 0,
      },
    ],
    partySnapshots: {},
    round: {
      index: 1,
      phase: 'waiting',
      durationMs: 1000,
      startedAtMs: null,
      endsAtMs: null,
    },
    tournament: { matches: [], cumulativeScores: {} },
    finalStandings: [],
    revision: 7,
    expiresAtMs: 30 * 60_000,
    ...overrides,
  };
}
