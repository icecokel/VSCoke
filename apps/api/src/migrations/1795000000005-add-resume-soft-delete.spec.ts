import type { QueryRunner } from 'typeorm';
import { AddResumeSoftDelete1795000000005 } from './1795000000005-add-resume-soft-delete';

describe('AddResumeSoftDelete1795000000005', () => {
  const query = jest.fn<Promise<unknown>, [string]>();
  const runner = {
    query,
    isTransactionActive: false,
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
  } as unknown as QueryRunner;
  beforeEach(() => query.mockReset().mockResolvedValue(undefined));

  it('19개 테이블에 NULL 삭제 표시만 추가하고 업무 행은 건드리지 않는다', async () => {
    await new AddResumeSoftDelete1795000000005().up(runner);
    const statements = query.mock.calls.map(([sql]) => sql);
    const columns = statements.filter((sql) => sql.startsWith('ALTER TABLE'));
    expect(columns).toHaveLength(19);
    expect(new Set(columns).size).toBe(19);
    expect(
      columns.every((sql) => sql.endsWith('ADD COLUMN deleted_at TIMESTAMPTZ')),
    ).toBe(true);
    expect(statements.join('\n')).not.toMatch(
      /\b(?:INSERT INTO|UPDATE (?:career_|resume_)|DELETE FROM|TRUNCATE)\b/i,
    );
    expect(statements.at(-1)).toContain('WHERE deleted_at IS NULL');
    expect(statements.join('\n')).not.toContain(
      'DROP INDEX career_data_current_source_idx',
    );
    const triggers = statements.filter((sql) =>
      sql.startsWith('CREATE OR REPLACE FUNCTION'),
    );
    expect(triggers).toHaveLength(2);
    for (const trigger of triggers) {
      expect(trigger).toContain("TG_OP='UPDATE'");
      expect(trigger).toContain(
        "(to_jsonb(NEW)-'deleted_at') IS NOT DISTINCT FROM (to_jsonb(OLD)-'deleted_at')",
      );
      expect(trigger).toContain('RAISE EXCEPTION');
    }
  });

  it('down은 어느 테이블에든 tombstone이 있으면 다른 변경 전에 중단한다', async () => {
    query
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('tombstones exist'));
    await expect(
      new AddResumeSoftDelete1795000000005().down(runner),
    ).rejects.toThrow('tombstones');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain('LOCK TABLE');
    const guard = query.mock.calls[1][0];
    expect(guard.match(/WHERE deleted_at IS NOT NULL/g)).toHaveLength(19);
    expect(guard).not.toMatch(/\b(?:DELETE|UPDATE|DROP)\b/);
  });

  it('삭제 이력이 없을 때만 불변 trigger와 기존 unique index를 복원한다', async () => {
    await new AddResumeSoftDelete1795000000005().down(runner);
    const statements = query.mock.calls.map(([sql]) => sql);
    expect(statements[0]).toContain('ACCESS EXCLUSIVE');
    expect(statements[1]).toContain('tombstones');
    expect(statements[3]).not.toContain('WHERE deleted_at IS NULL');
    expect(
      statements.filter((sql) => sql.endsWith('DROP COLUMN deleted_at')),
    ).toHaveLength(19);
  });
});
