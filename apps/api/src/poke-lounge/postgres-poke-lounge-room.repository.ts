import { createHash } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  createCanonicalIdRecord,
  hashCanonicalState,
  type CanonicalTerminalResult,
} from '@vscoke/poke-lounge-battle';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  type DeleteResult,
} from 'typeorm';
import { PokeLoungeRoomCommand } from './entities/poke-lounge-room-command.entity';
import { PokeLoungeCompetitiveMatch } from './entities/poke-lounge-competitive-match.entity';
import { PokeLoungeCompetitiveSeat } from './entities/poke-lounge-competitive-seat.entity';
import { PokeLoungeRoom } from './entities/poke-lounge-room.entity';
import { VerifiedPokeLoungeHistoryWriter } from '../game/verified-poke-lounge-history-writer.service';
import { PokeLoungeCompetitiveAction } from './competitive/competitive-action.entity';
import { createCompetitiveAssignment } from './competitive/competitive-match.service';
import {
  finalizeCompetitiveTerminalMatch,
  resolveTurnReceipts,
} from './competitive/postgres-competitive-action.repository';
import type { CompetitiveActionProjection } from './competitive/competitive-action.types';
import {
  advancePokeLoungeRoomClock,
  completePokeLoungeTournamentMatch,
  getPokeLoungeRoomExpiresAtMs,
  normalizeLegacyPokeLoungeRoomSnapshot,
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
    @Optional()
    private readonly historyWriter: VerifiedPokeLoungeHistoryWriter = new VerifiedPokeLoungeHistoryWriter(),
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
      const advancedSnapshot = normalizeAndAdvanceSnapshot(
        currentSnapshot,
        nowMs,
      );

      if (!advancedSnapshot) {
        return { snapshot: currentSnapshot, committedChange: false };
      }

      await ensureActiveTournamentAssignment(manager, room, advancedSnapshot);
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
      const advancedSnapshot = normalizeAndAdvanceSnapshot(
        currentSnapshot,
        input.nowMs,
      );

      if (advancedSnapshot) {
        await ensureActiveTournamentAssignment(manager, room, advancedSnapshot);
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

      if (input.operation === 'leave') {
        await completeServerAuthorityParticipantLeave(
          manager,
          room,
          currentSnapshot,
          nextSnapshot,
          input.actorPlayerId,
          input.nowMs,
          this.historyWriter,
        );
      }
      await ensureActiveTournamentAssignment(manager, room, nextSnapshot);
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

export async function ensureActiveTournamentAssignment(
  manager: EntityManager,
  room: PokeLoungeRoom,
  snapshot: PokeLoungeRoomSnapshot,
): Promise<void> {
  const bracketMatchId = snapshot.tournament.activeMatchId;
  const bracketMatch = snapshot.tournament.bracket?.currentRound?.matches.find(
    (match) => match.matchId === bracketMatchId,
  );
  if (!bracketMatchId || !bracketMatch) {
    return;
  }

  const matchRepository = manager.getRepository(PokeLoungeCompetitiveMatch);
  const active = await matchRepository.findOne({
    where: [
      { roomId: room.id, status: 'pending' },
      { roomId: room.id, status: 'active' },
    ],
    select: {
      matchId: true,
      bracketMatchId: true,
      kind: true,
      playerAccounts: true,
      status: true,
      terminalResult: true,
      completedAt: true,
    },
  });
  if (active && active.bracketMatchId !== bracketMatchId) {
    await matchRepository.delete({ matchId: active.matchId });
  }
  const seats = await manager
    .getRepository(PokeLoungeCompetitiveSeat)
    .find({ where: { roomId: room.id } });
  const players = bracketMatch.participantIds.map((playerId) => {
    const seat = seats.find((candidate) => candidate.playerId === playerId);
    return seat ? { playerId: seat.playerId, accountId: seat.accountId } : null;
  });
  if (!players[0] || !players[1]) {
    snapshot.tournament.activeMatchAuthority = 'casual';
    return;
  }

  const assignmentPlayers = [players[0], players[1]] as const;
  const assignmentKind =
    snapshot.tournament.bracket?.participants.length === 2
      ? 'ranked-head-to-head'
      : 'tournament-unranked';
  const existing =
    active?.bracketMatchId === bracketMatchId
      ? active
      : await matchRepository.findOne({
          where: { roomId: room.id, bracketMatchId },
          select: {
            matchId: true,
            bracketMatchId: true,
            kind: true,
            playerAccounts: true,
            status: true,
            terminalResult: true,
            completedAt: true,
          },
        });
  if (existing) {
    const assignmentMatchesBracket =
      existing.kind === assignmentKind &&
      hasSameCompetitivePlayers(existing.playerAccounts, assignmentPlayers);
    if (!assignmentMatchesBracket) {
      if (existing.status === 'completed') {
        throw new Error(
          'Completed competitive match does not match the activated bracket',
        );
      }
      await matchRepository.delete({ matchId: existing.matchId });
    } else {
      snapshot.tournament.activeMatchAuthority = 'server';
      if (existing.status === 'completed' && existing.terminalResult) {
        completePokeLoungeTournamentMatch(
          snapshot,
          bracketMatchId,
          existing.terminalResult.winnerPlayerId,
          existing.terminalResult.reason,
          existing.completedAt?.getTime() ?? nowFromSnapshot(snapshot),
        );
      }
      return;
    }
  }

  const assignment = createCompetitiveAssignment({
    roomId: room.id,
    roomCode: room.roomCode,
    bracketMatchId,
    kind: assignmentKind,
    assignmentRevision: 1,
    players: [...assignmentPlayers],
  });
  await matchRepository.save(matchRepository.create(assignment));
  snapshot.tournament.activeMatchAuthority = 'server';
}

export async function completeServerAuthorityParticipantLeave(
  manager: EntityManager,
  room: PokeLoungeRoom,
  currentSnapshot: PokeLoungeRoomSnapshot,
  nextSnapshot: PokeLoungeRoomSnapshot,
  playerId: string,
  nowMs: number,
  historyWriter: VerifiedPokeLoungeHistoryWriter = new VerifiedPokeLoungeHistoryWriter(),
): Promise<void> {
  const activeBracketMatchId = currentSnapshot.tournament.activeMatchId;
  if (
    currentSnapshot.status !== 'tournament' ||
    currentSnapshot.tournament.activeMatchAuthority !== 'server' ||
    !activeBracketMatchId
  ) {
    return;
  }

  const bracketMatch =
    currentSnapshot.tournament.bracket?.currentRound?.matches.find(
      (candidate) => candidate.matchId === activeBracketMatchId,
    );
  if (
    bracketMatch?.status !== 'ready' ||
    !bracketMatch.participantIds.includes(playerId)
  ) {
    return;
  }

  const winnerPlayerId = bracketMatch.participantIds.find(
    (candidate) => candidate !== playerId,
  );
  if (!winnerPlayerId) {
    return;
  }

  const match = await manager
    .getRepository(PokeLoungeCompetitiveMatch)
    .createQueryBuilder('match')
    .setLock('pessimistic_write')
    .addSelect([
      'match.currentState',
      'match.terminalResult',
      'match.historyPublication',
    ])
    .where('match.roomId = :roomId', { roomId: room.id })
    .andWhere('match.bracketMatchId = :bracketMatchId', {
      bracketMatchId: activeBracketMatchId,
    })
    .andWhere('match.status IN (:...statuses)', {
      statuses: ['pending', 'active'],
    })
    .getOne();
  if (!match) {
    throw new Error('Active server-authority match is missing');
  }

  const terminal = Object.assign(Object.create(null), {
    winnerPlayerId,
    loserPlayerId: playerId,
    reason: 'forfeit',
    scoreByPlayerId: createCanonicalIdRecord([
      [winnerPlayerId, 100],
      [playerId, 50],
    ]),
  }) as CanonicalTerminalResult;
  match.currentState.terminal = terminal;
  match.currentStateHash = hashCanonicalState(match.currentState);
  match.terminalResult = terminal;
  match.status = 'completed';
  match.completedAt = new Date(nowMs);
  const finalized = await finalizeCompetitiveTerminalMatch(
    manager,
    room,
    match,
    nextSnapshot.revision,
    historyWriter,
    nextSnapshot,
  );
  nextSnapshot.competitiveTransitions = [
    terminalTransitionFromFinalizedProjection(finalized.projection),
  ];
  if (finalized.nextCompetitive) {
    nextSnapshot.competitive = finalized.nextCompetitive;
  }

  const actionRepository = manager.getRepository(PokeLoungeCompetitiveAction);
  const pendingReceipts = await actionRepository
    .createQueryBuilder('action')
    .addSelect(['action.response'])
    .where('action.matchId = :matchId', { matchId: match.matchId })
    .andWhere('action.status = :status', { status: 'pending' })
    .orderBy('action.actorPlayerId', 'ASC')
    .getMany();
  if (pendingReceipts.length > 1) {
    throw new Error('Competitive leave found multiple pending action receipts');
  }
  if (pendingReceipts.length === 1) {
    resolveTurnReceipts(
      pendingReceipts,
      finalized.projection,
      match.completedAt,
    );
    await actionRepository.save(pendingReceipts);
  }
}

export function findCompletedCompetitiveMatchesAfterRevision(
  manager: EntityManager,
  roomId: string,
  afterRevision: number,
  currentRevision: number,
): Promise<PokeLoungeCompetitiveMatch[]> {
  if (!Number.isSafeInteger(afterRevision) || afterRevision < 0) {
    throw new Error('afterRevision must be a non-negative safe integer');
  }

  return manager
    .getRepository(PokeLoungeCompetitiveMatch)
    .createQueryBuilder('transition')
    .addSelect(['transition.currentState', 'transition.terminalResult'])
    .where('transition.roomId = :roomId', { roomId })
    .andWhere('transition.status = :status', { status: 'completed' })
    .andWhere('transition.terminalRoomRevision > :afterRevision', {
      afterRevision,
    })
    .andWhere('transition.terminalRoomRevision <= :currentRevision', {
      currentRevision,
    })
    .andWhere('transition.terminalEventId IS NOT NULL')
    .orderBy('transition.terminalRoomRevision', 'ASC')
    .addOrderBy('transition.terminalEventId', 'ASC')
    .take(8)
    .getMany();
}

function terminalTransitionFromFinalizedProjection(
  projection: CompetitiveActionProjection,
) {
  if (
    projection.status !== 'completed' ||
    projection.terminalEventId === null ||
    projection.terminalRoomRevision === null
  ) {
    throw new Error('Finalized competitive projection metadata is missing');
  }

  return {
    terminalEventId: projection.terminalEventId,
    terminalRoomRevision: projection.terminalRoomRevision,
    projection: structuredClone(projection),
  };
}

function hasSameCompetitivePlayers(
  left: ReadonlyArray<{ playerId: string; accountId: string }>,
  right: ReadonlyArray<{ playerId: string; accountId: string }>,
): boolean {
  return (
    left.length === right.length &&
    left.every((player) =>
      right.some(
        (candidate) =>
          candidate.playerId === player.playerId &&
          candidate.accountId === player.accountId,
      ),
    )
  );
}

function nowFromSnapshot(snapshot: PokeLoungeRoomSnapshot): number {
  return snapshot.updatedAtMs;
}

function normalizeAndAdvanceSnapshot(
  currentSnapshot: PokeLoungeRoomSnapshot,
  nowMs: number,
): PokeLoungeRoomSnapshot | null {
  const normalized = normalizeLegacyPokeLoungeRoomSnapshot(
    currentSnapshot,
    nowMs,
  );
  const clockInput = normalized
    ? { ...normalized, revision: currentSnapshot.revision }
    : currentSnapshot;
  const advanced = advancePokeLoungeRoomClock(clockInput, nowMs);

  return advanced ?? normalized;
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
