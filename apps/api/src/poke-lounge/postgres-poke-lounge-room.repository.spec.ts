import { QueryFailedError, type DataSource, type EntityManager } from 'typeorm';
import { PokeLoungeRoomCommand } from './entities/poke-lounge-room-command.entity';
import { PokeLoungeRoom } from './entities/poke-lounge-room.entity';
import { PostgresPokeLoungeRoomRepository } from './postgres-poke-lounge-room.repository';
import type {
  PokeLoungeRepositoryResult,
  PokeLoungeRoomSnapshot,
} from './poke-lounge-room.repository';

const ACTOR_KEY_CONSTRAINT = 'UQ_poke_lounge_room_command_actor_key';
const ROOM_ACTOR_KEY_CONSTRAINT = 'UQ_poke_lounge_room_command_room_actor_key';
const IDEMPOTENCY_KEY = '11111111-1111-4111-8111-111111111111';
type CreateInput = Parameters<PostgresPokeLoungeRoomRepository['create']>[0];

describe('PostgresPokeLoungeRoomRepository locking', () => {
  it('acquires the same actor/key lock before creation and room locks', async () => {
    const createEvents: string[] = [];
    const createCommandLockParameters: unknown[][] = [];
    const createManager = createReplayManager(
      createEvents,
      createCommandLockParameters,
    );
    const createRepository = new PostgresPokeLoungeRoomRepository(
      managerDataSource(createManager),
    );
    const mutateEvents: string[] = [];
    const mutateCommandLockParameters: unknown[][] = [];
    const mutateManager = createMissingRoomManager(
      mutateEvents,
      mutateCommandLockParameters,
    );
    const mutateRepository = new PostgresPokeLoungeRoomRepository(
      managerDataSource(mutateManager),
    );

    await createRepository.create(createInput());
    await mutateRepository.mutate(mutateInput());

    expect(createEvents.slice(0, 2)).toEqual(['command-lock', 'creation-lock']);
    expect(mutateEvents.slice(0, 3)).toEqual([
      'command-lock',
      'purge',
      'room-lock',
    ]);
    expect(createCommandLockParameters[0]).toEqual(
      mutateCommandLockParameters[0],
    );
    expect(createCommandLockParameters[0]).toHaveLength(2);
    expect(
      createCommandLockParameters[0].every((value) => Number.isInteger(value)),
    ).toBe(true);
  });

  it('derives the command lock from both actor and idempotency key', async () => {
    const base = await captureCreateCommandLock(createInput());
    const changedActor = await captureCreateCommandLock(
      createInput({ actorPlayerId: 'player-b' }),
    );
    const changedKey = await captureCreateCommandLock(
      createInput({
        idempotencyKey: '22222222-2222-4222-8222-222222222222',
      }),
    );

    expect(changedActor).not.toEqual(base);
    expect(changedKey).not.toEqual(base);
  });

  it.each([ACTOR_KEY_CONSTRAINT, ROOM_ACTOR_KEY_CONSTRAINT])(
    're-reads a creation receipt after residual %s conflicts',
    async (constraint) => {
      const replayed = repositoryResult('replayed');
      const { dataSource, transaction } = scriptedDataSource([
        uniqueViolation(constraint),
        replayed,
      ]);
      const repository = new PostgresPokeLoungeRoomRepository(dataSource);

      await expect(repository.create(createInput())).resolves.toEqual(replayed);
      expect(transaction).toHaveBeenCalledTimes(2);
    },
  );

  it('re-reads a mutation receipt after a residual global actor/key conflict', async () => {
    const conflict = repositoryResult('idempotency-conflict');
    const { dataSource, transaction } = scriptedDataSource([
      uniqueViolation(ACTOR_KEY_CONSTRAINT),
      conflict,
    ]);
    const repository = new PostgresPokeLoungeRoomRepository(dataSource);

    await expect(repository.mutate(mutateInput())).resolves.toEqual(conflict);
    expect(transaction).toHaveBeenCalledTimes(2);
  });
});

function createReplayManager(
  events: string[],
  commandLockParameters: unknown[][],
): EntityManager {
  const manager = {
    query(sql: string, parameters: unknown[] = []) {
      const event = sql.includes('$1, $2') ? 'command-lock' : 'creation-lock';
      events.push(event);
      if (event === 'command-lock') {
        commandLockParameters.push(parameters);
      }

      return Promise.resolve([]);
    },
    getRepository(entity: unknown) {
      if (entity !== PokeLoungeRoomCommand) {
        throw new Error('Unexpected repository requested');
      }

      return {
        findOne() {
          return Promise.resolve(receipt());
        },
      };
    },
  };

  return manager as unknown as EntityManager;
}

function createMissingRoomManager(
  events: string[],
  commandLockParameters: unknown[][],
): EntityManager {
  let queryBuilderCount = 0;
  const manager = {
    query(sql: string, parameters: unknown[] = []) {
      events.push(sql.includes('$1, $2') ? 'command-lock' : 'other-lock');
      commandLockParameters.push(parameters);

      return Promise.resolve([]);
    },
    getRepository(entity: unknown) {
      if (entity !== PokeLoungeRoom) {
        throw new Error('Unexpected repository requested');
      }

      return {
        createQueryBuilder() {
          queryBuilderCount += 1;
          if (queryBuilderCount === 1) {
            events.push('purge');
            return new FakeDeleteQueryBuilder();
          }

          events.push('room-lock');
          return new FakeRoomQueryBuilder();
        },
      };
    },
  };

  return manager as unknown as EntityManager;
}

class FakeDeleteQueryBuilder {
  delete(): this {
    return this;
  }

  where(): this {
    return this;
  }

  execute(): Promise<{ affected: number }> {
    return Promise.resolve({ affected: 0 });
  }
}

class FakeRoomQueryBuilder {
  setLock(): this {
    return this;
  }

  where(): this {
    return this;
  }

  getOne(): Promise<null> {
    return Promise.resolve(null);
  }
}

function managerDataSource(manager: EntityManager): DataSource {
  return {
    transaction<T>(runInTransaction: (value: EntityManager) => Promise<T>) {
      return runInTransaction(manager);
    },
  } as unknown as DataSource;
}

async function captureCreateCommandLock(
  input: CreateInput,
): Promise<unknown[]> {
  const events: string[] = [];
  const commandLockParameters: unknown[][] = [];
  const repository = new PostgresPokeLoungeRoomRepository(
    managerDataSource(createReplayManager(events, commandLockParameters)),
  );

  await repository.create(input);

  if (!commandLockParameters[0]) {
    throw new Error('Command advisory lock was not acquired');
  }

  return commandLockParameters[0];
}

function scriptedDataSource(steps: unknown[]): {
  dataSource: DataSource;
  transaction: jest.Mock<Promise<unknown>, []>;
} {
  const transaction = jest.fn<Promise<unknown>, []>(() => {
    const step = steps.shift();

    if (step instanceof Error) {
      return Promise.reject(step);
    }

    if (step === undefined) {
      return Promise.reject(new Error('Transaction script exhausted'));
    }

    return Promise.resolve(step);
  });

  return {
    dataSource: { transaction } as unknown as DataSource,
    transaction,
  };
}

function uniqueViolation(constraint: string): QueryFailedError {
  const driverError = Object.assign(new Error('duplicate key'), {
    code: '23505',
    constraint,
  });

  return new QueryFailedError('INSERT', [], driverError);
}

function createInput(overrides: Partial<CreateInput> = {}): CreateInput {
  return {
    room: snapshot(),
    actorPlayerId: 'player-a',
    idempotencyKey: IDEMPOTENCY_KEY,
    requestHash: 'a'.repeat(64),
    nowMs: 1_000,
    ...overrides,
  };
}

function mutateInput() {
  return {
    roomCode: 'ROOM01',
    actorPlayerId: 'player-a',
    idempotencyKey: IDEMPOTENCY_KEY,
    requestHash: 'b'.repeat(64),
    expectedRevision: 0,
    nowMs: 2_000,
    apply: (room: PokeLoungeRoomSnapshot) => room,
  };
}

function receipt(): PokeLoungeRoomCommand {
  return {
    roomId: '00000000-0000-4000-8000-000000000001',
    actorPlayerId: 'player-a',
    idempotencyKey: IDEMPOTENCY_KEY,
    requestHash: 'a'.repeat(64),
    responseState: snapshot(),
    responseRevision: 0,
  } as PokeLoungeRoomCommand;
}

function repositoryResult(
  outcome: PokeLoungeRepositoryResult['outcome'],
): PokeLoungeRepositoryResult {
  return {
    snapshot: snapshot(),
    outcome,
    committedChange: false,
  };
}

function snapshot(): PokeLoungeRoomSnapshot {
  return {
    roomCode: 'ROOM01',
    status: 'waiting',
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
    participants: [],
    partySnapshots: {},
    round: {
      index: 1,
      phase: 'waiting',
      durationMs: 1_000,
      startedAtMs: null,
      endsAtMs: null,
    },
    tournament: { matches: [], cumulativeScores: {} },
    finalStandings: [],
    revision: 0,
    expiresAtMs: 1_801_000,
  };
}
