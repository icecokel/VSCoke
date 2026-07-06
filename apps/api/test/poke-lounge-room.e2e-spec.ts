import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { PokeLoungeModule } from './../src/poke-lounge/poke-lounge.module';
import { PokeLoungeRoomService } from './../src/poke-lounge/poke-lounge-room.service';
import type { PokeLoungeRoomState } from './../src/poke-lounge/poke-lounge-room.types';

describe('Poke Lounge server rooms (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let service: PokeLoungeRoomService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PokeLoungeModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
    service = app.get(PokeLoungeRoomService);
    service.resetForTest(() => 'ROOM01');
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates, joins, gates ready state, starts server timer, accepts result, and exposes final standings', async () => {
    const created = await request(httpServer)
      .post('/poke-lounge/rooms')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        displayName: 'Player A',
        roundDurationMs: 10,
        nowMs: 0,
      })
      .expect(201);

    const createdBody = created.body as PokeLoungeRoomState;

    expect(createdBody.roomCode).toBe('ROOM01');
    expect(createdBody.status).toBe('waiting');

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        displayName: 'Player B',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.participants).toHaveLength(2);
      });

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-a', ready: true, nowMs: 0 })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('waiting');
      });

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-b', ready: true, nowMs: 1 })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('round-started');
        expect(body.round.endsAtMs).toBe(11);
      });

    await request(httpServer)
      .get('/poke-lounge/rooms/ROOM01?nowMs=11')
      .expect(200)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('tournament');
        expect(body.tournament.matches).toEqual([
          expect.objectContaining({
            matchId: 'round-1-match-1',
            participantIds: ['player-a', 'player-b'],
            status: 'pending',
          }),
        ]);
      });

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/result')
      .send({
        reportingPlayerId: 'player-a',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'faint',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('completed');
        expect(body.finalStandings).toEqual([
          expect.objectContaining({
            playerId: 'player-a',
            rank: 1,
            score: 100,
          }),
          expect.objectContaining({ playerId: 'player-b', rank: 2, score: 50 }),
        ]);
      });
  });

  it('rejects invalid result payloads and marks leave as forfeit', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        roundDurationMs: 1,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({ playerId: 'player-b', sessionId: 'session-b' })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-a', ready: true, nowMs: 0 })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-b', ready: true, nowMs: 0 })
      .expect(201);
    await request(httpServer)
      .get('/poke-lounge/rooms/ROOM01?nowMs=1')
      .expect(200);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/result')
      .send({
        reportingPlayerId: 'player-c',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'faint',
      })
      .expect(400);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/leave')
      .send({ playerId: 'player-a' })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('completed');
        expect(body.tournament.matches[0]).toEqual(
          expect.objectContaining({
            winnerPlayerId: 'player-b',
            loserPlayerId: 'player-a',
            resultReason: 'forfeit',
          }),
        );
      });
  });

  it('handles omitted request bodies without returning a 500 response', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.roomCode).toBe('ROOM01');
        expect(body.participants).toEqual([
          expect.objectContaining({
            playerId: 'player-1',
            sessionId: 'session-1',
            role: 'participant',
          }),
        ]);
      });

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .expect(400);
  });

  it('rejects new joins after the round has started', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        roundDurationMs: 1000,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({ playerId: 'player-b', sessionId: 'session-b' })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-a', ready: true, nowMs: 0 })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-b', ready: true, nowMs: 0 })
      .expect(201);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({ playerId: 'player-c', sessionId: 'session-c', nowMs: 100 })
      .expect(400);

    await request(httpServer)
      .get('/poke-lounge/rooms/ROOM01?nowMs=1000')
      .expect(200)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.tournament.matches).toEqual([
          expect.objectContaining({
            participantIds: ['player-a', 'player-b'],
          }),
        ]);
      });
  });

  it('lets a replacement participant start from waiting after another participant leaves', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .send({ playerId: 'player-a', sessionId: 'session-a', nowMs: 0 })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({ playerId: 'player-b', sessionId: 'session-b' })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/leave')
      .send({ playerId: 'player-b', nowMs: 10 })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('waiting');
        expect(
          body.participants.map((participant) => participant.playerId),
        ).toEqual(['player-a']);
      });
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({ playerId: 'player-c', sessionId: 'session-c', nowMs: 20 })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-a', ready: true, nowMs: 30 })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-c', ready: true, nowMs: 40 })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('round-started');
        expect(body.round.phase).toBe('round-started');
      });
  });

  it('completes a round-started room when a participant leaves before the timer expires', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        roundDurationMs: 1000,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({ playerId: 'player-b', sessionId: 'session-b' })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-a', ready: true, nowMs: 0 })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-b', ready: true, nowMs: 0 })
      .expect(201);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/leave')
      .send({ playerId: 'player-a', nowMs: 100 })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('completed');
        expect(body.finalStandings).toEqual([
          expect.objectContaining({
            playerId: 'player-b',
            rank: 1,
            score: 100,
          }),
          expect.objectContaining({ playerId: 'player-a', rank: 2, score: 50 }),
        ]);
      });

    await request(httpServer)
      .get('/poke-lounge/rooms/ROOM01?nowMs=1000')
      .expect(200)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('completed');
      });
  });

  it('rejects match result payloads with unsupported reasons', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        roundDurationMs: 1,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({ playerId: 'player-b', sessionId: 'session-b' })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-a', ready: true, nowMs: 0 })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-b', ready: true, nowMs: 0 })
      .expect(201);
    await request(httpServer)
      .get('/poke-lounge/rooms/ROOM01?nowMs=1')
      .expect(200);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/result')
      .send({
        reportingPlayerId: 'player-a',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'bogus',
      })
      .expect(400);
  });
});
