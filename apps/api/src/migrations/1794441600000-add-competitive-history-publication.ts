import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompetitiveHistoryPublication1794441600000 implements MigrationInterface {
  name = 'AddCompetitiveHistoryPublication1794441600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "poke_lounge_competitive_match"
      ADD COLUMN "history_publication" jsonb
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "poke_lounge_competitive_match"
      DROP COLUMN "history_publication"
    `);
  }
}
