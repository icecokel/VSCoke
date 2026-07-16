import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { CanonicalBattleState } from '@vscoke/poke-lounge-battle';
import { DataSource, type EntityManager } from 'typeorm';
import { PokeLoungeCompetitiveMatch } from '../entities/poke-lounge-competitive-match.entity';
import { PokeLoungeRoom } from '../entities/poke-lounge-room.entity';
import type { PokeLoungeRoomSnapshot } from '../poke-lounge-room.repository';
import type { CompetitiveTerminalTransition } from '../poke-lounge-room.types';
import { findCompletedCompetitiveMatchesAfterRevision } from '../postgres-poke-lounge-room.repository';
import { PokeLoungeCompetitiveAction } from './competitive-action.entity';
import type {
  CompetitiveActionProjection,
  PublicCompetitiveBattleState,
} from './competitive-action.types';

@Injectable()
export class CompetitiveProjectionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  findRoomSnapshot(
    roomCode: string,
    afterRevision?: number,
  ): Promise<PokeLoungeRoomSnapshot | null> {
    return this.dataSource.transaction('REPEATABLE READ', (manager) =>
      this.findRoomSnapshotWithManager(manager, roomCode, afterRevision),
    );
  }

  private async findRoomSnapshotWithManager(
    manager: EntityManager,
    roomCode: string,
    afterRevision?: number,
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

    const snapshot = snapshotFromEntity(room);
    snapshot.competitiveTransitions =
      afterRevision === undefined
        ? []
        : await this.findTerminalTransitions(
            manager,
            room.id,
            afterRevision,
            room.revision,
          );
    const activeBracketMatchId = snapshot.tournament.activeMatchId;
    if (
      !activeBracketMatchId ||
      snapshot.tournament.activeMatchAuthority !== 'server'
    ) {
      return snapshot;
    }

    const match = await manager
      .getRepository(PokeLoungeCompetitiveMatch)
      .createQueryBuilder('match')
      .addSelect(['match.currentState', 'match.terminalResult'])
      .where('match.roomId = :roomId', { roomId: room.id })
      .andWhere('match.bracketMatchId = :bracketMatchId', {
        bracketMatchId: activeBracketMatchId,
      })
      .andWhere('match.status IN (:...statuses)', {
        statuses: ['pending', 'active'],
      })
      .getOne();
    if (!match) {
      return snapshot;
    }

    const receipts = await manager
      .getRepository(PokeLoungeCompetitiveAction)
      .find({
        select: { actorPlayerId: true },
        where: { matchId: match.matchId, turn: match.currentTurn },
        order: { actorPlayerId: 'ASC' },
      });

    return {
      ...snapshot,
      competitive: toCompetitiveProjection(
        match,
        receipts.map((receipt) => receipt.actorPlayerId),
      ),
    };
  }

  private async findTerminalTransitions(
    manager: EntityManager,
    roomId: string,
    afterRevision: number,
    currentRevision: number,
  ): Promise<CompetitiveTerminalTransition[]> {
    if (!Number.isSafeInteger(afterRevision) || afterRevision < 0) {
      throw new Error('afterRevision must be a non-negative safe integer');
    }

    const matches = await findCompletedCompetitiveMatchesAfterRevision(
      manager,
      roomId,
      afterRevision,
      currentRevision,
    );

    return matches.map((match) =>
      toCompetitiveTerminalTransition(toCompetitiveProjection(match, [])),
    );
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
    | 'bracketMatchId'
    | 'kind'
    | 'assignmentRevision'
    | 'rulesetVersion'
    | 'rulesetHash'
    | 'currentTurn'
    | 'status'
    | 'currentState'
    | 'currentStateHash'
    | 'terminalResult'
  > &
    Partial<
      Pick<
        PokeLoungeCompetitiveMatch,
        'terminalEventId' | 'terminalRoomRevision'
      >
    >,
  submittedPlayerIds: readonly string[],
): CompetitiveActionProjection {
  const terminalEventId = match.terminalEventId ?? null;
  const terminalRoomRevision = match.terminalRoomRevision ?? null;
  assertProjectionMetadata({
    status: match.status,
    terminalEventId,
    terminalRoomRevision,
    terminal: match.terminalResult,
    stateTerminal: match.currentState.terminal,
  });

  return {
    matchId: match.matchId,
    bracketMatchId: match.bracketMatchId,
    kind: match.kind,
    assignmentRevision: match.assignmentRevision,
    rulesetVersion: match.rulesetVersion,
    rulesetHash: match.rulesetHash,
    currentTurn: match.currentTurn,
    status: match.status,
    terminalEventId,
    terminalRoomRevision,
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

export function toCompetitiveTerminalTransition(
  projection: CompetitiveActionProjection,
): CompetitiveTerminalTransition {
  assertProjectionMetadata({
    status: projection.status,
    terminalEventId: projection.terminalEventId,
    terminalRoomRevision: projection.terminalRoomRevision,
    terminal: projection.terminal,
    stateTerminal: projection.currentState.terminal,
  });

  if (projection.status !== 'completed') {
    throw new Error('Competitive terminal transition must be completed');
  }

  return {
    terminalEventId: projection.terminalEventId as string,
    terminalRoomRevision: projection.terminalRoomRevision as number,
    projection: structuredClone(projection),
  };
}

function assertProjectionMetadata(input: {
  status: PokeLoungeCompetitiveMatch['status'];
  terminalEventId: string | null;
  terminalRoomRevision: number | null;
  terminal: PokeLoungeCompetitiveMatch['terminalResult'];
  stateTerminal: PokeLoungeCompetitiveMatch['terminalResult'];
}): void {
  if (input.status !== 'completed') {
    if (input.terminalEventId !== null || input.terminalRoomRevision !== null) {
      throw new Error(
        'Pending or active competitive projection cannot carry terminal metadata',
      );
    }
    return;
  }

  if (
    typeof input.terminalEventId !== 'string' ||
    input.terminalEventId.length === 0 ||
    !Number.isSafeInteger(input.terminalRoomRevision) ||
    (input.terminalRoomRevision as number) < 0
  ) {
    throw new Error(
      'Completed competitive projection requires terminal metadata',
    );
  }
  if (!input.terminal || !input.stateTerminal) {
    throw new Error('Completed competitive projection requires terminal state');
  }
  if (!hasSameTerminal(input.terminal, input.stateTerminal)) {
    throw new Error('Competitive terminal projection state is inconsistent');
  }
}

function hasSameTerminal(
  left: NonNullable<PokeLoungeCompetitiveMatch['terminalResult']>,
  right: NonNullable<PokeLoungeCompetitiveMatch['terminalResult']>,
): boolean {
  return (
    left.winnerPlayerId === right.winnerPlayerId &&
    left.loserPlayerId === right.loserPlayerId &&
    left.reason === right.reason &&
    JSON.stringify(Object.entries(left.scoreByPlayerId).sort()) ===
      JSON.stringify(Object.entries(right.scoreByPlayerId).sort())
  );
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
