import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import {
  UsageEventDto,
  UsageSummaryDto,
  UsageSummaryQueryDto,
} from './usage.dto';
import { UsageIngestGuard, UsageReadGuard } from './usage.guard';
import { UsageService } from './usage.service';

@ApiTags('Usage')
@Controller('usage')
@ApiBadRequestResponse({
  description: '유효하지 않은 이벤트 또는 조회 기간',
  type: ApiErrorResponseDto,
})
@ApiInternalServerErrorResponse({
  description: '사용 집계 저장 또는 조회 실패',
  type: ApiErrorResponseDto,
})
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(UsageIngestGuard)
  @ApiOperation({
    summary: '익명 사용 이벤트 저장 (eventId 중복은 한 번만 반영)',
  })
  @ApiAcceptedResponse({
    description: '이벤트 저장 완료 또는 이미 저장된 이벤트',
  })
  @ApiForbiddenResponse({
    description: '허용되지 않은 브라우저 origin',
    type: ApiErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'IP별 시간당 600회 초과',
    type: ApiErrorResponseDto,
  })
  async record(@Body() event: UsageEventDto): Promise<void> {
    await this.usageService.record(event);
  }

  @Get('summary')
  @Header('Cache-Control', 'no-store')
  @UseGuards(UsageReadGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '한국 날짜 범위의 익명 사용 집계 조회' })
  @ApiOkResponse({
    description: '총계, 일별, 경로별, 기능별, 이벤트별 집계',
    type: UsageSummaryDto,
  })
  @ApiUnauthorizedResponse({
    description: '조회 키가 없거나 일치하지 않음',
    type: ApiErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: '서버에 32자 이상의 조회 키가 설정되지 않음',
    type: ApiErrorResponseDto,
  })
  async summarize(
    @Query() query: UsageSummaryQueryDto,
  ): Promise<UsageSummaryDto> {
    return this.usageService.summarize(query);
  }
}
