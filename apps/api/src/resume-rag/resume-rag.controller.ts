import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ResumeRagChatRequestDto } from './dto/resume-rag-chat-request.dto';
import { ResumeRagChatResponseDto } from './dto/resume-rag-chat-response.dto';
import { ResumeRagOriginGuard } from './resume-rag-origin.guard';
import { ResumeRagService } from './resume-rag.service';

@ApiTags('Resume RAG')
@Controller('resume-rag')
export class ResumeRagController {
  constructor(private readonly resumeRagService: ResumeRagService) {}

  @Post('chat')
  @UseGuards(ResumeRagOriginGuard)
  @ApiOperation({ summary: '이력 RAG 질문 답변' })
  @ApiOkResponse({ type: ResumeRagChatResponseDto })
  @ApiForbiddenResponse({
    description: '허용된 VSCoke 웹 origin이 아닌 요청',
  })
  async chat(
    @Body() request: ResumeRagChatRequestDto,
  ): Promise<ResumeRagChatResponseDto> {
    return this.resumeRagService.answer(request);
  }
}
