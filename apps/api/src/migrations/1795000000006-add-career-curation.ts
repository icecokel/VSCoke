import type { MigrationInterface, QueryRunner } from 'typeorm';

// 분류 메타데이터는 내용 revision과 분리한다. 기본값은 기존 행을 "미분류"로 두고
// 내용·상태·공개 범위·사실 연결을 바꾸지 않는다.
const bulletColumns = `ALTER TABLE career_bullets
 ADD COLUMN tracks TEXT[] NOT NULL DEFAULT '{}',
 ADD COLUMN tier TEXT,
 ADD COLUMN variant_group TEXT,
 ADD COLUMN ai_involvement TEXT,
 ADD COLUMN curation_note TEXT,
 ADD COLUMN curation_revision INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN curated_at TIMESTAMPTZ,
 ADD CONSTRAINT career_bullets_tracks_check CHECK (tracks IN ('{}'::text[], '{fe}'::text[], '{pe}'::text[], '{fe,pe}'::text[])),
 ADD CONSTRAINT career_bullets_tier_check CHECK (tier IS NULL OR tier IN ('representative', 'supporting', 'hold')),
 ADD CONSTRAINT career_bullets_variant_group_check CHECK (variant_group IS NULL OR (char_length(variant_group) <= 80 AND variant_group ~ '^[a-z0-9]+(-[a-z0-9]+)*$')),
 ADD CONSTRAINT career_bullets_ai_involvement_check CHECK (ai_involvement IS NULL OR ai_involvement IN ('none', 'assisted', 'directed')),
 ADD CONSTRAINT career_bullets_curation_note_check CHECK (curation_note IS NULL OR (btrim(curation_note) <> '' AND char_length(curation_note) <= 2000)),
 ADD CONSTRAINT career_bullets_curation_revision_check CHECK (curation_revision >= 0)`;
const factColumns = `ALTER TABLE career_facts
 ADD COLUMN evidence_level TEXT,
 ADD COLUMN curation_revision INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN curated_at TIMESTAMPTZ,
 ADD CONSTRAINT career_facts_evidence_level_check CHECK (evidence_level IS NULL OR evidence_level IN ('source_verified', 'document_reuse', 'user_statement', 'external_report')),
 ADD CONSTRAINT career_facts_curation_revision_check CHECK (curation_revision >= 0)`;

export class AddCareerCuration1795000000006 implements MigrationInterface {
  name = 'AddCareerCuration1795000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(bulletColumns);
    await queryRunner.query(factColumns);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE career_facts
 DROP CONSTRAINT career_facts_curation_revision_check,
 DROP CONSTRAINT career_facts_evidence_level_check,
 DROP COLUMN curated_at,
 DROP COLUMN curation_revision,
 DROP COLUMN evidence_level`);
    await queryRunner.query(`ALTER TABLE career_bullets
 DROP CONSTRAINT career_bullets_curation_revision_check,
 DROP CONSTRAINT career_bullets_curation_note_check,
 DROP CONSTRAINT career_bullets_ai_involvement_check,
 DROP CONSTRAINT career_bullets_variant_group_check,
 DROP CONSTRAINT career_bullets_tier_check,
 DROP CONSTRAINT career_bullets_tracks_check,
 DROP COLUMN curated_at,
 DROP COLUMN curation_revision,
 DROP COLUMN curation_note,
 DROP COLUMN ai_involvement,
 DROP COLUMN variant_group,
 DROP COLUMN tier,
 DROP COLUMN tracks`);
  }
}
