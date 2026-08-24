import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';

const WORLD_EPOCH_FIELD = '_epoch';
const WORLD_SEQUENCE_FIELD = '_seq';
const WORLD_KEY_PREFIX = 'poke-lounge:room:';
const WORLD_KEY_SUFFIX = ':world';
const UPSERT_PLAYER_SCRIPT = `
local epoch = redis.call('HGET', KEYS[1], '${WORLD_EPOCH_FIELD}')
if not epoch then
  epoch = ARGV[1]
  redis.call('HSET', KEYS[1], '${WORLD_EPOCH_FIELD}', epoch)
end
local sequence = redis.call('HINCRBY', KEYS[1], '${WORLD_SEQUENCE_FIELD}', 1)
redis.call('HSET', KEYS[1], ARGV[2], ARGV[3])
local ttl = redis.call('TTL', KEYS[1])
if ttl == -1 then
  redis.call('EXPIREAT', KEYS[1], ARGV[4])
else
  redis.call('EXPIREAT', KEYS[1], ARGV[4], 'GT')
end
return { epoch, sequence }
`;
const ENSURE_WORLD_SCRIPT = `
local epoch = redis.call('HGET', KEYS[1], '${WORLD_EPOCH_FIELD}')
if not epoch then
  epoch = ARGV[1]
  redis.call('HSET', KEYS[1], '${WORLD_EPOCH_FIELD}', epoch)
end
local ttl = redis.call('TTL', KEYS[1])
if ttl == -1 then
  redis.call('EXPIREAT', KEYS[1], ARGV[2])
else
  redis.call('EXPIREAT', KEYS[1], ARGV[2], 'GT')
end
return epoch
`;
const REMOVE_PLAYER_SCRIPT = `
if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 0 then
  return 0
end
redis.call('HDEL', KEYS[1], ARGV[1])
redis.call('HINCRBY', KEYS[1], '${WORLD_SEQUENCE_FIELD}', 1)
return 1
`;
const EXTEND_WORLD_EXPIRY_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 0 then
  return 0
end
local ttl = redis.call('TTL', KEYS[1])
if ttl == -1 then
  redis.call('EXPIREAT', KEYS[1], ARGV[1])
else
  redis.call('EXPIREAT', KEYS[1], ARGV[1], 'GT')
end
return 1
`;

type RedisClient = ReturnType<typeof createClient>;
type RedisClientFactory = (url: string) => RedisClient;

export type PokeLoungeWorldFacing = 'front' | 'back' | 'left' | 'right';

export interface PokeLoungeWorldPlayerState {
  playerId: string;
  displayName: string;
  map: string;
  x: number;
  y: number;
  facing: PokeLoungeWorldFacing;
  updatedAtMs: number;
}

export interface PokeLoungeWorldSnapshot {
  roomCode: string;
  worldEpoch: string;
  worldSeq: number;
  players: PokeLoungeWorldPlayerState[];
}

export interface PokeLoungeWorldPlayerEvent extends PokeLoungeWorldPlayerState {
  roomCode: string;
  worldEpoch: string;
  worldSeq: number;
}

@Injectable()
export class PokeLoungeLiveStateService implements OnModuleDestroy {
  private readonly logger = new Logger(PokeLoungeLiveStateService.name);
  private commandClient: RedisClient | null = null;
  private subscriberClient: RedisClient | null = null;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly clientFactory: RedisClientFactory = (url) =>
      createClient({ url, disableOfflineQueue: true }),
  ) {}

  async connect(): Promise<void> {
    if (this.commandClient?.isReady && this.subscriberClient?.isReady) {
      return;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for Poke Lounge multiplayer');
    }

    const commandClient = this.clientFactory(redisUrl);
    const subscriberClient = commandClient.duplicate();
    commandClient.on('error', (error) =>
      this.logger.error('Poke Lounge Redis command client error', error),
    );
    subscriberClient.on('error', (error) =>
      this.logger.error('Poke Lounge Redis subscriber client error', error),
    );
    this.commandClient = commandClient;
    this.subscriberClient = subscriberClient;
    this.connectPromise = Promise.all([
      commandClient.connect(),
      subscriberClient.connect(),
    ])
      .then(() => undefined)
      .catch((error: unknown) => {
        commandClient.destroy();
        subscriberClient.destroy();
        this.commandClient = null;
        this.subscriberClient = null;
        throw error;
      })
      .finally(() => {
        this.connectPromise = null;
      });

    return this.connectPromise;
  }

  createSocketAdapter(): ReturnType<typeof createAdapter> {
    const commandClient = this.requireCommandClient();
    const subscriberClient = this.subscriberClient;
    if (!subscriberClient?.isReady) {
      throw new Error('Poke Lounge Redis subscriber is unavailable');
    }

    return createAdapter(commandClient, subscriberClient);
  }

  async upsertPlayer(input: {
    roomCode: string;
    player: PokeLoungeWorldPlayerState;
    expiresAtMs: number;
  }): Promise<PokeLoungeWorldPlayerEvent> {
    const client = this.requireCommandClient();
    const roomCode = normalizeRoomCode(input.roomCode);
    const expiresAtSeconds = normalizeExpiresAtSeconds(input.expiresAtMs);
    const result = await client.eval(UPSERT_PLAYER_SCRIPT, {
      keys: [worldKey(roomCode)],
      arguments: [
        randomUUID(),
        input.player.playerId,
        JSON.stringify(input.player),
        String(expiresAtSeconds),
      ],
    });
    const [worldEpoch, worldSeq] = parseUpsertResult(result);

    return {
      roomCode,
      worldEpoch,
      worldSeq,
      ...structuredClone(input.player),
    };
  }

  async getSnapshot(
    roomCode: string,
    expiresAtMs: number,
  ): Promise<PokeLoungeWorldSnapshot> {
    const client = this.requireCommandClient();
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    const key = worldKey(normalizedRoomCode);
    await client.eval(ENSURE_WORLD_SCRIPT, {
      keys: [key],
      arguments: [randomUUID(), String(normalizeExpiresAtSeconds(expiresAtMs))],
    });
    const values = await client.hGetAll(key);

    return parseWorldSnapshot(normalizedRoomCode, values);
  }

  async getCursor(
    roomCode: string,
  ): Promise<
    Pick<PokeLoungeWorldSnapshot, 'roomCode' | 'worldEpoch' | 'worldSeq'>
  > {
    const client = this.requireCommandClient();
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    const values = await client.hmGet(worldKey(normalizedRoomCode), [
      WORLD_EPOCH_FIELD,
      WORLD_SEQUENCE_FIELD,
    ]);
    const worldEpoch = values[0];
    if (!worldEpoch) {
      throw new Error('Poke Lounge world state is unavailable');
    }

    return {
      roomCode: normalizedRoomCode,
      worldEpoch,
      worldSeq: parseWorldSequence(values[1], true),
    };
  }

  async removePlayer(roomCode: string, playerId: string): Promise<void> {
    const client = this.requireCommandClient();
    await client.eval(REMOVE_PLAYER_SCRIPT, {
      keys: [worldKey(normalizeRoomCode(roomCode))],
      arguments: [playerId],
    });
  }

  async extendRoomExpiry(roomCode: string, expiresAtMs: number): Promise<void> {
    const client = this.requireCommandClient();
    await client.eval(EXTEND_WORLD_EXPIRY_SCRIPT, {
      keys: [worldKey(normalizeRoomCode(roomCode))],
      arguments: [String(normalizeExpiresAtSeconds(expiresAtMs))],
    });
  }

  async deleteRoom(roomCode: string): Promise<void> {
    const client = this.requireCommandClient();
    await client.del(worldKey(normalizeRoomCode(roomCode)));
  }

  async onModuleDestroy(): Promise<void> {
    const clients = [this.subscriberClient, this.commandClient].filter(
      (client): client is RedisClient => client !== null,
    );
    this.subscriberClient = null;
    this.commandClient = null;
    await Promise.all(
      clients.map(async (client) => {
        if (client.isOpen) {
          await client.close();
        }
      }),
    );
  }

  private requireCommandClient(): RedisClient {
    if (!this.commandClient?.isReady) {
      throw new Error('Poke Lounge Redis command client is unavailable');
    }
    return this.commandClient;
  }
}

function worldKey(roomCode: string): string {
  return `${WORLD_KEY_PREFIX}${roomCode}${WORLD_KEY_SUFFIX}`;
}

function normalizeRoomCode(roomCode: string): string {
  const normalized = roomCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    throw new Error('Poke Lounge room code is invalid');
  }
  return normalized;
}

function normalizeExpiresAtSeconds(expiresAtMs: number): number {
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Poke Lounge world expiry is invalid');
  }
  return Math.ceil(expiresAtMs / 1000);
}

function parseUpsertResult(value: unknown): [string, number] {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== 'string'
  ) {
    throw new Error('Poke Lounge Redis update result is malformed');
  }
  return [value[0], parseWorldSequence(value[1])];
}

function parseWorldSnapshot(
  roomCode: string,
  values: Record<string, string>,
): PokeLoungeWorldSnapshot {
  const worldEpoch = values[WORLD_EPOCH_FIELD];
  if (!worldEpoch) {
    throw new Error('Poke Lounge world epoch is missing');
  }
  const players = Object.entries(values)
    .filter(
      ([field]) =>
        field !== WORLD_EPOCH_FIELD && field !== WORLD_SEQUENCE_FIELD,
    )
    .map(([playerId, value]) => parseWorldPlayer(playerId, value))
    .sort((left, right) => left.playerId.localeCompare(right.playerId));

  return {
    roomCode,
    worldEpoch,
    worldSeq: parseWorldSequence(values[WORLD_SEQUENCE_FIELD], true),
    players,
  };
}

function parseWorldPlayer(
  playerId: string,
  serialized: string,
): PokeLoungeWorldPlayerState {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error('Poke Lounge world player state is malformed');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Poke Lounge world player state is malformed');
  }
  const player = value as Record<string, unknown>;
  if (
    player.playerId !== playerId ||
    typeof player.displayName !== 'string' ||
    player.displayName.length === 0 ||
    typeof player.map !== 'string' ||
    player.map.length === 0 ||
    typeof player.x !== 'number' ||
    !Number.isFinite(player.x) ||
    typeof player.y !== 'number' ||
    !Number.isFinite(player.y) ||
    (player.facing !== 'front' &&
      player.facing !== 'back' &&
      player.facing !== 'left' &&
      player.facing !== 'right') ||
    !Number.isSafeInteger(player.updatedAtMs) ||
    (player.updatedAtMs as number) < 0
  ) {
    throw new Error('Poke Lounge world player state is malformed');
  }

  return player as unknown as PokeLoungeWorldPlayerState;
}

function parseWorldSequence(value: unknown, allowMissing = false): number {
  if (allowMissing && (value === undefined || value === null)) {
    return 0;
  }
  const sequence =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new Error('Poke Lounge world sequence is malformed');
  }
  return sequence;
}
