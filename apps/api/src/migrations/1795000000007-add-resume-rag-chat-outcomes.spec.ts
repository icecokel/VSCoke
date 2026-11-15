import type { QueryRunner } from 'typeorm';
import { AddResumeRagChatOutcomes1795000000007 } from './1795000000007-add-resume-rag-chat-outcomes';

describe('AddResumeRagChatOutcomes1795000000007', () => {
  const query = jest.fn<Promise<unknown>, [string]>();
  const runner = { query } as unknown as QueryRunner;
  beforeEach(() => query.mockReset().mockResolvedValue([]));

  it('기존 질문 행을 바꾸지 않고 결과 컬럼과 값 제약만 추가한다', async () => {
    await new AddResumeRagChatOutcomes1795000000007().up(runner);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');

    expect(sql).not.toMatch(/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\b/i);
    expect(sql).toContain(
      `ADD COLUMN "channel" varchar(12) NOT NULL DEFAULT 'resume'`,
    );
    expect(sql).toContain('ALTER COLUMN "channel" DROP DEFAULT');
    for (const column of [
      '"outcome" varchar(16),',
      '"sourceCount" integer,',
      '"durationMs" integer,',
      '"failureStage" varchar(32),',
    ])
      expect(sql).toContain(`ADD COLUMN ${column}`);
    expect(sql).toContain(
      `'simple-reply', 'no-evidence', 'answered', 'rejected', 'failed'`,
    );
    expect(sql).toContain(
      '"IDX_resume_rag_chat_logs_channel_outcome_created_at"',
    );
  });

  it('결과만 기록한 행이 있으면 down을 거부한다', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]);

    await expect(
      new AddResumeRagChatOutcomes1795000000007().down(runner),
    ).rejects.toThrow('outcome-only rows');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
