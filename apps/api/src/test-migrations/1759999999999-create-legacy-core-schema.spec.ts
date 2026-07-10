import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GameType } from '../game/enums/game-type.enum';

const migrationPath = join(
  __dirname,
  '1759999999999-create-legacy-core-schema.ts',
);

describe('CreateLegacyCoreSchema1759999999999', () => {
  it('defines the historical user and game history schema required before production migrations', () => {
    const migrationSource = existsSync(migrationPath)
      ? readFileSync(migrationPath, 'utf8')
      : '';

    expect(migrationSource).toContain(
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
    );
    expect(migrationSource).toContain('CREATE TABLE "user"');
    expect(migrationSource).toContain('"id" varchar PRIMARY KEY');
    expect(migrationSource).toContain('"email" varchar NOT NULL');
    expect(migrationSource).toContain('"firstName" varchar NOT NULL');
    expect(migrationSource).toContain('"lastName" varchar NOT NULL');
    expect(migrationSource).toContain('"accessToken" varchar');
    expect(migrationSource).toContain(
      `CREATE TYPE "game_history_gametype_enum" AS ENUM ('${GameType.SKY_DROP}')`,
    );
    expect(migrationSource).toContain('CREATE TABLE "game_history"');
    expect(migrationSource).toContain(
      '"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    );
    expect(migrationSource).toContain('"score" integer NOT NULL');
    expect(migrationSource).toContain(
      '"gameType" "game_history_gametype_enum" NOT NULL DEFAULT \'SKY_DROP\'',
    );
    expect(migrationSource).toContain('"playTime" integer');
    expect(migrationSource).toContain(
      '"createdAt" timestamp NOT NULL DEFAULT now()',
    );
    expect(migrationSource).toContain('"userId" varchar NOT NULL');
    expect(migrationSource).toMatch(
      /FOREIGN KEY \("userId"\) REFERENCES "user" \("id"\)\s+ON DELETE NO ACTION ON UPDATE NO ACTION/,
    );
    expect(migrationSource).toContain(
      'CREATE INDEX "IDX_game_history_user_id" ON "game_history" ("userId")',
    );
  });
});
