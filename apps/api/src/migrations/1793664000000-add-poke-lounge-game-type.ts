import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPokeLoungeGameType1793664000000 implements MigrationInterface {
  name = 'AddPokeLoungeGameType1793664000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "game_history_gametype_enum" ADD VALUE IF NOT EXISTS 'POKE_LOUNGE'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN RAISE NOTICE 'POKE_LOUNGE enum value is retained because PostgreSQL enum value removal requires table/type rewrite and can lose existing game history rows.'; END $$;`,
    );
  }
}
