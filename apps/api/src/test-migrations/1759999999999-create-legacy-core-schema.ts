import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLegacyCoreSchema1759999999999 implements MigrationInterface {
  name = 'CreateLegacyCoreSchema1759999999999';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" varchar PRIMARY KEY,
        "email" varchar NOT NULL,
        "firstName" varchar NOT NULL,
        "lastName" varchar NOT NULL,
        "accessToken" varchar
      )
    `);
    await queryRunner.query(
      `CREATE TYPE "game_history_gametype_enum" AS ENUM ('SKY_DROP')`,
    );
    await queryRunner.query(`
      CREATE TABLE "game_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "score" integer NOT NULL,
        "gameType" "game_history_gametype_enum" NOT NULL DEFAULT 'SKY_DROP',
        "playTime" integer,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "userId" varchar NOT NULL,
        CONSTRAINT "FK_game_history_user_id"
          FOREIGN KEY ("userId") REFERENCES "user" ("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_game_history_user_id" ON "game_history" ("userId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_game_history_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "game_history"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "game_history_gametype_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
  }
}
