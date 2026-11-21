import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArcadeBasketball1795250000000 implements MigrationInterface {
  name = 'AddArcadeBasketball1795250000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE public.game_history_gametype_enum ADD VALUE IF NOT EXISTS 'ARCADE_BASKETBALL'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.game_history WHERE "gameType"::text = 'ARCADE_BASKETBALL') THEN
          RAISE EXCEPTION 'Basketball ranking records exist; review before reverting';
        END IF;
      END $$`);
    await queryRunner.query(
      `ALTER TABLE public.game_history ALTER COLUMN "gameType" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE public.game_history_gametype_enum RENAME TO game_history_gametype_with_basketball_enum`,
    );
    await queryRunner.query(
      `CREATE TYPE public.game_history_gametype_enum AS ENUM ('SKY_DROP')`,
    );
    await queryRunner.query(
      `ALTER TABLE public.game_history ALTER COLUMN "gameType" TYPE public.game_history_gametype_enum USING "gameType"::text::public.game_history_gametype_enum`,
    );
    await queryRunner.query(
      `ALTER TABLE public.game_history ALTER COLUMN "gameType" SET DEFAULT 'SKY_DROP'`,
    );
    await queryRunner.query(
      `DROP TYPE public.game_history_gametype_with_basketball_enum`,
    );
  }
}
