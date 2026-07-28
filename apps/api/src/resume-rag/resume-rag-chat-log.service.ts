import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ResumeRagChatLog } from './entities/resume-rag-chat-log.entity';

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
const phonePattern =
  /(?<!\d)(?:\+?82[-\s]?)?0?1\d[-\s]?\d{3,4}[-\s]?\d{4}(?!\d)/gu;
const credentialPattern =
  /\b(bearer\s+|api[_-]?key\s*[:=]\s*|token\s*[:=]\s*|secret\s*[:=]\s*)\S+/giu;

export const redactResumeRagChatQuestion = (question: string): string => {
  return question
    .replace(emailPattern, '[email]')
    .replace(phonePattern, '[phone]')
    .replace(credentialPattern, '$1[secret]');
};

@Injectable()
export class ResumeRagChatLogService {
  constructor(
    @InjectRepository(ResumeRagChatLog)
    private readonly chatLogRepository: Repository<ResumeRagChatLog>,
  ) {}

  async recordQuestion(question: string, locale: string): Promise<void> {
    const questionText = redactResumeRagChatQuestion(question);
    const questionHash = createHash('sha256')
      .update(questionText)
      .digest('hex');

    await this.chatLogRepository.insert({
      questionText,
      questionHash,
      locale,
    });
  }
}
