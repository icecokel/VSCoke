import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GameHistory } from './entities/game-history.entity';
import { User } from '../auth/entities/user.entity';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';
import { GameType } from './enums/game-type.enum';

/**
 * 게임 비즈니스 로직을 처리하는 서비스
 */
@Injectable()
export class GameService {
  constructor(
    @InjectRepository(GameHistory)
    private gameHistoryRepository: Repository<GameHistory>,
  ) {}

  /**
   * 유저의 최고 점수 조회 (기간 필터링 지원)
   */
  async getUserBestScore(
    userId: string,
    gameType: GameType,
    dateRange?: { start: Date; end: Date },
  ): Promise<number> {
    const query = this.gameHistoryRepository
      .createQueryBuilder('gh')
      .select('MAX(gh.score)', 'maxScore')
      .where('gh.userId = :userId', { userId })
      .andWhere('gh.gameType = :gameType', { gameType });

    if (dateRange) {
      query.andWhere('gh.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const result = await query.getRawOne();
    return result?.maxScore ? parseInt(result.maxScore, 10) : 0;
  }

  /**
   * 새로운 게임 기록을 생성하고 저장함
   */
  async createHistory(
    user: User,
    createGameHistoryDto: CreateGameHistoryDto,
  ): Promise<GameHistory> {
    const history = this.gameHistoryRepository.create({
      ...createGameHistoryDto,
      user: user,
    });
    return this.gameHistoryRepository.save(history);
  }

  /**
   * 게임별 랭킹 목록을 조회함 (유저별 최고 점수 기준 Top 10)
   */
  async getRanking(gameType: GameType): Promise<GameHistory[]> {
    // 유저별 최고 점수 1건만 추린 뒤 전체 상위 10건을 구함
    const ids: Array<{ id: string }> = await this.gameHistoryRepository.query(
      `
      SELECT ranked.id
      FROM (
        SELECT
          gh.id,
          gh."userId",
          gh.score,
          gh."createdAt",
          ROW_NUMBER() OVER (
            PARTITION BY gh."userId"
            ORDER BY gh.score DESC, gh."createdAt" ASC, gh.id ASC
          ) AS row_num
        FROM game_history gh
        WHERE gh."gameType" = $1
      ) AS ranked
      WHERE ranked.row_num = 1
      ORDER BY ranked.score DESC, ranked."createdAt" ASC
      LIMIT 10
      `,
      [gameType],
    );

    const rankingIds = ids.map((row) => row.id);
    if (rankingIds.length === 0) {
      return [];
    }

    const histories = await this.gameHistoryRepository.find({
      where: { id: In(rankingIds) },
      relations: ['user'],
    });

    const historyById = new Map(
      histories.map((history) => [history.id, history]),
    );
    return rankingIds
      .map((id) => historyById.get(id))
      .filter((history): history is GameHistory => Boolean(history));
  }

  /**
   * ID를 기준으로 특정 게임 기록을 조회함
   */
  async findHistoryById(id: string): Promise<GameHistory> {
    const history = await this.gameHistoryRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!history) {
      throw new NotFoundException('Game history not found');
    }

    return history;
  }

  /**
   * 사용자의 특정 점수에 대한 현재 전체 등수를 계산함
   * @param userId 사용자 ID
   * @param score 현재 점수
   * @param gameType 게임 타입
   * @returns 등수 (1부터 시작)
   */
  async getUserRank(
    _userId: string,
    score: number,
    gameType: GameType,
    dateRange?: { start: Date; end: Date },
  ): Promise<number> {
    // 유저별 최고 점수가 현재 점수보다 높은 경우만 카운트
    // 서브쿼리로 각 유저의 최고 점수 계산 후 비교
    const result = await this.gameHistoryRepository.query(
      `
      SELECT COUNT(*) as count
      FROM (
        SELECT "userId", MAX(score) as max_score
        FROM game_history
        WHERE "gameType" = $1
        ${dateRange ? 'AND "createdAt" BETWEEN $3 AND $4' : ''}
        GROUP BY "userId"
      ) AS user_scores
      WHERE max_score > $2
      `,
      dateRange
        ? [gameType, score, dateRange.start, dateRange.end]
        : [gameType, score],
    );

    // (나보다 높은 유저 수) + 1 = 현재 나의 등수
    return parseInt(result?.[0]?.count || '0', 10) + 1;
  }
}
