import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
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
export class ResumeRagController {
  constructor(private readonly resumeRagService: ResumeRagService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ResumeRagOriginGuard, ResumeRagRateLimitGuard)
  @ApiOperation({ summary: '이력 RAG 질문 답변' })
  @ApiOkResponse({
    type: ResumeRagChatResponseDto,
    headers: rateLimitResponseHeaders,
  })
  @ApiForbiddenResponse({
    description: '허용된 VSCoke 웹 origin이 아닌 요청',
  })
  @ApiTooManyRequestsResponse({
    description: 'IP당 1시간에 허용된 이력 채팅 요청 횟수를 초과함',
    headers: rateLimitResponseHeaders,
  })
  async chat(
    @Body() request: ResumeRagChatRequestDto,
  ): Promise<ResumeRagChatResponseDto> {
    return this.resumeRagService.answer(request);
  }
}
