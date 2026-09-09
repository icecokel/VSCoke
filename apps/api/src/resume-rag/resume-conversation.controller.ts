import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateResumeConversationDto,
  ResumeConversationAccessDto,
  ResumeConversationHistoryDto,
} from './dto/resume-conversation.dto';
import {
  ResumeConversationService,
  RESUME_CONVERSATION_TOKEN_HEADER,
} from './resume-conversation.service';
import { ResumeRagOriginGuard } from './resume-rag-origin.guard';
import { ResumeConversationRateLimitGuard } from './resume-conversation-rate-limit.guard';

@ApiTags('Resume conversations')
@Controller('resume-rag/conversations')
@ApiForbiddenResponse({
  description: '허용되지 않은 웹 origin',
  type: ApiErrorResponseDto,
})
@ApiTooManyRequestsResponse({
  description: 'IP당 1시간 대화 관리 요청 120회 초과',
  type: ApiErrorResponseDto,
})
@ApiBadRequestResponse({
  description: '대화 ID, 채널 또는 언어 형식이 올바르지 않음',
  type: ApiErrorResponseDto,
})
@ApiInternalServerErrorResponse({
  description: '분류되지 않은 서버 오류',
  type: ApiErrorResponseDto,
})
@UseGuards(ResumeRagOriginGuard, ResumeConversationRateLimitGuard)
export class ResumeConversationController {
  constructor(private readonly conversations: ResumeConversationService) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '익명 대화 생성. 30일 후 만료된다.' })
  @ApiCreatedResponse({
    description: '대화 생성 성공. 비밀 접근키는 이 응답에서만 제공한다.',
    type: ResumeConversationAccessDto,
  })
  create(
    @Body() request: CreateResumeConversationDto,
  ): Promise<ResumeConversationAccessDto> {
    return this.conversations.create(request);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: RESUME_CONVERSATION_TOKEN_HEADER, required: true })
  @ApiOperation({ summary: '저장 대화 최근 기록 조회' })
  @ApiOkResponse({
    description: '접근키로 검증한 대화의 최근 50턴 조회',
    type: ResumeConversationHistoryDto,
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: '접근키 불일치, 삭제 또는 만료된 대화',
  })
  history(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers(RESUME_CONVERSATION_TOKEN_HEADER) token?: string,
  ): Promise<ResumeConversationHistoryDto> {
    return this.conversations.history(id, token);
  }

  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: RESUME_CONVERSATION_TOKEN_HEADER, required: true })
  @ApiOperation({ summary: '저장 대화와 연결된 기록 삭제' })
  @ApiNotFoundResponse({
    description: '접근키 불일치, 삭제 또는 만료된 대화',
    type: ApiErrorResponseDto,
  })
  @ApiOkResponse({
    description: '대화와 연결된 턴 삭제 완료',
    schema: {
      type: 'object',
      required: ['deleted'],
      properties: { deleted: { type: 'boolean' } },
    },
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers(RESUME_CONVERSATION_TOKEN_HEADER) token?: string,
  ): Promise<{ deleted: boolean }> {
    await this.conversations.remove(id, token);
    return { deleted: true };
  }
}
