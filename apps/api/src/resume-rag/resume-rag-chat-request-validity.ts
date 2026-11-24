import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Request } from 'express';
import { ResumeRagChatRequestDto } from './dto/resume-rag-chat-request.dto';

// 전역 ValidationPipe와 같은 규칙으로 채팅 요청 본문을 검사한다.
// 질문 길이 초과처럼 400으로 거절될 요청은 질문 횟수에 세지 않기 위해 가드에서 쓴다.
export const isValidChatRequestBody = (request: Request): boolean => {
  const body: unknown = request.body;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return false;
  }

  return (
    validateSync(plainToInstance(ResumeRagChatRequestDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    }).length === 0
  );
};
