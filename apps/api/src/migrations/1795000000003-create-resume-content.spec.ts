import type { QueryRunner } from 'typeorm';
import { CreateResumeContent1795000000003 } from './1795000000003-create-resume-content';

describe('CreateResumeContent1795000000003', () => {
  it('미적용 migration은 업무 seed 없이 동일 legacy 테이블만 생성한다', async () => {
    const query = jest
      .fn<Promise<unknown>, [string]>()
      .mockResolvedValue(undefined);
    await new CreateResumeContent1795000000003().up({
      query,
    } as unknown as QueryRunner);
    expect(query).toHaveBeenCalledTimes(2);
    const statements = query.mock.calls.map(([sql]) => sql).join('\n');
    expect(statements).toContain(
      'CREATE TABLE IF NOT EXISTS "resume_documents"',
    );
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS "resume_details"');
    expect(statements).not.toMatch(
      /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP)\b/i,
    );
  });
});
