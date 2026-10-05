import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { BeatJevService } from './beat-jev.service';
import type { MatchSnapshot } from './beat-jev.service';
import {
  BeatJevMatchDto,
  BeatJevStatusDto,
  GameActionDto,
  RevisionDto,
} from './beat-jev.dto';
import { BeatJevRateLimitGuard } from './beat-jev-rate-limit.guard';
import { JevClientService } from './jev-client.service';

@ApiTags('Beat Jev')
@Controller('beat-jev')
export class BeatJevController {
  constructor(
    private readonly beatJevService: BeatJevService,
    private readonly jevClientService: JevClientService,
  ) {}

  @Get('status')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'JEV 게임 사용 가능 여부 조회' })
  @ApiOkResponse({ type: BeatJevStatusDto })
  getStatus(): BeatJevStatusDto {
    return { enabled: this.jevClientService.isConfigured() };
  }

  @Post('matches')
  @UseGuards(BeatJevRateLimitGuard)
  @ApiOperation({ summary: 'JEV 2선승 매치 시작' })
  @ApiCreatedResponse({ type: BeatJevMatchDto })
  @ApiTooManyRequestsResponse({ description: '시간당 게임 요청 횟수 초과' })
  @ApiServiceUnavailableResponse({ description: 'JEV API 키가 설정되지 않음' })
  createMatch(): MatchSnapshot {
    if (!this.jevClientService.isConfigured()) {
      throw new ServiceUnavailableException(
        'JEV API 키가 설정되지 않았습니다.',
      );
    }
    return this.beatJevService.createMatch();
  }

  @Get('matches/:id')
  @ApiOperation({ summary: '진행 중인 JEV 매치 조회' })
  @ApiOkResponse({ type: BeatJevMatchDto })
  @ApiNotFoundResponse({ description: '매치가 없거나 만료됨' })
  getMatch(@Param('id', ParseUUIDPipe) id: string): MatchSnapshot {
    return this.beatJevService.getMatch(id);
  }

  @Post('matches/:id/actions')
  @ApiOperation({ summary: '플레이어 행동 적용' })
  @ApiOkResponse({ type: BeatJevMatchDto })
  @ApiBadRequestResponse({ description: '허용되지 않은 행동' })
  @ApiConflictResponse({ description: '이미 변경된 매치 상태' })
  playAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GameActionDto,
  ): MatchSnapshot {
    return this.beatJevService.playAction(id, body.action, body.revision);
  }

  @Post('matches/:id/continue')
  @UseGuards(BeatJevRateLimitGuard)
  @ApiOperation({ summary: 'JEV의 차례 진행 또는 실패한 차례 재시도' })
  @ApiOkResponse({ type: BeatJevMatchDto })
  @ApiConflictResponse({ description: '이미 변경된 매치 상태' })
  @ApiTooManyRequestsResponse({ description: '시간당 게임 요청 횟수 초과' })
  async continueJev(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevisionDto,
  ): Promise<MatchSnapshot> {
    return this.beatJevService.continueJev(id, body.revision);
  }

  @Post('matches/:id/next')
  @ApiOperation({ summary: '다음 게임 또는 무승부 재경기 시작' })
  @ApiOkResponse({ type: BeatJevMatchDto })
  @ApiConflictResponse({ description: '현재 게임이 끝나지 않음' })
  nextGame(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevisionDto,
  ): MatchSnapshot {
    return this.beatJevService.nextGame(id, body.revision);
  }
}
