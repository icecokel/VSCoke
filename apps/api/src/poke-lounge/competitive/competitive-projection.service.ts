import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { CanonicalBattleState } from '@vscoke/poke-lounge-battle';
import { DataSource } from 'typeorm';
import { PokeLoungeCompetitiveMatch } from '../entities/poke-lounge-competitive-match.entity';
import { PokeLoungeCompetitiveAction } from './competitive-action.entity';
import type {
  CompetitiveActionProjection,
  PublicCompetitiveBattleState,
} from './competitive-action.types';

@Injectable()
export class CompetitiveProjectionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findForRoomCode(
    roomCode: string,
  ): Promise<CompetitiveActionProjection | null> {
    const match = await this.dataSource
      .getRepository(PokeLoungeCompetitiveMatch)
      .createQueryBuilder('match')
      .addSelect(['match.currentState', 'match.terminalResult'])
      .where('match.roomCode = :roomCode', {
        roomCode: roomCode.trim().toUpperCase(),
      })
      .getOne();
    if (!match) {
      return null;
    }

    const receipts = await this.dataSource
      .getRepository(PokeLoungeCompetitiveAction)
      .find({
        select: { actorPlayerId: true },
        where: { matchId: match.matchId, turn: match.currentTurn },
        order: { actorPlayerId: 'ASC' },
      });

    return toCompetitiveProjection(
      match,
      receipts.map((receipt) => receipt.actorPlayerId),
    );
  }
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
