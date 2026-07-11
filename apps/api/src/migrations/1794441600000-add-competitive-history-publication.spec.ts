import type { QueryRunner } from 'typeorm';
import { AddCompetitiveHistoryPublication1794441600000 } from './1794441600000-add-competitive-history-publication';

describe('AddCompetitiveHistoryPublication1794441600000', () => {
  it('uses the unique later timestamp and adds a nullable JSONB audit mapping', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new AddCompetitiveHistoryPublication1794441600000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(migration.name).toBe(
      'AddCompetitiveHistoryPublication1794441600000',
    );
    expect(query.mock.calls.flat().join('\n')).toMatch(
      /ADD COLUMN "history_publication" jsonb/,
    );
  });
});
