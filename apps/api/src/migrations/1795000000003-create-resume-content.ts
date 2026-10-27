import type { MigrationInterface, QueryRunner } from 'typeorm';
import {
  resumeDetailSnapshot,
  resumeDocumentSnapshot,
} from './data/resume-content-snapshot';

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
    for (const { locale, ...content } of resumeDocumentSnapshot) {
      await queryRunner.query(
        `INSERT INTO "resume_documents" ("locale", "content")
         VALUES ($1, $2::jsonb) ON CONFLICT ("locale") DO NOTHING`,
        [locale, JSON.stringify(content)],
      );
    }
    for (const detail of resumeDetailSnapshot) {
      await queryRunner.query(
        `INSERT INTO "resume_details"
         ("slug", "title", "start_date", "end_date", "content")
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("slug") DO NOTHING`,
        [
          detail.slug,
          detail.title,
          detail.startDate ?? null,
          detail.endDate ?? null,
          detail.content,
        ],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "resume_details"');
    await queryRunner.query('DROP TABLE "resume_documents"');
  }
}
