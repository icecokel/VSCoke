import type {
  CreatePokeLoungeRedisRoomResult,
  PokeLoungeRedisRoomRecord,
} from './poke-lounge-live-state.service';
import type { PokeLoungeRoomSnapshot } from './poke-lounge-room.repository';
import { RedisPokeLoungeRepository } from './redis-poke-lounge.repository';

describe('RedisPokeLoungeRepository', () => {
  it('commits a room revision once and replays the same command', async () => {
    const redis = new InMemoryRedisRoomState();
    const repository = new RedisPokeLoungeRepository(redis as never);
    const room = roomSnapshot();

    await expect(
      repository.create({
        room,
        actorPlayerId: 'player-1',
        idempotencyKey: 'create-1',
        requestHash: 'create-hash',
        nowMs: 0,
      }),
    ).resolves.toMatchObject({ outcome: 'committed' });

    const input = {
      operation: 'ready' as const,
      roomCode: room.roomCode,
      actorPlayerId: 'player-1',
      idempotencyKey: 'ready-1',
      requestHash: 'ready-hash',
      expectedRevision: 0,
      nowMs: 1,
      apply: (current: PokeLoungeRoomSnapshot) => ({
        ...current,
        updatedAtMs: 1,
        participants: current.participants.map((participant) => ({
          ...participant,
          ready: true,
        })),
      }),
    };
    const committed = await repository.mutate(input);
    const replayed = await repository.mutate(input);

    expect(committed).toMatchObject({
      outcome: 'committed',
      committedChange: true,
      snapshot: { revision: 1 },
    });
    expect(replayed).toMatchObject({
      outcome: 'replayed',
      committedChange: false,
      snapshot: { revision: 1 },
    });
    expect(redis.compareAndSetCalls).toBe(1);
  });
});

class InMemoryRedisRoomState {
  private readonly rooms = new Map<string, PokeLoungeRedisRoomRecord>();
  compareAndSetCalls = 0;

  createRoomState(input: {
    roomCode: string;
    document: string;
  }): Promise<CreatePokeLoungeRedisRoomResult> {
    if (this.rooms.has(input.roomCode)) {
      return Promise.resolve({ outcome: 'room-code-collision' });
    }
    this.rooms.set(input.roomCode, { version: 0, document: input.document });
    return Promise.resolve({ outcome: 'created' });
  }

  getRoomState(roomCode: string): Promise<PokeLoungeRedisRoomRecord | null> {
    return Promise.resolve(this.rooms.get(roomCode) ?? null);
  }

  compareAndSetRoomState(input: {
    roomCode: string;
    expectedVersion: number;
    document: string;
  }): Promise<'committed' | 'conflict' | 'missing'> {
    const current = this.rooms.get(input.roomCode);
    if (!current) {
      return Promise.resolve('missing');
    }
    if (current.version !== input.expectedVersion) {
      return Promise.resolve('conflict');
    }
    this.compareAndSetCalls += 1;
    this.rooms.set(input.roomCode, {
      version: current.version + 1,
      document: input.document,
    });
    return Promise.resolve('committed');
  }

  purgeExpiredRoomStates(): Promise<number> {
    return Promise.resolve(0);
  }
}

function roomSnapshot(): PokeLoungeRoomSnapshot {
  return {
    roomCode: 'ROOM01',
    status: 'waiting',
    createdAtMs: 0,
    updatedAtMs: 0,
    participants: [
      {
        sessionId: 'session-1',
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
      index: 0,
      phase: 'waiting',
      durationMs: 300_000,
      startedAtMs: null,
      endsAtMs: null,
    },
    tournament: {
      version: 2,
      bracket: null,
      activeMatchId: null,
      activeMatchAuthority: null,
      cumulativeScores: {},
    },
    finalStandings: [],
    revision: 0,
    expiresAtMs: 0,
  };
}
