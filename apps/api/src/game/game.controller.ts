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
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { GameService } from './game.service';
import { CreateGameHistoryDto } from './dto/create-game-history.dto';
import { GameHistoryResponseDto } from './dto/game-history-response.dto';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { GameType } from './enums/game-type.enum';

/**
 * 게임 결과 관리 및 랭킹 조회를 담당하는 컨트롤러
 */
@ApiTags('Game')
@ApiBearerAuth()
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  /**
   * 게임 결과 저장 및 현재 등수 반환
   */
  @Post('result')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: '게임 결과 생성 및 랭킹 확인' })
  @ApiOkResponse({ type: GameHistoryResponseDto })
  async createResult(
    @Req() req: any,
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

    // 현재 게임의 등수 계산 (기존 로직 유지)
    // const currentRank = await this.gameService.getUserRank(
    //   req.user.id,
    //   history.score,
    //   history.gameType,
    // );
    // -> 요구사항: API 응답에 `rank` 필드가 있는데, 이는 "이번 판의 등수"인지 "내 최고 기록의 등수"인지 명확하지 않음.
    // 기존 코드에서는 'rank' 변수에 getUserRank(history.score) 결과를 담아서 반환했음.
    // DTO 상 'rank'는 "현재 등수"라고 되어 있음. 이번 판 점수의 등수를 의미하는 듯.
    // 하지만 기획상 "전체 랭킹", "주간 랭킹"이 추가되므로 'rank'의 의미가 중복될 수 있음.
    // 여기서는 'rank' 필드를 "이번 판 점수의 등수"로 유지하고, 추가 필드를 채워줌.

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
    const now = new Date();
    // UTC 시간을 KST로 변환 (밀리초 단위 계산)
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(utc + kstOffset);

    // 월요일 구하기 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    const currentDay = kstNow.getDay();
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1; // 일요일이면 6일 전, 그 외는 day-1일 전

    const kstMonday = new Date(kstNow);
    kstMonday.setDate(kstNow.getDate() - diffToMonday);
    kstMonday.setHours(0, 0, 0, 0);

    const kstSunday = new Date(kstMonday);
    kstSunday.setDate(kstMonday.getDate() + 6);
    kstSunday.setHours(23, 59, 59, 999);

    // 다시 UTC Date 객체로 변환하여 반환 (DB 쿼리용)
    const start = new Date(kstMonday.getTime() - kstOffset);
    const end = new Date(kstSunday.getTime() - kstOffset);

    return { start, end };
  }

  /**
   * 게임별 랭킹 목록 조회 (Top 10)
   */
  @Get('ranking')
  @ApiOperation({ summary: '게임별 Top 10 랭킹 조회' })
  @ApiQuery({
    name: 'gameType',
    required: true,
    enum: GameType,
    enumName: 'GameType',
    description: '조회할 게임 타입',
  })
  async getRanking(
    @Query('gameType', new ParseEnumPipe(GameType)) gameType: GameType,
  ) {
    return this.gameService.getRanking(gameType);
  }

  /**
   * 특정 게임 결과 상세 조회 (ID 기준, 공유용)
   */
  @Get('result/:id')
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
