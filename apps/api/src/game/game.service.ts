import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameHistory } from './entities/game-history.entity';
import { GamePokeLoungeState } from './entities/game-poke-lounge-state.entity';
import { User } from '../auth/entities/user.entity';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';
import { SavePokeLoungeStateDto } from './dto/save-poke-lounge-state.dto';
import { GameRankingHistoryDto } from './dto/game-ranking-history.dto';
import { GameType } from './enums/game-type.enum';
import {
  GameSubmissionTrust,
  buildNamedValidScoreCondition,
  buildPositionalValidScoreCondition,
  getGameScorePolicy,
  getGameScorePolicyParams,
  getGameScorePolicyValues,
  isPublicRankingEligible as isScorePublicRankingEligible,
  validateGameScoreSubmission,
} from './game-score-policy';

type MaxScoreRow = {
  maxScore: string | number | null;
};

type RankingProjectionRow = {
  score: string | number;
  createdAt: Date | string;
  firstName: string;
  lastName: string;
};

type RankCountRow = {
  count: string | number;
};

const GENERIC_GAME_SUBMISSION_TRUST: GameSubmissionTrust = 'client-asserted';

/**
 * 게임 비즈니스 로직을 처리하는 서비스
 */
@Injectable()
export class GameService {
  constructor(
    @InjectRepository(GameHistory)
    private gameHistoryRepository: Repository<GameHistory>,
    @InjectRepository(GamePokeLoungeState)
    private pokeLoungeStateRepository: Repository<GamePokeLoungeState>,
  ) {}

  /**
   * 유저의 최고 점수 조회 (기간 필터링 지원)
   */
  async getUserBestScore(
    userId: string,
    gameType: GameType,
    dateRange?: { start: Date; end: Date },
  ): Promise<number> {
    const policy = getGameScorePolicy(gameType);
    const query = this.gameHistoryRepository
      .createQueryBuilder('gh')
      .select('MAX(gh.score)', 'maxScore')
      .where('gh.userId = :userId', { userId })
      .andWhere('gh.gameType = :gameType', { gameType })
      .andWhere(
        buildNamedValidScoreCondition('gh'),
        getGameScorePolicyParams(policy),
      );

    if (dateRange) {
      query.andWhere('gh.createdAt BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const result = await query.getRawOne<MaxScoreRow>();
    return result?.maxScore ? Number.parseInt(String(result.maxScore), 10) : 0;
  }

  /**
   * 새로운 게임 기록을 생성하고 저장함
   */
  async createHistory(
    user: User,
    createGameHistoryDto: CreateGameHistoryDto,
  ): Promise<GameHistory> {
    validateGameScoreSubmission(createGameHistoryDto);

    const history = this.gameHistoryRepository.create({
      ...createGameHistoryDto,
      user: user,
      resultTrust:
        createGameHistoryDto.gameType === GameType.POKE_LOUNGE
          ? GENERIC_GAME_SUBMISSION_TRUST
          : null,
      sourceKey: null,
    });
    return this.gameHistoryRepository.save(history);
  }

  isPublicRankingEligible(gameType: GameType): boolean {
    return isScorePublicRankingEligible(
      gameType,
      GENERIC_GAME_SUBMISSION_TRUST,
    );
  }

  /**
   * 게임별 랭킹 목록을 조회함 (유저별 최고 점수 기준 Top 10)
   */
  async getRanking(gameType: GameType): Promise<GameRankingHistoryDto[]> {
    const policy = getGameScorePolicy(gameType);
    const policyValues = getGameScorePolicyValues(policy);
    const trustCondition =
      gameType === GameType.POKE_LOUNGE
        ? `AND gh."resultTrust" = $${policyValues.length + 2}`
        : '';
    const queryValues: Array<string | number> = [gameType, ...policyValues];
    if (gameType === GameType.POKE_LOUNGE) {
      queryValues.push('verified-room');
    }

    // 유저별 최고 점수 1건만 추린 뒤 전체 상위 10건을 구함
    const rows = await this.gameHistoryRepository.query<RankingProjectionRow[]>(
      `
      SELECT
        ranked.score,
        ranked."createdAt",
        ranked."firstName",
        ranked."lastName"
      FROM (
        SELECT
          gh.score,
          gh."createdAt",
          user_record."firstName",
          user_record."lastName",
          ROW_NUMBER() OVER (
            PARTITION BY gh."userId"
            ORDER BY gh.score DESC, gh."createdAt" ASC, gh.id ASC
          ) AS row_num
        FROM game_history gh
        INNER JOIN "user" user_record ON user_record.id = gh."userId"
        WHERE gh."gameType" = $1
          AND ${buildPositionalValidScoreCondition('gh', 2)}
          ${trustCondition}
      ) AS ranked
      WHERE ranked.row_num = 1
      ORDER BY ranked.score DESC, ranked."createdAt" ASC
      LIMIT 10
      `,
      queryValues,
    );

    return rows.map((row, index) => ({
      score: Number(row.score),
      rank: index + 1,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      user: {
        displayName: `${row.firstName} ${row.lastName}`.trim(),
      },
    }));
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

  async savePokeLoungeState(
    user: User,
    dto: SavePokeLoungeStateDto,
  ): Promise<GamePokeLoungeState> {
    const clientUpdatedAt = dto.clientUpdatedAt
      ? new Date(dto.clientUpdatedAt)
      : null;
    const existingState = await this.pokeLoungeStateRepository.findOne({
      where: { userId: user.id },
    });

    if (isStalePokeLoungeStateSave(existingState, clientUpdatedAt)) {
      return existingState;
    }

    await this.pokeLoungeStateRepository.query(
      `
      INSERT INTO "game_poke_lounge_state" ("userId", "state", "clientUpdatedAt")
      VALUES ($1, $2::jsonb, $3::timestamptz)
      ON CONFLICT ("userId") DO UPDATE
      SET
        "state" = EXCLUDED."state",
        "clientUpdatedAt" = EXCLUDED."clientUpdatedAt",
        "updatedAt" = now()
      WHERE "game_poke_lounge_state"."clientUpdatedAt" IS NULL
        OR (
          EXCLUDED."clientUpdatedAt" IS NOT NULL
          AND "game_poke_lounge_state"."clientUpdatedAt" <= EXCLUDED."clientUpdatedAt"
        )
      `,
      [user.id, JSON.stringify(dto.state), clientUpdatedAt],
    );

    const savedState = await this.pokeLoungeStateRepository.findOne({
      where: { userId: user.id },
    });

    if (!savedState) {
      throw new NotFoundException('Poke Lounge state not found');
    }

    return savedState;
  }

  async findPokeLoungeState(userId: string): Promise<GamePokeLoungeState> {
    const state = await this.pokeLoungeStateRepository.findOne({
      where: { userId },
    });

    if (!state) {
      throw new NotFoundException('Poke Lounge state not found');
    }

    return state;
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
  ): Promise<number | null> {
    const policy = getGameScorePolicy(gameType);
    const policyValues = getGameScorePolicyValues(policy);
    const queryValues: Array<string | number | Date> = [
      gameType,
      score,
      ...policyValues,
    ];
    const trustCondition =
      gameType === GameType.POKE_LOUNGE
        ? `AND "resultTrust" = $${queryValues.push('verified-room')}`
        : '';
    let dateRangeCondition = '';
    if (dateRange) {
      const startIndex = queryValues.push(dateRange.start);
      const endIndex = queryValues.push(dateRange.end);
      dateRangeCondition = `AND "createdAt" BETWEEN $${startIndex} AND $${endIndex}`;
    }

    // 유저별 최고 점수가 현재 점수보다 높은 경우만 카운트
    // 서브쿼리로 각 유저의 최고 점수 계산 후 비교
    const result = await this.gameHistoryRepository.query<RankCountRow[]>(
      `
      SELECT COUNT(*) as count
      FROM (
        SELECT "userId", MAX(score) as max_score
        FROM game_history
        WHERE "gameType" = $1
        AND ${buildPositionalValidScoreCondition(undefined, 3)}
        ${trustCondition}
        ${dateRangeCondition}
        GROUP BY "userId"
      ) AS user_scores
      WHERE max_score > $2
      `,
      queryValues,
    );

    // (나보다 높은 유저 수) + 1 = 현재 나의 등수
    return Number.parseInt(String(result[0]?.count ?? '0'), 10) + 1;
  }
}

function isStalePokeLoungeStateSave(
  existingState: GamePokeLoungeState | null,
  clientUpdatedAt: Date | null,
): existingState is GamePokeLoungeState {
  if (!existingState?.clientUpdatedAt) {
    return false;
  }

  if (!clientUpdatedAt) {
    return true;
  }

  return existingState.clientUpdatedAt.getTime() > clientUpdatedAt.getTime();
}
