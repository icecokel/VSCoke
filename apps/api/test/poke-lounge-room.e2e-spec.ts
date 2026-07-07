import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { PokeLoungeModule } from './../src/poke-lounge/poke-lounge.module';
import { PokeLoungeRoomService } from './../src/poke-lounge/poke-lounge-room.service';
import type { PokeLoungeRoomState } from './../src/poke-lounge/poke-lounge-room.types';
import { setupApiDocumentation } from './../src/api-documentation';

type OpenApiDocument = {
  paths?: Record<
    string,
    {
      get?: {
        responses?: Record<
          string,
          { content?: Record<string, { schema?: SchemaRef }> }
        >;
      };
      post?: {
        requestBody?: {
          content?: Record<string, { schema?: SchemaRef }>;
        };
        responses?: Record<
          string,
          { content?: Record<string, { schema?: SchemaRef }> }
        >;
      };
    }
  >;
  components?: {
    schemas?: Record<string, { properties?: Record<string, unknown> }>;
  };
};

type SchemaRef = {
  $ref?: string;
};

describe('Poke Lounge server rooms (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let service: PokeLoungeRoomService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PokeLoungeModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApiDocumentation(app);
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
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
        nowMs: 0,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.status).toBe('waiting');
      });

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        ready: true,
        nowMs: 1,
      })
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
        reportingSessionId: 'session-a',
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

  it('protects participant session credentials in public responses and write APIs', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        displayName: 'Player A',
        roundDurationMs: 1,
        nowMs: 0,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.participants[0]).toEqual(
          expect.not.objectContaining({ sessionId: 'session-a' }),
        );
      });

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({
        playerId: 'player-a',
        sessionId: 'session-b',
      })
      .expect(400);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/join')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.participants).toHaveLength(1);
        expect(body.participants[0]).not.toHaveProperty('sessionId');
      });

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
        body.participants.forEach((participant) => {
          expect(participant).not.toHaveProperty('sessionId');
        });
      });

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({ playerId: 'player-a', ready: true, nowMs: 0 })
      .expect(400);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({
        playerId: 'player-a',
        sessionId: 'session-b',
        ready: true,
        nowMs: 0,
      })
      .expect(400);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
        nowMs: 0,
      })
      .expect(201);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        ready: true,
        nowMs: 0,
      })
      .expect(201);

    await request(httpServer)
      .get('/poke-lounge/rooms/ROOM01?nowMs=1')
      .expect(200);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/result')
      .send({
        reportingPlayerId: 'player-a',
        reportingSessionId: 'session-b',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'faint',
      })
      .expect(400);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/leave')
      .send({ playerId: 'player-a', sessionId: 'session-b', nowMs: 2 })
      .expect(400);
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
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        ready: true,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .get('/poke-lounge/rooms/ROOM01?nowMs=1')
      .expect(200);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/result')
      .send({
        reportingPlayerId: 'player-c',
        reportingSessionId: 'session-c',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'faint',
      })
      .expect(400);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/leave')
      .send({ playerId: 'player-a', sessionId: 'session-a' })
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

  it('accepts participant party snapshots, exposes them in room state, and rejects spectators', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        displayName: 'Player A',
        nowMs: 0,
      })
      .expect(201);

    for (let index = 2; index <= 7; index += 1) {
      await request(httpServer)
        .post('/poke-lounge/rooms/ROOM01/join')
        .send({
          playerId: `player-${index}`,
          sessionId: `session-${index}`,
          displayName: `Player ${index}`,
          nowMs: index,
        })
        .expect(201);
    }

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/party-snapshot')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        displayName: 'Alpha',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 12,
          currentHp: 18,
          maxHp: 30,
        },
        nowMs: 25,
      })
      .expect(201);

    await request(httpServer)
      .get('/poke-lounge/rooms/ROOM01')
      .expect(200)
      .expect((response) => {
        const body = response.body as PokeLoungeRoomState;

        expect(body.partySnapshots['player-a']).toEqual({
          playerId: 'player-a',
          displayName: 'Alpha',
          representativePokemon: {
            speciesId: 25,
            name: 'Pikachu',
            level: 12,
            currentHp: 18,
            maxHp: 30,
          },
          updatedAtMs: 25,
        });
      });

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/party-snapshot')
      .send({
        playerId: 'player-7',
        sessionId: 'session-7',
        representativePokemon: {
          speciesId: 1,
          name: 'Bulbasaur',
          level: 5,
          currentHp: 20,
          maxHp: 20,
        },
      })
      .expect(400);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/party-snapshot')
      .send({
        playerId: 'player-a',
        sessionId: 'session-7',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 12,
          currentHp: 18,
          maxHp: 30,
        },
      })
      .expect(400);
  });

  it('rejects malformed party snapshot pokemon values with 400', async () => {
    await request(httpServer)
      .post('/poke-lounge/rooms')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
      })
      .expect(201);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/party-snapshot')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        representativePokemon: {
          speciesId: 0,
          name: 'Pikachu',
          level: 5,
          currentHp: 20,
          maxHp: 20,
        },
      })
      .expect(400);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/party-snapshot')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 5,
          currentHp: 20,
          maxHp: -1,
        },
      })
      .expect(400);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/party-snapshot')
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        representativePokemon: {
          speciesId: 25,
          name: 'Pikachu',
          level: 5,
          currentHp: 21,
          maxHp: 20,
        },
      })
      .expect(400);
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
            role: 'participant',
          }),
        ]);
      });

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .expect(400);
  });

  it('exposes the Poke Lounge room DTO request and response contract in /api-json', async () => {
    const response = await request(httpServer).get('/api-json').expect(200);
    const body = response.body as OpenApiDocument;

    expect(
      body.paths?.['/poke-lounge/rooms']?.post?.requestBody?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/CreatePokeLoungeRoomDto');
    expect(
      body.paths?.['/poke-lounge/rooms/{roomCode}/join']?.post?.requestBody
        ?.content?.['application/json']?.schema?.$ref,
    ).toBe('#/components/schemas/JoinPokeLoungeRoomDto');
    expect(
      body.paths?.['/poke-lounge/rooms/{roomCode}/ready']?.post?.requestBody
        ?.content?.['application/json']?.schema?.$ref,
    ).toBe('#/components/schemas/SetPokeLoungeReadyDto');
    expect(
      body.paths?.['/poke-lounge/rooms/{roomCode}/result']?.post?.requestBody
        ?.content?.['application/json']?.schema?.$ref,
    ).toBe('#/components/schemas/SubmitPokeLoungeMatchResultDto');
    expect(
      body.paths?.['/poke-lounge/rooms/{roomCode}/party-snapshot']?.post
        ?.requestBody?.content?.['application/json']?.schema?.$ref,
    ).toBe('#/components/schemas/UpdatePokeLoungePartySnapshotDto');
    expect(
      body.paths?.['/poke-lounge/rooms/{roomCode}/leave']?.post?.requestBody
        ?.content?.['application/json']?.schema?.$ref,
    ).toBe('#/components/schemas/LeavePokeLoungeRoomDto');

    expect(
      body.paths?.['/poke-lounge/rooms']?.post?.responses?.['201']?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/PokeLoungeRoomResponseDto');
    expect(
      body.paths?.['/poke-lounge/rooms/{roomCode}']?.get?.responses?.['200']
        ?.content?.['application/json']?.schema?.$ref,
    ).toBe('#/components/schemas/PokeLoungeRoomResponseDto');

    const roomSchemaProperties =
      body.components?.schemas?.PokeLoungeRoomResponseDto?.properties;
    const participantSchemaProperties =
      body.components?.schemas?.PokeLoungeRoomParticipantDto?.properties;
    const readySchemaProperties =
      body.components?.schemas?.SetPokeLoungeReadyDto?.properties;
    const resultSchemaProperties =
      body.components?.schemas?.SubmitPokeLoungeMatchResultDto?.properties;

    expect(roomSchemaProperties).toBeDefined();
    expect(roomSchemaProperties).toHaveProperty('participants');
    expect(roomSchemaProperties).toHaveProperty('partySnapshots');
    expect(roomSchemaProperties).toHaveProperty('round');
    expect(roomSchemaProperties).toHaveProperty('tournament');
    expect(roomSchemaProperties).toHaveProperty('finalStandings');
    expect(participantSchemaProperties).toBeDefined();
    expect(participantSchemaProperties).not.toHaveProperty('sessionId');
    expect(readySchemaProperties).toHaveProperty('sessionId');
    expect(resultSchemaProperties).toHaveProperty('reportingSessionId');

    const snapshotSchemaProperties =
      body.components?.schemas?.PokeLoungePartySnapshotDto?.properties;
    const representativePokemonSchema =
      snapshotSchemaProperties?.representativePokemon as SchemaRef | undefined;
    const representativePokemonProperties =
      body.components?.schemas?.PokeLoungeRepresentativePokemonDto?.properties;

    expect(snapshotSchemaProperties).toBeDefined();
    expect(snapshotSchemaProperties).toHaveProperty('playerId');
    expect(snapshotSchemaProperties).toHaveProperty('representativePokemon');
    expect(representativePokemonSchema?.$ref).toBe(
      '#/components/schemas/PokeLoungeRepresentativePokemonDto',
    );
    expect(representativePokemonProperties).toHaveProperty('speciesId');
    expect(representativePokemonProperties).toHaveProperty('level');
    expect(representativePokemonProperties).toHaveProperty('currentHp');
    expect(representativePokemonProperties).toHaveProperty('maxHp');
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
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        ready: true,
        nowMs: 0,
      })
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
      .send({ playerId: 'player-b', sessionId: 'session-b', nowMs: 10 })
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
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
        nowMs: 30,
      })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({
        playerId: 'player-c',
        sessionId: 'session-c',
        ready: true,
        nowMs: 40,
      })
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
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        ready: true,
        nowMs: 0,
      })
      .expect(201);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/leave')
      .send({ playerId: 'player-a', sessionId: 'session-a', nowMs: 100 })
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
      .send({
        playerId: 'player-a',
        sessionId: 'session-a',
        ready: true,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/ready')
      .send({
        playerId: 'player-b',
        sessionId: 'session-b',
        ready: true,
        nowMs: 0,
      })
      .expect(201);
    await request(httpServer)
      .get('/poke-lounge/rooms/ROOM01?nowMs=1')
      .expect(200);

    await request(httpServer)
      .post('/poke-lounge/rooms/ROOM01/result')
      .send({
        reportingPlayerId: 'player-a',
        reportingSessionId: 'session-a',
        matchId: 'round-1-match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'bogus',
      })
      .expect(400);
  });
});
