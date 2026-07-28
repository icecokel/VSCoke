import type { QueryRunner } from 'typeorm';
import { CreateResumeRagChatLogs1794873600000 } from './1794873600000-create-resume-rag-chat-logs';

describe('CreateResumeRagChatLogs1794873600000', () => {
  it('creates a queryable log table with masked-question storage fields', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await new CreateResumeRagChatLogs1794873600000().up({
      query,
    } as unknown as QueryRunner);

    const sql = query.mock.calls.flat().join('\n');
    expect(sql).toContain('resume_rag_chat_logs');
    expect(sql).toContain('"questionText" text NOT NULL');
    expect(sql).toContain('"questionHash" varchar(64) NOT NULL');
    expect(sql).toContain('"locale" varchar(16) NOT NULL');
    expect(sql).toContain('"createdAt" DESC');
  });
});
