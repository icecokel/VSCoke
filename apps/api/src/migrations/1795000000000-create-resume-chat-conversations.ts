import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResumeChatConversations1795000000000 implements MigrationInterface {
  name = 'CreateResumeChatConversations1795000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "resume_chat_conversations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "tokenHash" varchar(64) NOT NULL,
      "channel" varchar(12) NOT NULL CHECK ("channel" IN ('main', 'resume')),
      "locale" varchar(16) NOT NULL,
      "version" integer NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "expiresAt" timestamptz NOT NULL
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_resume_chat_conversations_expiry"
      ON "resume_chat_conversations" ("expiresAt")`);
    await queryRunner.query(`CREATE TABLE "resume_chat_turns" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "conversationId" uuid NOT NULL REFERENCES "resume_chat_conversations"("id") ON DELETE CASCADE,
      "requestId" uuid NOT NULL,
      "question" text NOT NULL,
      "answer" text NOT NULL,
      "grounded" boolean NOT NULL,
      "sources" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_resume_chat_turn_request" UNIQUE ("conversationId", "requestId")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_resume_chat_turns_history"
      ON "resume_chat_turns" ("conversationId", "createdAt")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "resume_chat_turns"');
    await queryRunner.query('DROP TABLE "resume_chat_conversations"');
  }
}
