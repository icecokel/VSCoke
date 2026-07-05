import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { ResumeRagChatRequestDto } from './dto/resume-rag-chat-request.dto';
import { ResumeRagChatResponseDto } from './dto/resume-rag-chat-response.dto';
import { ResumeRagService } from './resume-rag.service';

@ApiTags('Resume RAG')
@Controller('resume-rag')
export class ResumeRagController {
  constructor(private readonly resumeRagService: ResumeRagService) {}

  @Post('chat')
  @UseGuards(GoogleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '이력 RAG 질문 답변' })
  @ApiOkResponse({ type: ResumeRagChatResponseDto })
  async chat(
    @Body() request: ResumeRagChatRequestDto,
  ): Promise<ResumeRagChatResponseDto> {
    return this.resumeRagService.answer(request);
  }
}
