import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  canonicalize,
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  createCanonicalIdRecord,
  createSeededRandom,
  resolveTurn,
  validateCompetitiveAction,
  type CanonicalCompetitiveAction,
} from '@vscoke/poke-lounge-battle';
import { DataSource, type EntityManager } from 'typeorm';
import { PokeLoungeRoom } from '../entities/poke-lounge-room.entity';
import { PokeLoungeCompetitiveMatch } from '../entities/poke-lounge-competitive-match.entity';
import type { PokeLoungeRoomSnapshot } from '../poke-lounge-room.repository';
import { PokeLoungeCompetitiveAction } from './competitive-action.entity';
import type {
  CompetitiveActionRepository,
  CompetitiveActionResult,
} from './competitive-action.repository';
import type {
  CompetitiveActionProjection,
  SubmitCompetitiveActionInput,
} from './competitive-action.types';

@Injectable()
export class PostgresCompetitiveActionRepository implements CompetitiveActionRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  submit(
    input: SubmitCompetitiveActionInput,
  ): Promise<CompetitiveActionResult> {
    return this.dataSource.transaction(async (manager) => {
      const room = await lockRoom(manager, input.roomCode);
      if (!room) {
        return { outcome: 'room-not-found' };
      }

      const match = await lockMatch(manager, room.id, input.matchId);
      if (!match) {
        return { outcome: 'match-not-found' };
      }
      if (!isSupportedCompetitiveRuleset(match)) {
        return { outcome: 'ruleset-mismatch' };
      }

      const actor = match.playerAccounts.find(
        (candidate) => candidate.accountId === input.accountId,
      );
      if (!actor) {
        return { outcome: 'actor-not-assigned' };
      }

      const actionRepository = manager.getRepository(
        PokeLoungeCompetitiveAction,
      );
      const requestHash = hashCompetitiveActionRequest(input);
      const existingCommand = await actionRepository
        .createQueryBuilder('action')
        .addSelect(['action.requestHash', 'action.response'])
        .where('action.matchId = :matchId', { matchId: match.matchId })
        .andWhere('action.actorPlayerId = :actorPlayerId', {
          actorPlayerId: actor.playerId,
        })
        .andWhere('action.clientCommandId = :clientCommandId', {
          clientCommandId: input.clientCommandId,
        })
        .getOne();

      if (existingCommand) {
        if (existingCommand.requestHash !== requestHash) {
          return { outcome: 'command-conflict' };
        }

        return {
          outcome: 'replayed',
          response: structuredClone(existingCommand.response),
          room: snapshotFromEntity(room),
          committed: false,
        };
      }

      if (match.status === 'completed' || match.currentState.terminal) {
        return { outcome: 'terminal' };
      }
      if (match.assignmentRevision !== input.assignmentRevision) {
        return { outcome: 'assignment-revision-conflict' };
      }
      if (match.currentTurn !== input.turn) {
        return { outcome: 'turn-conflict' };
      }

      try {
        validateCompetitiveAction({
          state: match.currentState,
          playerId: actor.playerId,
          action: input.action,
        });
      } catch {
        return { outcome: 'illegal-action' };
      }

      const turnActions = await actionRepository
        .createQueryBuilder('action')
        .addSelect(['action.action'])
        .where('action.matchId = :matchId', { matchId: match.matchId })
        .andWhere('action.turn = :turn', { turn: match.currentTurn })
        .orderBy('action.actorPlayerId', 'ASC')
        .getMany();

      if (
        turnActions.some((receipt) => receipt.actorPlayerId === actor.playerId)
      ) {
        return { outcome: 'actor-turn-conflict' };
      }

      const canonicalAction = canonicalize(input.action);
      if (turnActions.length === 0) {
        match.status = 'active';
        await manager.getRepository(PokeLoungeCompetitiveMatch).save(match);
        await markRoomUpdated(manager, room);
        const response = toProjection(match, input.turn);
        await actionRepository.save(
          actionRepository.create({
            matchId: match.matchId,
            roomId: room.id,
            turn: input.turn,
            actorPlayerId: actor.playerId,
            actorAccountId: actor.accountId,
            clientCommandId: input.clientCommandId,
            action: input.action,
            canonicalAction,
            requestHash,
            status: 'pending',
            response,
            resolvedAt: null,
          }),
        );

        return {
          outcome: 'accepted',
          response,
          room: snapshotFromEntity(room),
          committed: true,
        };
      }

      if (turnActions.length !== 1) {
        return { outcome: 'turn-conflict' };
      }

      const actionsByPlayerId =
        createCanonicalIdRecord<CanonicalCompetitiveAction>([
          [turnActions[0].actorPlayerId, turnActions[0].action],
          [actor.playerId, input.action],
        ]);
      const resolved = resolveTurn({
        state: match.currentState,
        actionsByPlayerId,
        random: createSeededRandom(`${match.serverSeed}:${match.currentTurn}`),
      });
      if (resolved.terminal && resolved.terminal.reason !== 'faint') {
        throw new Error(
          'Stage 3 engine produced an unsupported terminal reason',
        );
      }

      match.currentState = resolved.state;
      match.currentStateHash = resolved.stateHash;
      match.currentTurn = resolved.state.turn;
      match.terminalResult = resolved.terminal;
      match.status = resolved.terminal ? 'completed' : 'active';
      match.completedAt = resolved.terminal ? new Date() : null;
      await manager.getRepository(PokeLoungeCompetitiveMatch).save(match);
      await markRoomUpdated(manager, room);

      const response = toProjection(match, input.turn);
      const resolvedAt = new Date();
      const resolvedReceipt = actionRepository.create({
        matchId: match.matchId,
        roomId: room.id,
        turn: input.turn,
        actorPlayerId: actor.playerId,
        actorAccountId: actor.accountId,
        clientCommandId: input.clientCommandId,
        action: input.action,
        canonicalAction,
        requestHash,
        status: 'resolved',
        response,
        resolvedAt,
      });
      resolveTurnReceipts(
        [turnActions[0], resolvedReceipt],
        response,
        resolvedAt,
      );
      await actionRepository.save([turnActions[0], resolvedReceipt]);

      return {
        outcome: 'accepted',
        response,
        room: snapshotFromEntity(room),
        committed: true,
      };
    });
  }
}

export function hashCompetitiveActionRequest(
  input: Pick<
    SubmitCompetitiveActionInput,
    'matchId' | 'assignmentRevision' | 'turn' | 'clientCommandId' | 'action'
  >,
): string {
  return createHash('sha256')
    .update(
      canonicalize({
        matchId: input.matchId,
        assignmentRevision: input.assignmentRevision,
        turn: input.turn,
        clientCommandId: input.clientCommandId,
        action: input.action,
      }),
      'utf8',
    )
    .digest('hex');
}

export function isSupportedCompetitiveRuleset(input: {
  rulesetVersion: number;
  rulesetHash: string;
}): boolean {
  return (
    input.rulesetVersion === COMPETITIVE_RULESET_VERSION &&
    input.rulesetHash === COMPETITIVE_RULESET_HASH
  );
}

export function resolveTurnReceipts(
  receipts: [PokeLoungeCompetitiveAction, PokeLoungeCompetitiveAction],
  response: CompetitiveActionProjection,
  resolvedAt: Date,
): void {
  for (const receipt of receipts) {
    receipt.status = 'resolved';
    receipt.response = structuredClone(response);
    receipt.resolvedAt = resolvedAt;
  }
}

function toProjection(
  match: PokeLoungeCompetitiveMatch,
  submittedTurn: number,
): CompetitiveActionProjection {
  return {
    matchId: match.matchId,
    assignmentRevision: match.assignmentRevision,
    submittedTurn,
    currentTurn: match.currentTurn,
    status: match.status,
    playerIds: [
      match.currentState.participantIds[0],
      match.currentState.participantIds[1],
    ],
    stateHash: match.currentStateHash,
    terminal: structuredClone(match.terminalResult),
  };
}

function lockRoom(
  manager: EntityManager,
  roomCode: string,
): Promise<PokeLoungeRoom | null> {
  return manager
    .getRepository(PokeLoungeRoom)
    .createQueryBuilder('room')
    .setLock('pessimistic_write')
    .where('room.roomCode = :roomCode', {
      roomCode: roomCode.trim().toUpperCase(),
    })
    .getOne();
}

function lockMatch(
  manager: EntityManager,
  roomId: string,
  matchId: string,
): Promise<PokeLoungeCompetitiveMatch | null> {
  return manager
    .getRepository(PokeLoungeCompetitiveMatch)
    .createQueryBuilder('match')
    .setLock('pessimistic_write')
    .addSelect([
      'match.serverSeed',
      'match.initialState',
      'match.currentState',
      'match.terminalResult',
    ])
    .where('match.roomId = :roomId', { roomId })
    .andWhere('match.matchId = :matchId', { matchId })
    .getOne();
}

function snapshotFromEntity(room: PokeLoungeRoom): PokeLoungeRoomSnapshot {
  return {
    ...structuredClone(room.state),
    roomCode: room.roomCode,
    revision: room.revision,
    expiresAtMs: room.expiresAt.getTime(),
  };
}

async function markRoomUpdated(
  manager: EntityManager,
  room: PokeLoungeRoom,
): Promise<void> {
  const committedAt = new Date();
  room.revision += 1;
  room.state.updatedAtMs = committedAt.getTime();
  room.updatedAt = committedAt;
  await manager.getRepository(PokeLoungeRoom).save(room);
}
