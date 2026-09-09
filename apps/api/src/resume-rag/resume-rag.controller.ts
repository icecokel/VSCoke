import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import {
  ResumeConversationService,
  RESUME_CONVERSATION_TOKEN_HEADER,
} from './resume-conversation.service';
import {
  Body,
  Header,
  Headers,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ResumeRagChatRequestDto } from './dto/resume-rag-chat-request.dto';
import { ResumeRagChatResponseDto } from './dto/resume-rag-chat-response.dto';
import { ResumeRagOriginGuard } from './resume-rag-origin.guard';
import { ResumeRagRateLimitGuard } from './resume-rag-rate-limit.guard';
import { ResumeRagService } from './resume-rag.service';

const rateLimitResponseHeaders = {
  'X-RateLimit-Limit': {
    description: 'IP당 1시간 이력 채팅 요청 최대 횟수',
    schema: { type: 'integer', example: 20 },
  },
  'X-RateLimit-Remaining': {
    description: '현재 IP에서 남은 이력 채팅 요청 횟수',
    schema: { type: 'integer', minimum: 0 },
  },
  'X-RateLimit-Reset': {
    description: '다음 이력 채팅 요청 횟수가 복구되는 Unix epoch 초',
    schema: { type: 'integer' },
  },
};

@ApiTags('Resume RAG')
@Controller('resume-rag')
@ApiInternalServerErrorResponse({
  description: '분류되지 않은 서버 오류',
  type: ApiErrorResponseDto,
})
export class ResumeRagController {
  constructor(
    private readonly resumeRagService: ResumeRagService,
    private readonly conversations: ResumeConversationService,
  ) {}

  @Post('chat')
  @ApiBadRequestResponse({
    description: '질문·언어·대화 요청 식별자가 올바르지 않음',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '접근키, 채널 또는 언어 불일치나 삭제·만료된 대화',
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: '다른 질문에 사용된 요청 ID 또는 동시 대화 버전 충돌',
    type: ApiErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: '검색 또는 답변 생성 공급자를 사용할 수 없음',
    type: ApiErrorResponseDto,
  })
  @Header('Cache-Control', 'no-store')
  @ApiHeader({ name: RESUME_CONVERSATION_TOKEN_HEADER, required: false })
  @HttpCode(HttpStatus.OK)
  @UseGuards(ResumeRagOriginGuard, ResumeRagRateLimitGuard)
  @ApiOperation({ summary: '이력 RAG 질문 답변' })
  @ApiOkResponse({
    description: '공개 이력 근거 답변 반환. 저장 대화는 식별자를 포함한다.',
    type: ResumeRagChatResponseDto,
    headers: rateLimitResponseHeaders,
  })
  @ApiForbiddenResponse({
    type: ApiErrorResponseDto,
    description: '허용된 VSCoke 웹 origin이 아닌 요청',
  })
  @ApiTooManyRequestsResponse({
    type: ApiErrorResponseDto,
    description: 'IP당 1시간에 허용된 이력 채팅 요청 횟수를 초과함',
    headers: rateLimitResponseHeaders,
  })
  async chat(
    @Body() request: ResumeRagChatRequestDto,
    @Headers(RESUME_CONVERSATION_TOKEN_HEADER) token?: string,
  ): Promise<ResumeRagChatResponseDto> {
    if (!request.conversationId && !request.requestId && !token)
      return this.resumeRagService.answer(request, { channel: 'resume' });
    return this.conversations.runTurn(
      request,
      token,
      'resume',
      (history, question) =>
        this.resumeRagService.answer(
          { ...request, question },
          { channel: 'resume', history, recordQuestion: false },
        ),
    );
  }
}
