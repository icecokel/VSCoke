import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import { PokeLoungeModule } from './../src/poke-lounge/poke-lounge.module';
import { PokeLoungeRoom } from './../src/poke-lounge/entities/poke-lounge-room.entity';
import { POKE_LOUNGE_PENDING_PRESENCE_LEASE_MS } from './../src/poke-lounge/poke-lounge-room-policy';
import type { PokeLoungePublicRoomState } from './../src/poke-lounge/poke-lounge-room.types';
import {
  getPokeLoungeTestTypeOrmOptions,
  truncatePokeLoungeRoomStorage,
} from './support/poke-lounge-test-database';

type ConflictBody = {
  statusCode: number;
  code: string;
  message: string;
  snapshot: PokeLoungePublicRoomState;
};

describe('Poke Lounge PostgreSQL rooms (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let baseUrl: string;
  let sockets: ClientSocket[];

  beforeEach(async () => {
    ({ app, httpServer, dataSource, baseUrl } = await createTestApplication());
    sockets = [];
    await truncatePokeLoungeRoomStorage(dataSource);
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await app.close();
  });

  it('requires valid command headers on every mutating route', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .send(createBody())
      .expect(400);
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .set('X-Idempotency-Key', 'not-a-uuid')
      .set('If-Match-Revision', '0')
      .send(createBody())
      .expect(400);
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .set('X-Idempotency-Key', commandKey(1))
      .set('If-Match-Revision', '1')
      .send(createBody())
      .expect(400);
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .set('X-Idempotency-Key', [commandKey(1), commandKey(2)])
      .set('If-Match-Revision', ['0', '1'])
      .send(createBody())
      .expect(400);

    const created = await createRoom(1);
    const routes = [
      {
        path: `/poke-lounge/rooms/${created.roomCode}/join`,
        body: {
          playerId: 'player-b',
          sessionId: 'session-b',
        },
      },
      {
        path: `/poke-lounge/rooms/${created.roomCode}/ready`,
        body: {
          playerId: 'player-a',
          sessionId: 'session-a',
          ready: true,
        },
      },
      {
        path: `/poke-lounge/rooms/${created.roomCode}/party-snapshot`,
        body: {
          playerId: 'player-a',
          sessionId: 'session-a',
        },
      },
      {
        path: `/poke-lounge/rooms/${created.roomCode}/result`,
        body: {
          reportingPlayerId: 'player-a',
          reportingSessionId: 'session-a',
          matchId: 'round-1-match-1',
          winnerPlayerId: 'player-a',
          loserPlayerId: 'player-b',
          reason: 'faint',
        },
      },
      {
        path: `/poke-lounge/rooms/${created.roomCode}/leave`,
        body: {
          playerId: 'player-a',
          sessionId: 'session-a',
        },
      },
    ];

    for (const route of routes) {
      await request(httpServer).post(route.path).send(route.body).expect(400);
    }
  });

  it('returns revisions and expiry, redacts sessions, and replays exact commands', async () => {
    const body = createBody();
    const earliestExpiryMs = Date.now() + POKE_LOUNGE_PENDING_PRESENCE_LEASE_MS;
    const createdResponse = await request(httpServer)
      .post('/poke-lounge/rooms')
      .set(commandHeaders(1, 0))
      .send(body)
      .expect(201);
    const created = createdResponse.body as PokeLoungePublicRoomState;
    const latestExpiryMs = Date.now() + POKE_LOUNGE_PENDING_PRESENCE_LEASE_MS;

    expect(created).toMatchObject({
      status: 'waiting',
      revision: 0,
    });
    expect(created.expiresAtMs).toBeGreaterThanOrEqual(earliestExpiryMs);
    expect(created.expiresAtMs).toBeLessThanOrEqual(latestExpiryMs);
    expect(JSON.stringify(created)).not.toContain('sessionId');
    expect(JSON.stringify(created)).not.toContain('session-a');

    const replay = await request(httpServer)
      .post('/poke-lounge/rooms')
      .set(commandHeaders(1, 0))
      .send(body)
      .expect(201);

    expect(replay.body).toEqual(created);

    const joinedResponse = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/join`)
      .set(commandHeaders(2, 0))
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        displayName: 'Player B',
      })
      .expect(201);
    const joined = joinedResponse.body as PokeLoungePublicRoomState;

    expect(joined).toMatchObject({ revision: 1 });
    expect(joined.participants).toHaveLength(2);

    const joinedReplay = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/join`)
      .set(commandHeaders(2, 999))
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        displayName: 'Player B',
      })
      .expect(201);

    expect(joinedReplay.body).toEqual(joined);
  });

  it('returns complete redacted snapshots for idempotency and revision conflicts', async () => {
    const created = await createRoom(1);

    const changedPayload = await request(httpServer)
      .post('/poke-lounge/rooms')
      .set(commandHeaders(1, 0))
      .send({ ...createBody(), displayName: 'Changed' })
      .expect(409);
    const changedBody = changedPayload.body as ConflictBody;

    expect(changedBody).toMatchObject({
      statusCode: 409,
      code: 'POKE_LOUNGE_IDEMPOTENCY_CONFLICT',
      snapshot: {
        roomCode: created.roomCode,
        revision: 0,
      },
    });
    expect(typeof changedBody.snapshot.expiresAtMs).toBe('number');
    expect(
      changedBody.snapshot.participants.some(
        (participant) => participant.playerId === 'player-a',
      ),
    ).toBe(true);
    expect(JSON.stringify(changedBody)).not.toContain('sessionId');
    expect(JSON.stringify(changedBody)).not.toContain('session-a');

    const stale = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/join`)
      .set(commandHeaders(2, 99))
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
      })
      .expect(409);
    const staleBody = stale.body as ConflictBody;

    expect(staleBody).toMatchObject({
      statusCode: 409,
      code: 'POKE_LOUNGE_REVISION_CONFLICT',
      message: 'Poke Lounge room revision conflict',
      snapshot: {
        roomCode: created.roomCode,
        revision: 0,
      },
    });
    expect(typeof staleBody.snapshot.expiresAtMs).toBe('number');
    expect(
      staleBody.snapshot.participants.some(
        (participant) => participant.playerId === 'player-a',
      ),
    ).toBe(true);
    expect(JSON.stringify(staleBody)).not.toContain('sessionId');
  });

  it('broadcasts one committed public revision to two authorized subscribers', async () => {
    const created = await createRoom(1);
    const joinedResponse = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/join`)
      .set(commandHeaders(2, created.revision))
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        displayName: 'Player B',
      })
      .expect(201);
    const joined = joinedResponse.body as PokeLoungePublicRoomState;
    const hostSocket = await connectSocket();
    const guestSocket = await connectSocket();
    const hostInitial = waitForSnapshot(hostSocket, joined.revision + 1);

    hostSocket.emit('room.subscribe', {
      roomCode: created.roomCode,
      playerId: 'player-a',
      sessionId: 'session-a',
      afterRevision: joined.revision,
    });
    const hostSubscribed = await hostInitial;
    const latestRevision = hostSubscribed.revision + 1;
    const hostAfterGuest = waitForSnapshot(hostSocket, latestRevision);
    const guestInitial = waitForSnapshot(guestSocket, latestRevision);
    guestSocket.emit('room.subscribe', {
      roomCode: created.roomCode,
      playerId: 'player-b',
      sessionId: 'session-b',
      afterRevision: hostSubscribed.revision,
    });

    const [hostLatest, guestSubscribed] = await Promise.all([
      hostAfterGuest,
      guestInitial,
    ]);
    expect(hostLatest).toEqual(guestSubscribed);

    const nextRevision = guestSubscribed.revision + 1;
    const hostCommitted = waitForSnapshot(hostSocket, nextRevision);
    const guestCommitted = waitForSnapshot(guestSocket, nextRevision);
    await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/party-snapshot`)
      .set(commandHeaders(3, guestSubscribed.revision))
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        displayName: 'Player A',
      })
      .expect(201);

    const [hostRoom, guestRoom] = await Promise.all([
      hostCommitted,
      guestCommitted,
    ]);
    expect(hostRoom).toEqual(guestRoom);
    expect(hostRoom.revision).toBe(nextRevision);
    expect(JSON.stringify(hostRoom)).not.toContain('sessionId');
    expect(JSON.stringify(hostRoom)).not.toContain('session-a');

    const noSnapshot = expectNoSnapshot(hostSocket, 300);
    await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/ready`)
      .set(commandHeaders(4, joined.revision))
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
      })
      .expect(409);
    await noSnapshot;
  });

  it('rejects a wrong subscription session without disclosing room credentials', async () => {
    const created = await createRoom(1);
    const socket = await connectSocket();
    const rejection = waitForSocketEvent<{
      code: string;
      message: string;
    }>(socket, 'room.subscription-error');

    socket.emit('room.subscribe', {
      roomCode: created.roomCode,
      playerId: 'player-a',
      sessionId: 'wrong-session',
      afterRevision: created.revision,
    });

    const error = await rejection;
    expect(error).toEqual({
      code: 'POKE_LOUNGE_SUBSCRIPTION_REJECTED',
      message: 'Poke Lounge room subscription rejected',
    });
    expect(JSON.stringify(error)).not.toContain(created.roomCode);
    expect(JSON.stringify(error)).not.toContain('wrong-session');
  });

  it('keeps HTTP-only ready participants out of the tournament and expires their pending leases', async () => {
    const created = await createRoom(40);
    expect(created.participants).toEqual([
      expect.objectContaining({ playerId: 'player-a', connected: false }),
    ]);
    const joinedResponse = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/join`)
      .set(commandHeaders(41, created.revision))
      .send({ playerId: 'player-b', sessionId: 'session-b' })
      .expect(201);
    const joined = joinedResponse.body as PokeLoungePublicRoomState;
    const hostReadyResponse = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/ready`)
      .set(commandHeaders(42, joined.revision))
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
      })
      .expect(201);
    const hostReady = hostReadyResponse.body as PokeLoungePublicRoomState;
    const bothReadyResponse = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/ready`)
      .set(commandHeaders(43, hostReady.revision))
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        ready: true,
      })
      .expect(201);
    const bothReady = bothReadyResponse.body as PokeLoungePublicRoomState;
    expect(bothReady).toMatchObject({
      status: 'waiting',
      participants: [
        { playerId: 'player-a', ready: true, connected: false },
        { playerId: 'player-b', ready: true, connected: false },
      ],
      tournament: { bracket: null },
    });

    const stored = await dataSource
      .getRepository(PokeLoungeRoom)
      .findOneByOrFail({ roomCode: created.roomCode });
    stored.state.participants.forEach((participant) => {
      participant.presencePendingUntilMs = Date.now() - 1;
    });
    await dataSource.getRepository(PokeLoungeRoom).save(stored);

    const expiredResponse = await request(httpServer)
      .get(`/poke-lounge/rooms/${created.roomCode}`)
      .expect(200);
    expect(expiredResponse.body).toMatchObject({
      status: 'closed',
      revision: bothReady.revision + 1,
      participants: [],
      tournament: { bracket: null },
    });
  });

  it('admits five sequential players before the fixed preparation deadline and supports tournament reconnect', async () => {
    const created = await createRoom(20);
    const joinedSecond = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/join`)
      .set(commandHeaders(21, created.revision))
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
      })
      .expect(201);
    const joinedSecondRoom = joinedSecond.body as PokeLoungePublicRoomState;
    const hostAcknowledged = await acknowledgePendingPresence(
      created.roomCode,
      'player-a',
      'session-a',
      joinedSecondRoom.revision,
    );
    const guestAcknowledged = await acknowledgePendingPresence(
      created.roomCode,
      'player-b',
      'session-b',
      hostAcknowledged.revision,
    );
    const readyHost = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/ready`)
      .set(commandHeaders(22, guestAcknowledged.revision))
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
      })
      .expect(201);
    const readyHostRoom = readyHost.body as PokeLoungePublicRoomState;
    const earliestStartedAtMs = Date.now();
    const started = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/ready`)
      .set(commandHeaders(23, readyHostRoom.revision))
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        ready: true,
      })
      .expect(201);
    const startedRoom = started.body as PokeLoungePublicRoomState;
    const latestStartedAtMs = Date.now();

    expect(startedRoom.status).toBe('round-started');
    expect(startedRoom.round.startedAtMs).toBeGreaterThanOrEqual(
      earliestStartedAtMs,
    );
    expect(startedRoom.round.startedAtMs).toBeLessThanOrEqual(
      latestStartedAtMs,
    );
    expect(startedRoom.round.endsAtMs).toBe(
      startedRoom.round.startedAtMs! + 1000,
    );

    let revision = startedRoom.revision;
    for (const [index, suffix] of ['c', 'd', 'e'].entries()) {
      const joined = await request(httpServer)
        .post(`/poke-lounge/rooms/${created.roomCode}/join`)
        .set(commandHeaders(24 + index * 2, revision))
        .send({
          playerId: `player-${suffix}`,
          sessionId: `session-${suffix}`,
        })
        .expect(201);
      const joinedRoom = joined.body as PokeLoungePublicRoomState;
      expect(joinedRoom).toMatchObject({
        status: 'round-started',
        round: {
          startedAtMs: startedRoom.round.startedAtMs,
          endsAtMs: startedRoom.round.endsAtMs,
        },
      });
      const acknowledged = await acknowledgePendingPresence(
        created.roomCode,
        `player-${suffix}`,
        `session-${suffix}`,
        joinedRoom.revision,
      );
      revision = acknowledged.revision;

      const ready = await request(httpServer)
        .post(`/poke-lounge/rooms/${created.roomCode}/ready`)
        .set(commandHeaders(25 + index * 2, revision))
        .send({
          playerId: `player-${suffix}`,
          sessionId: `session-${suffix}`,
          ready: true,
        })
        .expect(201);
      const readyRoom = ready.body as PokeLoungePublicRoomState;
      expect(readyRoom.round).toMatchObject({
        startedAtMs: startedRoom.round.startedAtMs,
        endsAtMs: startedRoom.round.endsAtMs,
      });
      revision = readyRoom.revision;
    }

    await waitForServerDeadline(startedRoom.round.endsAtMs!);
    const tournamentResponse = await request(httpServer)
      .get(`/poke-lounge/rooms/${created.roomCode}`)
      .expect(200);
    const tournament = tournamentResponse.body as PokeLoungePublicRoomState;
    expect(tournament).toMatchObject({
      status: 'tournament',
      revision: revision + 1,
      tournament: {
        activeMatchId: 'game-round-1-bracket-1-match-1',
      },
    });
    expect(tournament.tournament.bracket?.participants).toHaveLength(5);

    const rejoined = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/join`)
      .set(commandHeaders(30, tournament.revision))
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
      })
      .expect(201);
    const rejoinedRoom = rejoined.body as PokeLoungePublicRoomState;
    expect(rejoinedRoom).toMatchObject({ status: 'tournament' });

    await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/join`)
      .set(commandHeaders(31, rejoinedRoom.revision))
      .send({
        playerId: 'player-f',
        sessionId: 'session-f',
      })
      .expect(400);
  });

  it('persists a room after closing and recreating the Nest application', async () => {
    const created = await createRoom(1);

    await app.close();
    ({ app, httpServer, dataSource } = await createTestApplication());

    const reloaded = await request(httpServer)
      .get(`/poke-lounge/rooms/${created.roomCode}`)
      .expect(200);

    expect(reloaded.body).toEqual(created);
  });

  async function createRoom(index: number): Promise<PokeLoungePublicRoomState> {
    const response = await request(httpServer)
      .post('/poke-lounge/rooms')
      .set(commandHeaders(index, 0))
      .send(createBody())
      .expect(201);

    return response.body as PokeLoungePublicRoomState;
  }

  async function connectSocket(): Promise<ClientSocket> {
    const socket = io(`${baseUrl}/poke-lounge`, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    await waitForSocketEvent(socket, 'connect');

    return socket;
  }

  async function acknowledgePendingPresence(
    roomCode: string,
    playerId: string,
    sessionId: string,
    afterRevision: number,
  ): Promise<PokeLoungePublicRoomState> {
    const socket = await connectSocket();
    const snapshot = waitForSnapshot(socket, afterRevision + 1);
    socket.emit('room.subscribe', {
      roomCode,
      playerId,
      sessionId,
      afterRevision,
    });
    return snapshot;
  }
});

async function createTestApplication(): Promise<{
  app: INestApplication;
  httpServer: Server;
  dataSource: DataSource;
  baseUrl: string;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(getPokeLoungeTestTypeOrmOptions()),
      PokeLoungeModule,
    ],
  }).compile();
  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(0, '127.0.0.1');

  return {
    app,
    httpServer: app.getHttpServer() as Server,
    dataSource: app.get(DataSource),
    baseUrl: await app.getUrl(),
  };
}

function waitForSnapshot(
  socket: ClientSocket,
  revision: number,
): Promise<PokeLoungePublicRoomState> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('room.snapshot', handleSnapshot);
      reject(new Error(`Timed out waiting for room revision ${revision}`));
    }, 5000);
    const handleSnapshot = (event: { room?: PokeLoungePublicRoomState }) => {
      if (event.room?.revision !== revision) {
        return;
      }

      clearTimeout(timeout);
      socket.off('room.snapshot', handleSnapshot);
      resolve(event.room);
    };

    socket.on('room.snapshot', handleSnapshot);
  });
}

function waitForSocketEvent<T = void>(
  socket: ClientSocket,
  eventName: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, handleEvent);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, 5000);
    const handleEvent = (value: T) => {
      clearTimeout(timeout);
      socket.off(eventName, handleEvent);
      resolve(value);
    };

    socket.on(eventName, handleEvent);
  });
}

function expectNoSnapshot(
  socket: ClientSocket,
  durationMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleSnapshot = (event: unknown) => {
      clearTimeout(timeout);
      socket.off('room.snapshot', handleSnapshot);
      reject(new Error(`Unexpected room snapshot: ${JSON.stringify(event)}`));
    };
    const timeout = setTimeout(() => {
      socket.off('room.snapshot', handleSnapshot);
      resolve();
    }, durationMs);

    socket.on('room.snapshot', handleSnapshot);
  });
}

function createBody() {
  return {
    playerId: 'player-a',
    sessionId: 'session-a',
    displayName: 'Player A',
    roundDurationMs: 1000,
  };
}

async function waitForServerDeadline(deadlineMs: number): Promise<void> {
  const remainingMs = Math.max(0, deadlineMs - Date.now());
  await new Promise((resolve) => setTimeout(resolve, remainingMs + 25));
}

function commandHeaders(index: number, revision: number) {
  return {
    'X-Idempotency-Key': commandKey(index),
    'If-Match-Revision': String(revision),
  };
}

function commandKey(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}
