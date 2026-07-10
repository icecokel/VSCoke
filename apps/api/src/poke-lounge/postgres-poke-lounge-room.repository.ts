import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  type DeleteResult,
} from 'typeorm';
import { PokeLoungeRoomCommand } from './entities/poke-lounge-room-command.entity';
import { PokeLoungeRoom } from './entities/poke-lounge-room.entity';
import {
  advancePokeLoungeRoomClock,
  getPokeLoungeRoomExpiresAtMs,
  POKE_LOUNGE_CREATION_ADVISORY_LOCK,
  POKE_LOUNGE_ROOM_CAPACITY,
} from './poke-lounge-room-policy';
import type {
  PokeLoungeCreateResult,
  PokeLoungeRepositoryResult,
  PokeLoungeRoomRepository,
  PokeLoungeRoomSnapshot,
} from './poke-lounge-room.repository';
import type { PokeLoungeRoomState } from './poke-lounge-room.types';

const ROOM_CODE_CONSTRAINT = 'UQ_poke_lounge_room_room_code';
const COMMAND_RECEIPT_CONSTRAINTS = [
  'UQ_poke_lounge_room_command_actor_key',
  'UQ_poke_lounge_room_command_room_actor_key',
] as const;
type CreateRoomInput = Parameters<PokeLoungeRoomRepository['create']>[0];
type MutateRoomInput = Parameters<PokeLoungeRoomRepository['mutate']>[0];

@Injectable()
export class PostgresPokeLoungeRoomRepository implements PokeLoungeRoomRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(input: CreateRoomInput): Promise<PokeLoungeCreateResult> {
    for (;;) {
      try {
        return await this.createInTransaction(input);
      } catch (error) {
        if (isUniqueConstraintViolation(error, ROOM_CODE_CONSTRAINT)) {
          return { outcome: 'room-code-collision' };
        }

        if (isCommandReceiptUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }
  }

  async getAndAdvance(
    roomCode: string,
    nowMs: number,
  ): Promise<{
    snapshot: PokeLoungeRoomSnapshot | null;
    committedChange: boolean;
  }> {
    return this.dataSource.transaction(async (manager) => {
      await purgeExpiredWithManager(manager, nowMs);
      const room = await this.lockRoomByCode(manager, roomCode);

      if (!room) {
        return { snapshot: null, committedChange: false };
      }

      const currentSnapshot = snapshotFromEntity(room);
      const advancedSnapshot = advancePokeLoungeRoomClock(
        currentSnapshot,
        nowMs,
      );

      if (!advancedSnapshot) {
        return { snapshot: currentSnapshot, committedChange: false };
      }

      await saveSnapshot(manager, room, advancedSnapshot);

      return { snapshot: advancedSnapshot, committedChange: true };
    });
  }

  async mutate(
    input: MutateRoomInput,
  ): Promise<PokeLoungeRepositoryResult | null> {
    for (;;) {
      try {
        return await this.mutateInTransaction(input);
      } catch (error) {
        if (isCommandReceiptUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }
  }

  async purgeExpired(nowMs: number): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      return purgeExpiredWithManager(manager, nowMs);
    });
  }

  private createInTransaction(
    input: CreateRoomInput,
  ): Promise<PokeLoungeCreateResult> {
    return this.dataSource.transaction(async (manager) => {
      await lockCommandReceiptKey(
        manager,
        input.actorPlayerId,
        input.idempotencyKey,
      );
      await manager.query('SELECT pg_advisory_xact_lock($1)', [
        POKE_LOUNGE_CREATION_ADVISORY_LOCK,
      ]);

      const commandRepository = manager.getRepository(PokeLoungeRoomCommand);
      const existingCommand = await commandRepository.findOne({
        where: {
          actorPlayerId: input.actorPlayerId,
          idempotencyKey: input.idempotencyKey,
        },
      });

      if (existingCommand) {
        if (existingCommand.requestHash === input.requestHash) {
          return createResult(
            receiptSnapshot(existingCommand),
            'replayed',
            false,
          );
        }

        const currentRoom = await this.lockRoomById(
          manager,
          existingCommand.roomId,
        );
        const snapshot = currentRoom
          ? snapshotFromEntity(currentRoom)
          : receiptSnapshot(existingCommand);

        return createResult(snapshot, 'idempotency-conflict', false);
      }

      await purgeExpiredWithManager(manager, input.nowMs);

      const roomRepository = manager.getRepository(PokeLoungeRoom);
      const roomCount = await roomRepository.count();

      if (roomCount >= POKE_LOUNGE_ROOM_CAPACITY) {
        return { outcome: 'capacity-reached' };
      }

      const snapshot = prepareCreatedSnapshot(input.room);
      const room = await roomRepository.save(
        roomRepository.create({
          roomCode: snapshot.roomCode,
          state: storedStateFromSnapshot(snapshot),
          revision: snapshot.revision,
          expiresAt: new Date(snapshot.expiresAtMs),
        }),
      );

      await commandRepository.save(
        commandRepository.create({
          roomId: room.id,
          actorPlayerId: input.actorPlayerId,
          idempotencyKey: input.idempotencyKey,
          requestHash: input.requestHash,
          responseState: structuredClone(snapshot),
          responseRevision: snapshot.revision,
        }),
      );

      return createResult(snapshot, 'committed', true);
    });
  }

  private mutateInTransaction(
    input: MutateRoomInput,
  ): Promise<PokeLoungeRepositoryResult | null> {
    return this.dataSource.transaction(async (manager) => {
      await lockCommandReceiptKey(
        manager,
        input.actorPlayerId,
        input.idempotencyKey,
      );
      await purgeExpiredWithManager(manager, input.nowMs);
      const room = await this.lockRoomByCode(manager, input.roomCode);

      if (!room) {
        return null;
      }

      const commandRepository = manager.getRepository(PokeLoungeRoomCommand);
      const existingCommand = await commandRepository.findOne({
        where: {
          actorPlayerId: input.actorPlayerId,
          idempotencyKey: input.idempotencyKey,
        },
      });

      if (existingCommand?.requestHash === input.requestHash) {
        return createResult(
          receiptSnapshot(existingCommand),
          'replayed',
          false,
        );
      }

      const currentSnapshot = snapshotFromEntity(room);
      const advancedSnapshot = advancePokeLoungeRoomClock(
        currentSnapshot,
        input.nowMs,
      );

      if (advancedSnapshot) {
        await saveSnapshot(manager, room, advancedSnapshot);

        return createResult(
          advancedSnapshot,
          existingCommand ? 'idempotency-conflict' : 'revision-conflict',
          true,
        );
      }

      if (existingCommand) {
        return createResult(currentSnapshot, 'idempotency-conflict', false);
      }

      if (currentSnapshot.revision !== input.expectedRevision) {
        return createResult(currentSnapshot, 'revision-conflict', false);
      }

      const appliedSnapshot = input.apply(structuredClone(currentSnapshot));
      const nextSnapshot = prepareMutatedSnapshot(
        currentSnapshot,
        appliedSnapshot,
      );

      await saveSnapshot(manager, room, nextSnapshot);
      await commandRepository.save(
        commandRepository.create({
          roomId: room.id,
          actorPlayerId: input.actorPlayerId,
          idempotencyKey: input.idempotencyKey,
          requestHash: input.requestHash,
          responseState: structuredClone(nextSnapshot),
          responseRevision: nextSnapshot.revision,
        }),
      );

      return createResult(nextSnapshot, 'committed', true);
    });
  }

  private lockRoomByCode(
    manager: EntityManager,
    roomCode: string,
  ): Promise<PokeLoungeRoom | null> {
    return manager
      .getRepository(PokeLoungeRoom)
      .createQueryBuilder('room')
      .setLock('pessimistic_write')
      .where('room.roomCode = :roomCode', {
        roomCode: normalizeRoomCode(roomCode),
      })
      .getOne();
  }

  private lockRoomById(
    manager: EntityManager,
    roomId: string,
  ): Promise<PokeLoungeRoom | null> {
    return manager
      .getRepository(PokeLoungeRoom)
      .createQueryBuilder('room')
      .setLock('pessimistic_write')
      .where('room.id = :roomId', { roomId })
      .getOne();
  }
}

function prepareCreatedSnapshot(
  room: PokeLoungeRoomSnapshot,
): PokeLoungeRoomSnapshot {
  const snapshot = structuredClone(room);
  snapshot.roomCode = normalizeRoomCode(snapshot.roomCode);
  snapshot.revision = 0;
  snapshot.expiresAtMs = getPokeLoungeRoomExpiresAtMs(snapshot);

  return snapshot;
}

function prepareMutatedSnapshot(
  current: PokeLoungeRoomSnapshot,
  applied: PokeLoungeRoomSnapshot,
): PokeLoungeRoomSnapshot {
  const snapshot = structuredClone(applied);
  snapshot.roomCode = current.roomCode;
  snapshot.revision = current.revision + 1;
  snapshot.expiresAtMs = getPokeLoungeRoomExpiresAtMs(snapshot);

  return snapshot;
}

function snapshotFromEntity(room: PokeLoungeRoom): PokeLoungeRoomSnapshot {
  return {
    ...structuredClone(room.state),
    roomCode: room.roomCode,
    revision: room.revision,
    expiresAtMs: room.expiresAt.getTime(),
  };
}

function receiptSnapshot(
  command: PokeLoungeRoomCommand,
): PokeLoungeRoomSnapshot {
  return {
    ...structuredClone(command.responseState),
    revision: command.responseRevision,
  };
}

function storedStateFromSnapshot(
  snapshot: PokeLoungeRoomSnapshot,
): PokeLoungeRoomState {
  const state = structuredClone(snapshot);

  return {
    roomCode: state.roomCode,
    status: state.status,
    createdAtMs: state.createdAtMs,
    updatedAtMs: state.updatedAtMs,
    participants: state.participants,
    partySnapshots: state.partySnapshots,
    round: state.round,
    tournament: state.tournament,
    finalStandings: state.finalStandings,
  };
}

async function saveSnapshot(
  manager: EntityManager,
  room: PokeLoungeRoom,
  snapshot: PokeLoungeRoomSnapshot,
): Promise<void> {
  room.roomCode = snapshot.roomCode;
  room.state = storedStateFromSnapshot(snapshot);
  room.revision = snapshot.revision;
  room.expiresAt = new Date(snapshot.expiresAtMs);
  await manager.getRepository(PokeLoungeRoom).save(room);
}

async function lockCommandReceiptKey(
  manager: EntityManager,
  actorPlayerId: string,
  idempotencyKey: string,
): Promise<void> {
  const digest = createHash('sha256')
    .update(actorPlayerId)
    .update('\0')
    .update(idempotencyKey)
    .digest();

  await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
    digest.readInt32BE(0),
    digest.readInt32BE(4),
  ]);
}

async function purgeExpiredWithManager(
  manager: EntityManager,
  nowMs: number,
): Promise<number> {
  const result: DeleteResult = await manager
    .getRepository(PokeLoungeRoom)
    .createQueryBuilder()
    .delete()
    .where('"expires_at" < :expiresAt', { expiresAt: new Date(nowMs) })
    .execute();

  return result.affected ?? 0;
}

function createResult(
  snapshot: PokeLoungeRoomSnapshot,
  outcome: PokeLoungeRepositoryResult['outcome'],
  committedChange: boolean,
): PokeLoungeRepositoryResult {
  return {
    snapshot: structuredClone(snapshot),
    outcome,
    committedChange,
  };
}

function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

function isUniqueConstraintViolation(
  error: unknown,
  constraint: string,
): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };

  return driverError.code === '23505' && driverError.constraint === constraint;
}

function isCommandReceiptUniqueViolation(error: unknown): boolean {
  return COMMAND_RECEIPT_CONSTRAINTS.some((constraint) => {
    return isUniqueConstraintViolation(error, constraint);
  });
}
