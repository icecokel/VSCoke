import type { MigrationInterface, QueryRunner } from 'typeorm';

const tables = [
  'career_experiences',
  'career_facts',
  'career_bullets',
  'career_keywords',
  'career_bullet_facts',
  'career_bullet_keywords',
  'resumes',
  'resume_versions',
  'resume_content_dependencies',
  'resume_details',
  'resume_documents',
  'resume_source_items',
  'resume_vector_chunks',
  'resume_import_batches',
  'resume_rag_keyword_groups',
  'resume_rag_keyword_terms',
  'resume_rag_chat_logs',
  'resume_chat_conversations',
  'resume_chat_turns',
];
const profileIndex = `CREATE UNIQUE INDEX "IDX_resume_vector_chunks_profile_unique" ON resume_vector_chunks ("sourceItemId", "chunkIndex", "embeddingProvider", "embeddingModel", "embeddingDimensions", "chunkerVersion", "chunkConfigHash")`;

export class AddResumeSoftDelete1795000000005 implements MigrationInterface {
  name = 'AddResumeSoftDelete1795000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of tables)
      await queryRunner.query(
        `ALTER TABLE ${table} ADD COLUMN deleted_at TIMESTAMPTZ`,
      );
    for (const functionName of [
      'prevent_resume_version_mutation',
      'prevent_frozen_dependency_mutation',
    ])
      await queryRunner.query(`CREATE OR REPLACE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'deleted_at') IS NOT DISTINCT FROM (to_jsonb(OLD)-'deleted_at') THEN RETURN NEW; END IF;
        RAISE EXCEPTION 'resume versions and dependency snapshots are immutable'; END $$`);
    await queryRunner.query(
      'DROP INDEX "IDX_resume_vector_chunks_profile_unique"',
    );
    await queryRunner.query(`${profileIndex} WHERE deleted_at IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const ownsTransaction = !queryRunner.isTransactionActive;
    if (ownsTransaction) await queryRunner.startTransaction();
    try {
      // 검사와 컬럼 제거 사이에 삭제 표시가 추가돼 재노출되지 않게 잠근다.
      await queryRunner.query(
        `LOCK TABLE ${tables.join(',')} IN ACCESS EXCLUSIVE MODE`,
      );
      await queryRunner.query(
        `DO $$ BEGIN IF ${tables.map((table) => `EXISTS(SELECT 1 FROM ${table} WHERE deleted_at IS NOT NULL)`).join(' OR ')} THEN RAISE EXCEPTION 'cannot remove soft delete columns while tombstones exist'; END IF; END $$`,
      );
      await queryRunner.query(
        'DROP INDEX "IDX_resume_vector_chunks_profile_unique"',
      );
      await queryRunner.query(profileIndex);
      for (const functionName of [
        'prevent_resume_version_mutation',
        'prevent_frozen_dependency_mutation',
      ])
        await queryRunner.query(
          `CREATE OR REPLACE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'resume versions and dependencies are immutable'; END $$`,
        );
      for (const table of [...tables].reverse())
        await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN deleted_at`);
      if (ownsTransaction) await queryRunner.commitTransaction();
    } catch (error) {
      if (ownsTransaction) await queryRunner.rollbackTransaction();
      throw error;
    }
  }
}
