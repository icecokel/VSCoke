import { ConfigService } from '@nestjs/config';
import { PokeLoungeLiveStateService } from './poke-lounge-live-state.service';

describe('PokeLoungeLiveStateService', () => {
  it('requires Redis instead of silently falling back to process memory', async () => {
    const service = new PokeLoungeLiveStateService(
      new ConfigService(),
      jest.fn() as never,
    );

    await expect(service.connect()).rejects.toThrow(
      'REDIS_URL is required for Poke Lounge multiplayer',
    );
  });

  it('stores a player with an atomic world cursor and restores the snapshot', async () => {
    const redis = redisFixture();
    const service = createService(redis);
    await service.connect();
    redis.command.eval.mockResolvedValueOnce(['world-1', 3]);
    const player = {
      playerId: 'player-1',
      displayName: 'Player 1',
      map: 'new-bark-town',
      x: 672,
      y: 448,
      facing: 'left' as const,
      updatedAtMs: 1_000,
    };

    await expect(
      service.upsertPlayer({
        roomCode: ' room01 ',
        expiresAtMs: 253_402_300_799_999,
        player,
      }),
    ).resolves.toEqual({
      roomCode: 'ROOM01',
      worldEpoch: 'world-1',
      worldSeq: 3,
      ...player,
    });
    expect(redis.command.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['poke-lounge:room:ROOM01:world'],
      arguments: [
        expect.any(String),
        'player-1',
        JSON.stringify(player),
        '253402300800',
      ],
    });

    redis.command.eval.mockResolvedValueOnce('world-1');
    redis.command.hGetAll.mockResolvedValueOnce({
      _epoch: 'world-1',
      _seq: '3',
      'player-1': JSON.stringify(player),
    });
    await expect(
      service.getSnapshot('ROOM01', 253_402_300_799_999),
    ).resolves.toEqual({
      roomCode: 'ROOM01',
      worldEpoch: 'world-1',
      worldSeq: 3,
      players: [player],
    });

    await service.onModuleDestroy();
    expect(redis.command.close).toHaveBeenCalledTimes(1);
    expect(redis.subscriber.close).toHaveBeenCalledTimes(1);
  });

  it('increments the shared cursor when a disconnected player is removed', async () => {
    const redis = redisFixture();
    const service = createService(redis);
    await service.connect();

    await service.removePlayer('ROOM01', 'player-1');

    expect(redis.command.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['poke-lounge:room:ROOM01:world'],
      arguments: ['player-1'],
    });

    redis.command.hmGet.mockResolvedValueOnce(['world-1', 'broken']);
    await expect(service.getCursor('ROOM01')).rejects.toThrow(
      'Poke Lounge world sequence is malformed',
    );
    await service.onModuleDestroy();
  });

  it('extends only an existing room world expiry after a durable room update', async () => {
    const redis = redisFixture();
    const service = createService(redis);
    await service.connect();

    await service.extendRoomExpiry('room01', 253_402_300_799_999);

    expect(redis.command.eval).toHaveBeenCalledWith(expect.any(String), {
      keys: ['poke-lounge:room:ROOM01:world'],
      arguments: ['253402300800'],
    });
    await service.onModuleDestroy();
  });
});

function createService(redis: ReturnType<typeof redisFixture>) {
  return new PokeLoungeLiveStateService(
    new ConfigService({ REDIS_URL: 'redis://localhost:6379' }),
    jest.fn(() => redis.command) as never,
  );
}

function redisFixture() {
  const subscriber = {
    isReady: false,
    isOpen: false,
    connect: jest.fn(function (this: { isReady: boolean; isOpen: boolean }) {
      this.isReady = true;
      this.isOpen = true;
      return Promise.resolve();
    }),
    close: jest.fn(function (this: { isReady: boolean; isOpen: boolean }) {
      this.isReady = false;
      this.isOpen = false;
      return Promise.resolve();
    }),
    destroy: jest.fn(),
    on: jest.fn(),
  };
  const command = {
    ...subscriber,
    connect: jest.fn(function (this: { isReady: boolean; isOpen: boolean }) {
      this.isReady = true;
      this.isOpen = true;
      return Promise.resolve();
    }),
    close: jest.fn(function (this: { isReady: boolean; isOpen: boolean }) {
      this.isReady = false;
      this.isOpen = false;
      return Promise.resolve();
    }),
    del: jest.fn().mockResolvedValue(1),
    duplicate: jest.fn(() => subscriber),
    eval: jest.fn().mockResolvedValue(1),
    hGetAll: jest.fn().mockResolvedValue({}),
    hmGet: jest.fn().mockResolvedValue(['world-1', '0']),
  };

  return { command, subscriber };
}
