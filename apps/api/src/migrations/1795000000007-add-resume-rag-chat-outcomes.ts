import type { MigrationInterface, QueryRunner } from 'typeorm';

// 기존 행은 모두 단일 턴 이력 질문이므로 channel만 resume으로 채우고 결과 컬럼은
// 알 수 없음(NULL)으로 둔다. 질문 원문·hash·생성 시각은 바꾸지 않는다.
const addColumns = `ALTER TABLE "resume_rag_chat_logs"
 ALTER COLUMN "questionText" DROP NOT NULL,
 ALTER COLUMN "questionHash" DROP NOT NULL,
 ADD COLUMN "channel" varchar(12) NOT NULL DEFAULT 'resume',
 ADD COLUMN "outcome" varchar(16),
 ADD COLUMN "sourceCount" integer,
 ADD COLUMN "durationMs" integer,
 ADD COLUMN "failureStage" varchar(32),
 ADD CONSTRAINT "CHK_resume_rag_chat_logs_question" CHECK (("questionText" IS NULL) = ("questionHash" IS NULL)),
 ADD CONSTRAINT "CHK_resume_rag_chat_logs_channel" CHECK ("channel" IN ('main', 'resume')),
 ADD CONSTRAINT "CHK_resume_rag_chat_logs_outcome" CHECK ("outcome" IS NULL OR "outcome" IN ('simple-reply', 'no-evidence', 'answered', 'rejected', 'failed')),
 ADD CONSTRAINT "CHK_resume_rag_chat_logs_result" CHECK (
   ("outcome" IS NULL AND "questionText" IS NOT NULL AND "sourceCount" IS NULL
     AND "durationMs" IS NULL AND "failureStage" IS NULL)
   OR ("outcome" IS NOT NULL AND "sourceCount" >= 0 AND "durationMs" >= 0
     AND ("outcome" IN ('rejected', 'failed')) = ("failureStage" IS NOT NULL))
 )`;

export class AddResumeRagChatOutcomes1795000000007 implements MigrationInterface {
  name = 'AddResumeRagChatOutcomes1795000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(addColumns);
    await queryRunner.query(
      `ALTER TABLE "resume_rag_chat_logs" ALTER COLUMN "channel" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_resume_rag_chat_logs_channel_outcome_created_at" ON "resume_rag_chat_logs" ("channel", "outcome", "createdAt" DESC)`,
    );
  }

  // 결과만 기록한 행은 질문 원문이 없어 NOT NULL로 되돌릴 수 없다. 기록을 임의로 지우지
  // 않도록 그런 행이 있으면 down을 거부한다. 운영 기본 롤백 수단으로 사용하지 않는다.
  async down(queryRunner: QueryRunner): Promise<void> {
    const outcomeOnlyRows: unknown = await queryRunner.query(
      `SELECT 1 FROM "resume_rag_chat_logs" WHERE "questionText" IS NULL LIMIT 1`,
    );
    if (Array.isArray(outcomeOnlyRows) && outcomeOnlyRows.length > 0) {
      throw new Error(
        'resume_rag_chat_logs has outcome-only rows; review them before reverting',
      );
    }
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_resume_rag_chat_logs_channel_outcome_created_at"`,
    );
    await queryRunner.query(`ALTER TABLE "resume_rag_chat_logs"
 DROP CONSTRAINT "CHK_resume_rag_chat_logs_result",
 DROP CONSTRAINT "CHK_resume_rag_chat_logs_outcome",
 DROP CONSTRAINT "CHK_resume_rag_chat_logs_channel",
 DROP CONSTRAINT "CHK_resume_rag_chat_logs_question",
 DROP COLUMN "failureStage",
 DROP COLUMN "durationMs",
 DROP COLUMN "sourceCount",
 DROP COLUMN "outcome",
 DROP COLUMN "channel",
 ALTER COLUMN "questionHash" SET NOT NULL,
 ALTER COLUMN "questionText" SET NOT NULL`);
  }
}
