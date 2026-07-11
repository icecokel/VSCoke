import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { PokeLoungeCompetitiveMatch } from '../entities/poke-lounge-competitive-match.entity';
import { PokeLoungeCompetitiveSeat } from '../entities/poke-lounge-competitive-seat.entity';
import { PokeLoungeRoom } from '../entities/poke-lounge-room.entity';
import type {
  CompetitiveMatchRepository,
  CompetitiveSeatBindingResult,
} from './competitive-match.repository';
import { planCompetitiveSeatBinding } from './competitive-match.repository';
import type { CompetitiveMatchAssignment } from './competitive-match.types';

@Injectable()
export class PostgresCompetitiveMatchRepository implements CompetitiveMatchRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  bindSeatAndAssign(
    input: Parameters<CompetitiveMatchRepository['bindSeatAndAssign']>[0],
  ): Promise<CompetitiveSeatBindingResult> {
    return this.dataSource.transaction(async (manager) => {
      const room = await lockRoom(manager, input.roomCode);
      if (!room) {
        return { outcome: 'room-not-found' };
      }

      const seatRepository = manager.getRepository(PokeLoungeCompetitiveSeat);
      const seats = await seatRepository.find({ where: { roomId: room.id } });
      const plan = planCompetitiveSeatBinding({
        room: room.state,
        seats,
        sessionId: input.sessionId,
        accountId: input.accountId,
      });

      if (!('assignmentPlayers' in plan)) {
        return plan;
      }

      if (plan.outcome === 'bind') {
        await seatRepository.save(
          seatRepository.create({ roomId: room.id, ...plan.seat }),
        );
      }

      const matchRepository = manager.getRepository(PokeLoungeCompetitiveMatch);
      const existingMatch = await matchRepository
        .createQueryBuilder('match')
        .addSelect([
          'match.serverSeed',
          'match.initialState',
          'match.currentState',
          'match.terminalResult',
        ])
        .where('match.roomId = :roomId', { roomId: room.id })
        .getOne();

      if (existingMatch) {
        return {
          outcome: 'already-assigned',
          assignment: assignmentFromEntity(existingMatch),
        };
      }
      if (!plan.assignmentPlayers) {
        return { outcome: 'bound-casual', assignment: null };
      }

      const assignment = input.createAssignment({
        roomId: room.id,
        roomCode: room.roomCode,
        assignmentRevision: 1,
        players: plan.assignmentPlayers,
      });
      const saved = await matchRepository.save(
        matchRepository.create(assignment),
      );

      return { outcome: 'assigned', assignment: assignmentFromEntity(saved) };
    });
  }

  async findAssignmentByRoomCode(
    roomCode: string,
  ): Promise<CompetitiveMatchAssignment | null> {
    const match = await this.dataSource
      .getRepository(PokeLoungeCompetitiveMatch)
      .createQueryBuilder('match')
      .addSelect([
        'match.serverSeed',
        'match.initialState',
        'match.currentState',
        'match.terminalResult',
      ])
      .where('match.roomCode = :roomCode', {
        roomCode: normalizeRoomCode(roomCode),
      })
      .getOne();

    return match ? assignmentFromEntity(match) : null;
  }
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
      roomCode: normalizeRoomCode(roomCode),
    })
    .getOne();
}

function assignmentFromEntity(
  match: PokeLoungeCompetitiveMatch,
): CompetitiveMatchAssignment {
  return {
    roomId: match.roomId,
    roomCode: match.roomCode,
    matchId: match.matchId,
    assignmentRevision: match.assignmentRevision,
    playerAccounts: structuredClone(match.playerAccounts),
    rulesetVersion: match.rulesetVersion,
    rulesetHash: match.rulesetHash,
    serverSeed: match.serverSeed,
    initialState: structuredClone(match.initialState),
    initialStateHash: match.initialStateHash,
    currentState: structuredClone(match.currentState),
    currentStateHash: match.currentStateHash,
    currentTurn: match.currentTurn,
    status: match.status,
    terminalResult: structuredClone(match.terminalResult),
    completedAt: match.completedAt,
  };
}

function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}
