import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsageEvents1795000000001 implements MigrationInterface {
  name = 'CreateUsageEvents1795000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "usage_events" (
      "eventId" uuid PRIMARY KEY,
      "visitorId" uuid NOT NULL,
      "sessionId" uuid NOT NULL,
      "eventName" varchar(32) NOT NULL CHECK ("eventName" IN (
        'page_view', 'chat_submitted', 'chat_completed', 'chat_failed',
        'game_started', 'game_completed', 'search_used', 'share_clicked'
      )),
      "path" varchar(200) NOT NULL,
      "feature" varchar(32) CHECK ("feature" IN (
        'main_chat', 'resume_chat', 'sky_drop', 'wordle', 'beat_jev', 'site_search', 'share'
      )),
      "durationMs" integer CHECK ("durationMs" BETWEEN 0 AND 3600000),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_usage_events_created_at"
      ON "usage_events" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_usage_events_event_time"
      ON "usage_events" ("eventName", "createdAt")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "usage_events"');
  }
}
