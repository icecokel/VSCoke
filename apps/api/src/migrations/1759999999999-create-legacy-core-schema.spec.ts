import type { QueryRunner } from 'typeorm';
import { CreateLegacyCoreSchema1759999999999 } from './1759999999999-create-legacy-core-schema';

describe('CreateLegacyCoreSchema1759999999999 SQL contract', () => {
  it('creates the canonical historical schema only when all core objects are absent', async () => {
    const query = await captureMigrationQuery('up');

    expect(query).toContain('CREATE TABLE "user"');
    expect(query).toContain(
      `CREATE TYPE "game_history_gametype_enum" AS ENUM ('SKY_DROP')`,
    );
    expect(query).toContain('CREATE TABLE "game_history"');
    expect(query).toContain('CREATE INDEX "IDX_game_history_user_id"');
  });

  it('rejects partial objects and validates an exact existing schema', async () => {
    const query = await captureMigrationQuery('up');

    expect(query).toContain('Legacy core schema is partial');
    expect(query).toContain('information_schema.columns');
    expect(query).toContain('pg_catalog.pg_constraint');
    expect(query).toContain('pg_catalog.pg_enum');
    expect(query).toContain(`ARRAY['SKY_DROP', 'POKE_LOUNGE']::text[]`);
    expect(query).toContain('Legacy core schema mismatch');
    expect(query).not.toMatch(/\bDROP\b|\bALTER\b/);
  });

  it('makes rollback explicitly irreversible instead of dropping adopted data', async () => {
    const query = await captureMigrationQuery('down');

    expect(query).toContain('Legacy core baseline is irreversible');
    expect(query).not.toContain('DROP TABLE');
    expect(query).not.toContain('DROP TYPE');
  });
});

async function captureMigrationQuery(
  direction: 'up' | 'down',
): Promise<string> {
  const queries: string[] = [];
  const queryRunner = {
    query: (query: string): Promise<void> => {
      queries.push(query);

      return Promise.resolve();
    },
  } as unknown as QueryRunner;
  const migration = new CreateLegacyCoreSchema1759999999999();

  await migration[direction](queryRunner);

  return queries[0];
}
