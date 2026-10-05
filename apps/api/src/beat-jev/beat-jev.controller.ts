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
  ApiInternalServerErrorResponse,
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
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';

@ApiTags('Beat Jev')
@Controller('beat-jev')
@ApiInternalServerErrorResponse({
  description: '분류되지 않은 서버 오류',
  type: ApiErrorResponseDto,
})
export class BeatJevController {
  constructor(
    private readonly beatJevService: BeatJevService,
    private readonly jevClientService: JevClientService,
  ) {}

  @Get('status')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'JEV 게임 사용 가능 여부 조회' })
  @ApiOkResponse({
    description: 'JEV 게임 사용 가능 상태',
    type: BeatJevStatusDto,
  })
  getStatus(): BeatJevStatusDto {
    return { enabled: this.jevClientService.isConfigured() };
  }

  @Post('matches')
  @UseGuards(BeatJevRateLimitGuard)
  @ApiOperation({ summary: 'JEV 2선승 매치 시작' })
  @ApiCreatedResponse({ description: '새 JEV 매치', type: BeatJevMatchDto })
  @ApiTooManyRequestsResponse({
    description: '시간당 게임 요청 횟수 초과',
    type: ApiErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'JEV API 키가 설정되지 않음',
    type: ApiErrorResponseDto,
  })
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
  @ApiOkResponse({ description: '진행 중인 매치', type: BeatJevMatchDto })
  @ApiNotFoundResponse({
    description: '매치가 없거나 만료됨',
    type: ApiErrorResponseDto,
  })
  getMatch(@Param('id', ParseUUIDPipe) id: string): MatchSnapshot {
    return this.beatJevService.getMatch(id);
  }

  @Post('matches/:id/actions')
  @ApiOperation({ summary: '플레이어 행동 적용' })
  @ApiOkResponse({ description: '행동이 반영된 매치', type: BeatJevMatchDto })
  @ApiBadRequestResponse({
    description: '허용되지 않은 행동',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: '이미 변경된 매치 상태',
    type: ApiErrorResponseDto,
  })
  playAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GameActionDto,
  ): MatchSnapshot {
    return this.beatJevService.playAction(id, body.action, body.revision);
  }

  @Post('matches/:id/continue')
  @UseGuards(BeatJevRateLimitGuard)
  @ApiOperation({ summary: 'JEV의 차례 진행 또는 실패한 차례 재시도' })
  @ApiOkResponse({
    description: 'JEV 차례가 반영된 매치',
    type: BeatJevMatchDto,
  })
  @ApiConflictResponse({
    description: '이미 변경된 매치 상태',
    type: ApiErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: '시간당 게임 요청 횟수 초과',
    type: ApiErrorResponseDto,
  })
  async continueJev(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevisionDto,
  ): Promise<MatchSnapshot> {
    return this.beatJevService.continueJev(id, body.revision);
  }

  @Post('matches/:id/next')
  @ApiOperation({ summary: '다음 게임 또는 무승부 재경기 시작' })
  @ApiOkResponse({
    description: '다음 게임이 시작된 매치',
    type: BeatJevMatchDto,
  })
  @ApiConflictResponse({
    description: '현재 게임이 끝나지 않음',
    type: ApiErrorResponseDto,
  })
  nextGame(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevisionDto,
  ): MatchSnapshot {
    return this.beatJevService.nextGame(id, body.revision);
  }
}
