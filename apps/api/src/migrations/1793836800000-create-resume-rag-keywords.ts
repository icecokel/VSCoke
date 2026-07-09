import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResumeRagKeywords1793836800000 implements MigrationInterface {
  name = 'CreateResumeRagKeywords1793836800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resume_rag_keyword_groups" (
        "id" varchar(80) PRIMARY KEY,
        "weight" integer NOT NULL,
        "enabled" boolean NOT NULL DEFAULT TRUE,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resume_rag_keyword_terms" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "groupId" varchar(80) NOT NULL,
        "termType" varchar(32) NOT NULL,
        "term" varchar(160) NOT NULL,
        "locale" varchar(16),
        "enabled" boolean NOT NULL DEFAULT TRUE,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "source" varchar(40) NOT NULL DEFAULT 'manual',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_resume_rag_keyword_terms_groupId"
          FOREIGN KEY ("groupId")
          REFERENCES "resume_rag_keyword_groups"("id")
          ON DELETE CASCADE,
        CONSTRAINT "CHK_resume_rag_keyword_terms_termType"
          CHECK ("termType" IN ('alias', 'search_expansion'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_rag_keyword_groups_enabled_sort" ON "resume_rag_keyword_groups" ("enabled", "sortOrder")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_rag_keyword_terms_group_type_enabled" ON "resume_rag_keyword_terms" ("groupId", "termType", "enabled")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_resume_rag_keyword_terms_unique" ON "resume_rag_keyword_terms" ("groupId", "termType", COALESCE("locale", ''), "term")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_rag_keyword_terms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_rag_keyword_groups"`);
  }
}
