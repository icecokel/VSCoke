import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResumeRagChatLogs1794873600000 implements MigrationInterface {
  name = 'CreateResumeRagChatLogs1794873600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resume_rag_chat_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "questionText" text NOT NULL,
        "questionHash" varchar(64) NOT NULL,
        "locale" varchar(16) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_rag_chat_logs_created_at" ON "resume_rag_chat_logs" ("createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_rag_chat_logs_locale_created_at" ON "resume_rag_chat_logs" ("locale", "createdAt" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_rag_chat_logs"`);
  }
}
