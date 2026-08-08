import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ResumeRagChatRequestDto } from '../resume-rag/dto/resume-rag-chat-request.dto';
import { ResumeRagChatResponseDto } from '../resume-rag/dto/resume-rag-chat-response.dto';
import { ResumeRagOriginGuard } from '../resume-rag/resume-rag-origin.guard';
import {
  MAIN_CHAT_REQUEST_LIMIT,
  MainChatRateLimitGuard,
} from './main-chat-rate-limit.guard';
import { MainChatService } from './main-chat.service';

const rateLimitResponseHeaders = {
  'X-RateLimit-Limit': {
    description: 'IP당 1시간 메인 채팅 요청 최대 횟수',
    schema: { type: 'integer', example: MAIN_CHAT_REQUEST_LIMIT },
  },
  'X-RateLimit-Remaining': {
    description: '현재 IP에서 남은 메인 채팅 요청 횟수',
    schema: { type: 'integer', minimum: 0 },
  },
  'X-RateLimit-Reset': {
    description: '다음 메인 채팅 요청 횟수가 복구되는 Unix epoch 초',
    schema: { type: 'integer' },
  },
};

@ApiTags('Main Chat')
@Controller('main-chat')
export class MainChatController {
  constructor(private readonly mainChatService: MainChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ResumeRagOriginGuard, MainChatRateLimitGuard)
  @ApiOperation({ summary: '프로젝트와 이력서 통합 질문 답변' })
  @ApiOkResponse({
    type: ResumeRagChatResponseDto,
    headers: rateLimitResponseHeaders,
  })
  @ApiBadRequestResponse({
    description: '질문 길이 또는 locale 형식이 올바르지 않음',
  })
  @ApiForbiddenResponse({
    description: '허용된 VSCoke 웹 origin이 아닌 요청',
  })
  @ApiTooManyRequestsResponse({
    description: 'IP당 1시간에 허용된 메인 채팅 요청 횟수를 초과함',
    headers: rateLimitResponseHeaders,
  })
  @ApiServiceUnavailableResponse({
    description: '검색 또는 답변 생성 공급자를 사용할 수 없음',
  })
  @ApiInternalServerErrorResponse({
    description: '분류되지 않은 서버 오류',
  })
  chat(
    @Body() request: ResumeRagChatRequestDto,
  ): Promise<ResumeRagChatResponseDto> {
    return this.mainChatService.answer(request);
  }
}
