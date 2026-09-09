import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { GameService } from './game.service';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';
import { GameHistoryResponseDto } from './dto/game-history-response.dto';
import { GameRankingHistoryDto } from './dto/game-ranking-history.dto';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { GameType } from './enums/game-type.enum';
import { User } from '../auth/entities/user.entity';

type AuthenticatedRequest = Request & { user: User };

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 게임 결과 관리 및 랭킹 조회를 담당하는 컨트롤러
 */
@ApiTags('Game')
@Controller('game')
@ApiInternalServerErrorResponse({
  description: '분류되지 않은 서버 오류',
  type: ApiErrorResponseDto,
})
export class GameController {
  constructor(private readonly gameService: GameService) {}

  /**
   * 게임 결과 저장 및 현재 등수 반환
   */
  @Post('result')
  @ApiBadRequestResponse({
    description: '지원하지 않는 게임 타입 또는 점수·플레이 시간 정책 위반',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Google ID token이 없거나 유효하지 않음',
    type: ApiErrorResponseDto,
  })
  @UseGuards(GoogleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '게임 결과 생성 및 랭킹 확인' })
  @ApiCreatedResponse({
    description: '게임 결과 저장 및 이번 판·전체·주간 등수 반환',
    type: GameHistoryResponseDto,
  })
  async createResult(
    @Req() req: AuthenticatedRequest,
    @Body() createGameHistoryDto: CreateGameHistoryDto,
  ): Promise<GameHistoryResponseDto> {
    const history = await this.gameService.createHistory(
      req.user,
      createGameHistoryDto,
    );

    // 내 역대 최고 점수
    const bestScore = await this.gameService.getUserBestScore(
      req.user.id,
      history.gameType,
    );

    // 전체 랭킹 (내 최고 점수 기준)
    const allTimeRank = await this.gameService.getUserRank(
      req.user.id,
      bestScore,
      history.gameType,
    );

    // 주간 랭킹 (KST 기준)
    const { start, end } = this.getWeeklyDateRangeKST();
    const weeklyBestScore = await this.gameService.getUserBestScore(
      req.user.id,
      history.gameType,
      { start, end },
    );
    const weeklyRank = await this.gameService.getUserRank(
      req.user.id,
      weeklyBestScore,
      history.gameType,
      { start, end },
    );

    // 이번 판보다 높은 사용자별 최고점 개수 + 1. 본인의 과거 최고점도 집계하며 Top 10 밖도 숫자다.
    const currentRank = await this.gameService.getUserRank(
      req.user.id,
      history.score,
      history.gameType,
    );

    return {
      id: history.id,
      score: history.score,
      gameType: history.gameType,
      createdAt: history.createdAt,
      user: {
        displayName: `${history.user.firstName} ${history.user.lastName}`,
      },
      rank: currentRank,
      bestScore,
      allTimeRank,
      weeklyRank,
    };
  }

  /**
   * KST(UTC+9) 기준 이번 주 월요일 00:00:00 ~ 일요일 23:59:59의 Date 범위를 반환
   */
  private getWeeklyDateRangeKST(): { start: Date; end: Date } {
    const kstNow = new Date(Date.now() + KST_OFFSET_MS);
    const diffToMonday = (kstNow.getUTCDay() + 6) % 7;
    const start = new Date(
      Date.UTC(
        kstNow.getUTCFullYear(),
        kstNow.getUTCMonth(),
        kstNow.getUTCDate() - diffToMonday,
      ) - KST_OFFSET_MS,
    );
    const end = new Date(start.getTime() + WEEK_MS - 1);

    return { start, end };
  }

  /**
   * 게임별 랭킹 목록 조회 (Top 10)
   */
  @Get('ranking')
  @ApiBadRequestResponse({
    description: '조회할 gameType이 없거나 지원하지 않음',
    type: ApiErrorResponseDto,
  })
  @ApiOperation({
    summary: '게임별 Top 10 랭킹 조회',
  })
  @ApiQuery({
    name: 'gameType',
    required: true,
    enum: GameType,
    enumName: 'GameType',
    description: '조회할 게임 타입',
  })
  @ApiOkResponse({
    description: '사용자별 최고 점수 기준 상위 10건 조회',
    type: GameRankingHistoryDto,
    isArray: true,
  })
  async getRanking(
    @Query('gameType', new ParseEnumPipe(GameType)) gameType: GameType,
  ): Promise<GameRankingHistoryDto[]> {
    const rankings = await this.gameService.getRanking(gameType);

    return rankings.map((ranking) => ({
      score: ranking.score,
      rank: ranking.rank,
      createdAt: ranking.createdAt,
      user: {
        displayName: ranking.user.displayName,
      },
    }));
  }

  /**
   * 특정 게임 결과 상세 조회 (ID 기준, 공유용)
   */
  @Get('result/:id')
  @ApiBadRequestResponse({
    description: '결과 ID가 UUID가 아님',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '해당 게임 결과가 없음',
    type: ApiErrorResponseDto,
  })
  @ApiOperation({ summary: '게임 결과 상세 조회' })
  @ApiOkResponse({
    type: GameHistoryResponseDto,
    description: '공유된 게임 결과 조회 (로그인 필요 없음)',
  })
  async getGameResult(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GameHistoryResponseDto> {
    const history = await this.gameService.findHistoryById(id);

    return {
      id: history.id,
      score: history.score,
      gameType: history.gameType,
      createdAt: history.createdAt,
      user: {
        displayName: `${history.user.firstName} ${history.user.lastName}`,
      },
    };
  }
}
