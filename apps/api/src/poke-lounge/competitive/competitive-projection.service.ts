import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { CanonicalBattleState } from '@vscoke/poke-lounge-battle';
import { DataSource, type EntityManager } from 'typeorm';
import { PokeLoungeCompetitiveMatch } from '../entities/poke-lounge-competitive-match.entity';
import { PokeLoungeRoom } from '../entities/poke-lounge-room.entity';
import type { PokeLoungeRoomSnapshot } from '../poke-lounge-room.repository';
import { PokeLoungeCompetitiveAction } from './competitive-action.entity';
import type {
  CompetitiveActionProjection,
  PublicCompetitiveBattleState,
} from './competitive-action.types';

@Injectable()
export class CompetitiveProjectionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  findRoomSnapshot(roomCode: string): Promise<PokeLoungeRoomSnapshot | null> {
    return this.dataSource.transaction('REPEATABLE READ', (manager) =>
      this.findRoomSnapshotWithManager(manager, roomCode),
    );
  }

  private async findRoomSnapshotWithManager(
    manager: EntityManager,
    roomCode: string,
  ): Promise<PokeLoungeRoomSnapshot | null> {
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    const room = await manager
      .getRepository(PokeLoungeRoom)
      .createQueryBuilder('room')
      .where('room.roomCode = :roomCode', { roomCode: normalizedRoomCode })
      .getOne();
    if (!room) {
      return null;
    }
    await this.afterRoomRead();

    const match = await manager
      .getRepository(PokeLoungeCompetitiveMatch)
      .createQueryBuilder('match')
      .addSelect(['match.currentState', 'match.terminalResult'])
      .where('match.roomCode = :roomCode', {
        roomCode: normalizedRoomCode,
      })
      .getOne();
    if (!match) {
      return snapshotFromEntity(room);
    }

    const receipts = await manager
      .getRepository(PokeLoungeCompetitiveAction)
      .find({
        select: { actorPlayerId: true },
        where: { matchId: match.matchId, turn: match.currentTurn },
        order: { actorPlayerId: 'ASC' },
      });

    return {
      ...snapshotFromEntity(room),
      competitive: toCompetitiveProjection(
        match,
        receipts.map((receipt) => receipt.actorPlayerId),
      ),
    };
  }

  protected afterRoomRead(): Promise<void> {
    return Promise.resolve();
  }
}

function snapshotFromEntity(room: PokeLoungeRoom): PokeLoungeRoomSnapshot {
  return {
    ...structuredClone(room.state),
    roomCode: room.roomCode,
    revision: room.revision,
    expiresAtMs: room.expiresAt.getTime(),
  };
}

export function toCompetitiveProjection(
  match: Pick<
    PokeLoungeCompetitiveMatch,
    | 'matchId'
    | 'assignmentRevision'
    | 'rulesetVersion'
    | 'rulesetHash'
    | 'currentTurn'
    | 'status'
    | 'currentState'
    | 'currentStateHash'
    | 'terminalResult'
  >,
  submittedPlayerIds: readonly string[],
): CompetitiveActionProjection {
  return {
    matchId: match.matchId,
    assignmentRevision: match.assignmentRevision,
    rulesetVersion: match.rulesetVersion,
    rulesetHash: match.rulesetHash,
    currentTurn: match.currentTurn,
    status: match.status,
    playerIds: [
      match.currentState.participantIds[0],
      match.currentState.participantIds[1],
    ],
    currentState: toPublicBattleState(match.currentState),
    stateHash: match.currentStateHash,
    submittedPlayerIds: [...submittedPlayerIds].sort(),
    terminal: structuredClone(match.terminalResult),
  };
}

function toPublicBattleState(
  state: CanonicalBattleState,
): PublicCompetitiveBattleState {
  return {
    rulesetVersion: state.rulesetVersion,
    turn: state.turn,
    participantIds: [...state.participantIds],
    playersById: Object.fromEntries(
      state.participantIds.map((playerId) => {
        const player = state.playersById[playerId];
        return [
          playerId,
          {
            playerId,
            activeSlotIndex: player.activeSlotIndex,
            team: player.team.map((combatant) => ({
              speciesId: combatant.speciesId,
              maxHp: combatant.maxHp,
              currentHp: combatant.currentHp,
              status: combatant.status,
              moves: combatant.moves.map(({ moveId, pp }) => ({ moveId, pp })),
            })),
          },
        ];
      }),
    ),
    terminal: structuredClone(state.terminal),
  };
}
