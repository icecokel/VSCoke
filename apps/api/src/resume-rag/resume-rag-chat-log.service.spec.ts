import type { InsertResult, Repository } from 'typeorm';
import { ResumeRagChatLog } from './entities/resume-rag-chat-log.entity';
import {
  ResumeRagChatLogService,
  redactResumeRagChatQuestion,
} from './resume-rag-chat-log.service';

describe('ResumeRagChatLogService', () => {
  it('masks direct contact and credential values before persisting a question', async () => {
    let recordedQuestion: Pick<
      ResumeRagChatLog,
      'questionText' | 'questionHash' | 'locale'
    > | null = null;
    const service = new ResumeRagChatLogService({
      insert: (
        value: Pick<
          ResumeRagChatLog,
          'questionText' | 'questionHash' | 'locale'
        >,
      ) => {
        recordedQuestion = value;
        return Promise.resolve({} as InsertResult);
      },
    } as unknown as Repository<ResumeRagChatLog>);

    await service.recordQuestion(
      'kim@example.com 또는 010-1234-5678로 연락해. token=super-secret-value',
      'ko-KR',
    );

    expect(recordedQuestion?.questionText).toBe(
      '[email] 또는 [phone]로 연락해. token=[secret]',
    );
    expect(recordedQuestion?.questionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(recordedQuestion?.locale).toBe('ko-KR');
  });

  it('keeps a normal question readable for later review', () => {
    expect(
      redactResumeRagChatQuestion('Oprimed에서 어떤 프론트엔드 업무를 했어?'),
    ).toBe('Oprimed에서 어떤 프론트엔드 업무를 했어?');
  });
});
