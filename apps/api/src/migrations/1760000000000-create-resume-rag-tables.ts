import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResumeRagTables1760000000000 implements MigrationInterface {
  name = 'CreateResumeRagTables1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resume_import_batches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sourceName" varchar(120) NOT NULL,
        "sourceRoot" varchar(500) NOT NULL,
        "importerVersion" varchar(80) NOT NULL,
        "status" varchar(32) NOT NULL,
        "startedAt" timestamptz NOT NULL,
        "finishedAt" timestamptz,
        "summary" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resume_source_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "importBatchId" uuid,
        "sourceType" varchar(60) NOT NULL,
        "itemType" varchar(60) NOT NULL,
        "sourcePath" varchar(500) NOT NULL,
        "sourceKey" varchar(300) NOT NULL,
        "title" varchar(300) NOT NULL,
        "bodyText" text NOT NULL,
        "locale" varchar(16),
        "status" varchar(32) NOT NULL,
        "visibility" varchar(40) NOT NULL,
        "vectorize" boolean NOT NULL,
        "contentHash" varchar(96) NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_resume_source_items_importBatchId"
          FOREIGN KEY ("importBatchId")
          REFERENCES "resume_import_batches"("id")
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resume_vector_chunks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sourceItemId" uuid NOT NULL,
        "chunkIndex" integer NOT NULL,
        "content" text NOT NULL,
        "contentHash" varchar(96) NOT NULL,
        "sourceType" varchar(60) NOT NULL,
        "itemType" varchar(60) NOT NULL,
        "title" varchar(300) NOT NULL,
        "locale" varchar(16),
        "sourcePath" varchar(500) NOT NULL,
        "sourceKey" varchar(300) NOT NULL,
        "visibility" varchar(40) NOT NULL,
        "status" varchar(32) NOT NULL,
        "citationMetadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "embeddingProvider" varchar(80) NOT NULL,
        "embeddingModel" varchar(160) NOT NULL,
        "embeddingDimensions" integer NOT NULL,
        "embedding" vector NOT NULL,
        "chunkerVersion" varchar(80) NOT NULL,
        "chunkConfigHash" varchar(96) NOT NULL,
        "indexedAt" timestamptz NOT NULL
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_resume_source_items_source_key_hash" ON "resume_source_items" ("sourceType", "sourceKey", "contentHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_source_items_source_item_type" ON "resume_source_items" ("sourceType", "itemType")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_source_items_status_visibility_vectorize" ON "resume_source_items" ("status", "visibility", "vectorize")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_source_items_content_hash" ON "resume_source_items" ("contentHash")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_resume_vector_chunks_profile_unique" ON "resume_vector_chunks" ("sourceItemId", "chunkIndex", "embeddingProvider", "embeddingModel", "embeddingDimensions", "chunkerVersion", "chunkConfigHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_vector_chunks_locale" ON "resume_vector_chunks" ("locale")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_vector_chunks_status_visibility" ON "resume_vector_chunks" ("status", "visibility")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_resume_vector_chunks_embedding_profile" ON "resume_vector_chunks" ("embeddingProvider", "embeddingModel", "embeddingDimensions")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_vector_chunks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_source_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "resume_import_batches"`);
  }
}
