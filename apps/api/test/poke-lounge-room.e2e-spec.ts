import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import { PokeLoungeModule } from './../src/poke-lounge/poke-lounge.module';
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
          nowMs: 1,
        },
      },
      {
        path: `/poke-lounge/rooms/${created.roomCode}/ready`,
        body: {
          playerId: 'player-a',
          sessionId: 'session-a',
          ready: true,
          nowMs: 1,
        },
      },
      {
        path: `/poke-lounge/rooms/${created.roomCode}/party-snapshot`,
        body: {
          playerId: 'player-a',
          sessionId: 'session-a',
          nowMs: 1,
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
          nowMs: 1,
        },
      },
      {
        path: `/poke-lounge/rooms/${created.roomCode}/leave`,
        body: {
          playerId: 'player-a',
          sessionId: 'session-a',
          nowMs: 1,
        },
      },
    ];

    for (const route of routes) {
      await request(httpServer).post(route.path).send(route.body).expect(400);
    }
  });

  it('returns revisions and expiry, redacts sessions, and replays exact commands', async () => {
    const body = createBody();
    const createdResponse = await request(httpServer)
      .post('/poke-lounge/rooms')
      .set(commandHeaders(1, 0))
      .send(body)
      .expect(201);
    const created = createdResponse.body as PokeLoungePublicRoomState;

    expect(created).toMatchObject({
      status: 'waiting',
      revision: 0,
      expiresAtMs: 30 * 60_000,
    });
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
        nowMs: 10,
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
        nowMs: 10,
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
        nowMs: 10,
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
    const nowMs = Date.now();
    const created = await createRoom(1, nowMs);
    const joinedResponse = await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/join`)
      .set(commandHeaders(2, created.revision))
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        displayName: 'Player B',
        nowMs: nowMs + 10,
      })
      .expect(201);
    const joined = joinedResponse.body as PokeLoungePublicRoomState;
    const hostSocket = await connectSocket();
    const guestSocket = await connectSocket();
    const hostInitial = waitForSnapshot(hostSocket, joined.revision);
    const guestInitial = waitForSnapshot(guestSocket, joined.revision);

    hostSocket.emit('room.subscribe', {
      roomCode: created.roomCode,
      playerId: 'player-a',
      sessionId: 'session-a',
      afterRevision: joined.revision,
    });
    guestSocket.emit('room.subscribe', {
      roomCode: created.roomCode,
      playerId: 'player-b',
      sessionId: 'session-b',
      afterRevision: joined.revision,
    });

    const [hostSubscribed, guestSubscribed] = await Promise.all([
      hostInitial,
      guestInitial,
    ]);
    expect(hostSubscribed).toEqual(guestSubscribed);

    const nextRevision = joined.revision + 1;
    const hostCommitted = waitForSnapshot(hostSocket, nextRevision);
    const guestCommitted = waitForSnapshot(guestSocket, nextRevision);
    await request(httpServer)
      .post(`/poke-lounge/rooms/${created.roomCode}/party-snapshot`)
      .set(commandHeaders(3, joined.revision))
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        displayName: 'Player A',
        nowMs: nowMs + 20,
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
        nowMs: nowMs + 30,
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

  it('persists a room after closing and recreating the Nest application', async () => {
    const created = await createRoom(1);

    await app.close();
    ({ app, httpServer, dataSource } = await createTestApplication());

    const reloaded = await request(httpServer)
      .get(`/poke-lounge/rooms/${created.roomCode}`)
      .query({ nowMs: 0 })
      .expect(200);

    expect(reloaded.body).toEqual(created);
  });

  async function createRoom(
    index: number,
    nowMs = 0,
  ): Promise<PokeLoungePublicRoomState> {
    const response = await request(httpServer)
      .post('/poke-lounge/rooms')
      .set(commandHeaders(index, 0))
      .send(createBody(nowMs))
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

function createBody(nowMs = 0) {
  return {
    playerId: 'player-a',
    sessionId: 'session-a',
    displayName: 'Player A',
    roundDurationMs: 1000,
    nowMs,
  };
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
