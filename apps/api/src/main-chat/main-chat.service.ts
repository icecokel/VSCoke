import type { ResumeChatHistoryMessage } from '../resume-rag/resume-chat-history';
import { Injectable } from '@nestjs/common';
import type { ResumeRagChatRequestDto } from '../resume-rag/dto/resume-rag-chat-request.dto';
import type { ResumeRagChatResponseDto } from '../resume-rag/dto/resume-rag-chat-response.dto';
import { ResumeRagService } from '../resume-rag/resume-rag.service';

@Injectable()
export class MainChatService {
  constructor(private readonly resumeRagService: ResumeRagService) {}

  answer(
    request: ResumeRagChatRequestDto,
    history?: ResumeChatHistoryMessage[],
  ): Promise<ResumeRagChatResponseDto> {
    return this.resumeRagService.answer(request, {
      channel: 'main',
      recordQuestion: false,
      ...(history?.length ? { history } : {}),
    });
  }
}
