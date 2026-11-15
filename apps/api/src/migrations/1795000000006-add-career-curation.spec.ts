import type { QueryRunner } from 'typeorm';
import { AddCareerCuration1795000000006 } from './1795000000006-add-career-curation';

describe('AddCareerCuration1795000000006', () => {
  const query = jest.fn<Promise<unknown>, [string]>();
  const runner = { query } as unknown as QueryRunner;
  beforeEach(() => query.mockReset().mockResolvedValue(undefined));

  it('불렛·사실에 기본값이 있는 분류 컬럼과 값 집합 제약만 추가한다', async () => {
    await new AddCareerCuration1795000000006().up(runner);
    const statements = query.mock.calls.map(([sql]) => sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toMatch(/^ALTER TABLE career_bullets\b/);
    expect(statements[1]).toMatch(/^ALTER TABLE career_facts\b/);
    const sql = statements.join('\n');
    expect(sql).not.toMatch(
      /\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|DROP)\b/i,
    );
    // 기존 행은 NULL 또는 기본값으로 남아 모든 CHECK를 그대로 통과해야 한다.
    expect(sql).toContain("tracks TEXT[] NOT NULL DEFAULT '{}'");
    expect(
      sql.match(/curation_revision INTEGER NOT NULL DEFAULT 0/g),
    ).toHaveLength(2);
    for (const column of [
      'tier TEXT,',
      'variant_group TEXT,',
      'ai_involvement TEXT,',
      'curation_note TEXT,',
      'evidence_level TEXT,',
    ])
      expect(sql).toContain(`ADD COLUMN ${column}`);
    for (const value of [
      "'representative', 'supporting', 'hold'",
      "'none', 'assisted', 'directed'",
      "'source_verified', 'document_reuse', 'user_statement', 'external_report'",
      "'{fe,pe}'::text[]",
    ])
      expect(sql).toContain(value);
    expect(sql).not.toMatch(/\b(?:revision|status|visibility|text)\s*=/);
  });

  it('down은 추가한 제약과 컬럼만 제거한다', async () => {
    await new AddCareerCuration1795000000006().down(runner);
    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql.match(/DROP CONSTRAINT/g)).toHaveLength(8);
    expect(sql.match(/DROP COLUMN/g)).toHaveLength(10);
    expect(sql).not.toMatch(
      /DROP COLUMN (?:revision|status|visibility|text|updated_at)\b/,
    );
    expect(sql).not.toMatch(/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\b/);
  });
});
