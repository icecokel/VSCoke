import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateResumeContent1795000000003 implements MigrationInterface {
  name = 'CreateResumeContent1795000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "resume_documents" (
      "locale" varchar(5) PRIMARY KEY
        CHECK ("locale" IN ('ko-KR', 'en-US', 'ja-JP')),
      "content" jsonb NOT NULL
    )`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "resume_details" (
      "slug" varchar(160) PRIMARY KEY
        CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
      "title" text NOT NULL,
      "start_date" text,
      "end_date" text,
      "content" text NOT NULL
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "resume_details"');
    await queryRunner.query('DROP TABLE "resume_documents"');
  }
}
