import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { ChatChannel } from './chat-definition';
import {
  ResumeRagChatLog,
  type ResumeRagChatOutcome,
} from './entities/resume-rag-chat-log.entity';

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

  // 요청 결과를 한 행으로 기록한다. question이 없으면 원문·hash 없이 결과 지표만 남긴다.
  async recordOutcome(entry: {
    question?: string;
    locale: string;
    channel: ChatChannel;
    outcome: ResumeRagChatOutcome;
    sourceCount: number;
    durationMs: number;
    failureStage?: string;
  }): Promise<void> {
    const questionText =
      entry.question === undefined
        ? null
        : redactResumeRagChatQuestion(entry.question);
    const questionHash =
      questionText === null
        ? null
        : createHash('sha256').update(questionText).digest('hex');

    await this.chatLogRepository.insert({
      questionText,
      questionHash,
      locale: entry.locale,
      channel: entry.channel,
      outcome: entry.outcome,
      sourceCount: entry.sourceCount,
      durationMs: Math.max(0, Math.round(entry.durationMs)),
      failureStage: entry.failureStage ?? null,
    });
  }
}
