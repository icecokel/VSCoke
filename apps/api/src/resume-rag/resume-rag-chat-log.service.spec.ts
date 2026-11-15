import type { InsertResult, Repository } from 'typeorm';
import { ResumeRagChatLog } from './entities/resume-rag-chat-log.entity';
import {
  ResumeRagChatLogService,
  redactResumeRagChatQuestion,
} from './resume-rag-chat-log.service';

const createService = () => {
  const insert = jest
    .fn<Promise<InsertResult>, [Partial<ResumeRagChatLog>]>()
    .mockResolvedValue({} as InsertResult);
  return {
    insert,
    service: new ResumeRagChatLogService({
      insert,
    } as unknown as Repository<ResumeRagChatLog>),
  };
};

describe('ResumeRagChatLogService', () => {
  it('masks direct contact and credential values before persisting a question', async () => {
    const { service, insert } = createService();

    await service.recordOutcome({
      question:
        'kim@example.com 또는 010-1234-5678로 연락해. token=super-secret-value',
      locale: 'ko-KR',
      channel: 'resume',
      outcome: 'answered',
      sourceCount: 3,
      durationMs: 1234.6,
    });

    const recorded = insert.mock.calls[0][0];
    expect(recorded.questionText).toBe(
      '[email] 또는 [phone]로 연락해. token=[secret]',
    );
    expect(recorded.questionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(recorded).toMatchObject({
      locale: 'ko-KR',
      channel: 'resume',
      outcome: 'answered',
      sourceCount: 3,
      durationMs: 1235,
      failureStage: null,
    });
  });

  it('stores only outcome metrics when no question text is given', async () => {
    const { service, insert } = createService();

    await service.recordOutcome({
      locale: 'en-US',
      channel: 'main',
      outcome: 'failed',
      sourceCount: 0,
      durationMs: 42,
      failureStage: 'retrieval',
    });

    expect(insert).toHaveBeenCalledWith({
      questionText: null,
      questionHash: null,
      locale: 'en-US',
      channel: 'main',
      outcome: 'failed',
      sourceCount: 0,
      durationMs: 42,
      failureStage: 'retrieval',
    });
  });

  it('keeps a normal question readable for later review', () => {
    expect(
      redactResumeRagChatQuestion('Oprimed에서 어떤 프론트엔드 업무를 했어?'),
    ).toBe('Oprimed에서 어떤 프론트엔드 업무를 했어?');
  });
});
