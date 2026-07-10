import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { PokeLoungeRoomSnapshot } from './poke-lounge-room.repository';
import type { PokeLoungeRoomService } from './poke-lounge-room.service';
import { PokeLoungeController } from './poke-lounge.controller';

const IDEMPOTENCY_KEY = '00000000-0000-4000-8000-000000000001';

describe('PokeLoungeController', () => {
  let service: jest.Mocked<PokeLoungeRoomService>;
  let controller: PokeLoungeController;

  beforeEach(() => {
    service = {
      createRoom: jest.fn().mockResolvedValue(snapshot()),
      getRoom: jest.fn().mockResolvedValue(snapshot()),
      joinRoom: jest.fn().mockResolvedValue(snapshot()),
      setReady: jest.fn().mockResolvedValue(snapshot()),
      updatePartySnapshot: jest.fn().mockResolvedValue(snapshot()),
      submitMatchResult: jest.fn().mockResolvedValue(snapshot()),
      leaveRoom: jest.fn().mockResolvedValue(snapshot()),
    } as unknown as jest.Mocked<PokeLoungeRoomService>;
    controller = new PokeLoungeController(service);
  });

  it('requires one canonical UUID v4 and one non-negative safe revision on every POST', async () => {
    const cases = [
      () => controller.createRoom({ sessionId: 'session-a' }, request()),
      () =>
        controller.joinRoom(
          'ROOM01',
          { playerId: 'player-b', sessionId: 'session-b' },
          request(),
        ),
      () =>
        controller.setReady(
          'ROOM01',
          { playerId: 'player-a', sessionId: 'session-a', ready: true },
          request(),
        ),
      () =>
        controller.updatePartySnapshot(
          'ROOM01',
          { playerId: 'player-a', sessionId: 'session-a' },
          request(),
        ),
      () =>
        controller.submitResult(
          'ROOM01',
          {
            reportingPlayerId: 'player-a',
            reportingSessionId: 'session-a',
            matchId: 'match-1',
            winnerPlayerId: 'player-a',
            loserPlayerId: 'player-b',
            reason: 'faint',
          },
          request(),
        ),
      () =>
        controller.leaveRoom(
          'ROOM01',
          { playerId: 'player-a', sessionId: 'session-a' },
          request(),
        ),
    ];

    for (const invoke of cases) {
      await expect(invoke()).rejects.toThrow(BadRequestException);
    }

    expect(service.createRoom.mock.calls).toHaveLength(0);
    expect(service.joinRoom.mock.calls).toHaveLength(0);
    expect(service.setReady.mock.calls).toHaveLength(0);
    expect(service.updatePartySnapshot.mock.calls).toHaveLength(0);
    expect(service.submitMatchResult.mock.calls).toHaveLength(0);
    expect(service.leaveRoom.mock.calls).toHaveLength(0);
  });

  it.each([
    ['not-a-uuid', '0'],
    ['00000000-0000-3000-8000-000000000001', '0'],
    ['00000000-0000-4000-7000-000000000001', '0'],
    ['00000000-0000-4000-8000-00000000000a'.toUpperCase(), '0'],
    [IDEMPOTENCY_KEY, '-1'],
    [IDEMPOTENCY_KEY, '+1'],
    [IDEMPOTENCY_KEY, '1.0'],
    [IDEMPOTENCY_KEY, '01'],
    [IDEMPOTENCY_KEY, String(Number.MAX_SAFE_INTEGER + 1)],
  ])('rejects malformed command headers (%s, %s)', async (key, revision) => {
    await expect(
      controller.joinRoom(
        'ROOM01',
        { playerId: 'player-b', sessionId: 'session-b' },
        request(['X-Idempotency-Key', key, 'If-Match-Revision', revision]),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate raw command headers even when Node could join them', async () => {
    await expect(
      controller.joinRoom(
        'ROOM01',
        { playerId: 'player-b', sessionId: 'session-b' },
        request([
          'X-Idempotency-Key',
          IDEMPOTENCY_KEY,
          'x-idempotency-key',
          '00000000-0000-4000-8000-000000000002',
          'If-Match-Revision',
          '0',
        ]),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      controller.joinRoom(
        'ROOM01',
        { playerId: 'player-b', sessionId: 'session-b' },
        request([
          'X-Idempotency-Key',
          IDEMPOTENCY_KEY,
          'If-Match-Revision',
          '0',
          'if-match-revision',
          '1',
        ]),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires creation revision zero and forwards validated command metadata', async () => {
    await expect(
      controller.createRoom(
        { playerId: 'player-a', sessionId: 'session-a' },
        commandRequest(1),
      ),
    ).rejects.toThrow(BadRequestException);

    await controller.createRoom(
      { playerId: 'player-a', sessionId: 'session-a' },
      commandRequest(0),
    );

    expect(service.createRoom.mock.calls).toContainEqual([
      { playerId: 'player-a', sessionId: 'session-a' },
      { idempotencyKey: IDEMPOTENCY_KEY, expectedRevision: 0 },
    ]);
  });

  it('forwards the latest revision metadata to all existing-room commands', async () => {
    const rawRequest = commandRequest(7);

    await controller.joinRoom(
      'ROOM01',
      { playerId: 'player-b', sessionId: 'session-b' },
      rawRequest,
    );
    await controller.setReady(
      'ROOM01',
      { playerId: 'player-a', sessionId: 'session-a', ready: true },
      rawRequest,
    );
    await controller.updatePartySnapshot(
      'ROOM01',
      { playerId: 'player-a', sessionId: 'session-a' },
      rawRequest,
    );
    await controller.submitResult(
      'ROOM01',
      {
        reportingPlayerId: 'player-a',
        reportingSessionId: 'session-a',
        matchId: 'match-1',
        winnerPlayerId: 'player-a',
        loserPlayerId: 'player-b',
        reason: 'faint',
      },
      rawRequest,
    );
    await controller.leaveRoom(
      'ROOM01',
      { playerId: 'player-a', sessionId: 'session-a' },
      rawRequest,
    );

    for (const calls of [
      service.joinRoom.mock.calls,
      service.setReady.mock.calls,
      service.updatePartySnapshot.mock.calls,
      service.submitMatchResult.mock.calls,
      service.leaveRoom.mock.calls,
    ]) {
      expect(calls[0]?.[0]).toBe('ROOM01');
      expect(calls[0]?.[2]).toEqual({
        idempotencyKey: IDEMPOTENCY_KEY,
        expectedRevision: 7,
      });
    }
  });

  it('preserves an omitted join playerId for the service to assign inside the locked room', async () => {
    await controller.joinRoom(
      'ROOM01',
      { sessionId: 'session-b' },
      commandRequest(3),
    );

    expect(service.joinRoom.mock.calls).toContainEqual([
      'ROOM01',
      { sessionId: 'session-b' },
      { idempotencyKey: IDEMPOTENCY_KEY, expectedRevision: 3 },
    ]);
  });

  it('redacts session ids while retaining revision and expiry in public responses', async () => {
    const response = await controller.getRoom('ROOM01', '100');

    expect(response).toMatchObject({
      roomCode: 'ROOM01',
      revision: 3,
      expiresAtMs: 30 * 60_000,
      participants: [{ playerId: 'player-a' }],
    });
    expect(JSON.stringify(response)).not.toContain('session-a');
    expect(JSON.stringify(response)).not.toContain('sessionId');
  });
});

function commandRequest(revision: number): Request {
  return request([
    'X-Idempotency-Key',
    IDEMPOTENCY_KEY,
    'If-Match-Revision',
    String(revision),
  ]);
}

function request(rawHeaders: string[] = []): Request {
  return { rawHeaders } as Request;
}

function snapshot(): PokeLoungeRoomSnapshot {
  return {
    roomCode: 'ROOM01',
    status: 'waiting',
    createdAtMs: 0,
    updatedAtMs: 0,
    participants: [
      {
        sessionId: 'session-a',
        playerId: 'player-a',
        displayName: 'Player A',
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
    revision: 3,
    expiresAtMs: 30 * 60_000,
  };
}
