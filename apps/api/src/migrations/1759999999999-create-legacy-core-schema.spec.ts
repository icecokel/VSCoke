import type { QueryRunner } from 'typeorm';
import { CreateLegacyCoreSchema1759999999999 } from './1759999999999-create-legacy-core-schema';

describe('CreateLegacyCoreSchema1759999999999 SQL contract', () => {
  it('creates the canonical historical schema only when all core objects are absent', async () => {
    const query = await captureMigrationQuery('up');

    expect(query).not.toContain('set_config');
    expect(query).toContain(
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public',
    );
    expect(query).toContain('CREATE TABLE public."user"');
    expect(query).toContain(
      `CREATE TYPE public.game_history_gametype_enum AS ENUM ('SKY_DROP')`,
    );
    expect(query).toContain('CREATE TABLE public.game_history');
    expect(query).toContain('REFERENCES public."user" ("id")');
    expect(query).toContain(
      'CREATE INDEX "IDX_game_history_user_id"\n            ON public.game_history',
    );
  });

  it('rejects partial objects and validates an exact existing schema', async () => {
    const query = await captureMigrationQuery('up');

    expect(query).toContain('Legacy core schema is partial');
    expect(query).toContain('information_schema.columns');
    expect(query).toContain('bool_and(COALESCE(');
    expect(query).toContain('pg_catalog.pg_constraint');
    expect(query).toContain('constraint_record.convalidated');
    expect(query).toContain('NOT constraint_record.condeferrable');
    expect(query).toContain('NOT constraint_record.condeferred');
    expect(query).toContain(`constraint_record.confmatchtype = 's'`);
    expect(query).toContain('pg_catalog.pg_index');
    expect(query).toContain('NOT index_record.indisunique');
    expect(query).toContain('index_record.indpred IS NULL');
    expect(query).toContain('index_record.indexprs IS NULL');
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
