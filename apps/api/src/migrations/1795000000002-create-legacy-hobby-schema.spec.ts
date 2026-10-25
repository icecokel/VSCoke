import type { QueryRunner } from 'typeorm';
import { CreateLegacyHobbySchema1795000000002 } from './1795000000002-create-legacy-hobby-schema';

describe('CreateLegacyHobbySchema1795000000002 SQL contract', () => {
  it('creates the hobby tables only when all of them are absent', async () => {
    const query = await captureMigrationQuery('up');

    expect(query).toContain('IF hobby_object_count = 5 THEN');
    expect(query).toContain('Legacy hobby schema is partial');
    expect(query).toContain('CREATE TABLE public.espresso_bean');
    expect(query).toContain('CREATE TABLE public.espresso_history');
    expect(query).toContain('CREATE TABLE public.espresso_round');
    expect(query).toContain('CREATE TABLE public.recipe');
    expect(query).toContain('CREATE TABLE public.word');
    expect(query).toContain('REFERENCES public.espresso_bean ("id")');
    expect(query).toContain('REFERENCES public.espresso_history ("id")');
    expect(query).toContain('"word" varchar(5) NOT NULL');
    expect(query).not.toMatch(/\bDROP\b|\bALTER\b/);
  });

  it('makes rollback explicitly irreversible instead of dropping adopted data', async () => {
    const query = await captureMigrationQuery('down');

    expect(query).toContain('Legacy hobby baseline is irreversible');
    expect(query).not.toContain('DROP TABLE');
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
  const migration = new CreateLegacyHobbySchema1795000000002();

  await migration[direction](queryRunner);

  return queries[0];
}
