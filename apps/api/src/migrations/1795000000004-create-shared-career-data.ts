import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSharedCareerData1795000000004 implements MigrationInterface {
  name = 'CreateSharedCareerData1795000000004';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE career_experiences (
    id UUID PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    company TEXT NOT NULL CHECK (btrim(company) <> ''),
    project TEXT,
    title TEXT NOT NULL CHECK (btrim(title) <> ''),
    public_title TEXT CHECK (public_title IS NULL OR btrim(public_title) <> ''),
    period_start VARCHAR(7) CHECK (period_start ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    period_end VARCHAR(7) CHECK (period_end ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (period_start IS NULL OR period_end IS NULL OR period_start <= period_end)
);

CREATE TABLE career_facts (
    id UUID PRIMARY KEY,
    experience_id UUID NOT NULL REFERENCES career_experiences(id),
    kind TEXT NOT NULL CHECK (kind IN (
        'context', 'decision', 'action', 'ownership',
        'collaboration', 'validation', 'result', 'limitation'
    )),
    content TEXT NOT NULL CHECK (btrim(content) <> ''),
    verification_status TEXT NOT NULL DEFAULT 'needs_confirmation'
        CHECK (verification_status IN ('confirmed', 'needs_confirmation', 'retracted')),
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence) = 'array'),
    metric JSONB CHECK (metric IS NULL OR jsonb_typeof(metric) = 'object'),
    claim_boundary TEXT,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id, experience_id),
    CHECK (verification_status <> 'confirmed' OR jsonb_array_length(evidence) > 0)
);

CREATE TABLE career_bullets (
    id UUID PRIMARY KEY,
    experience_id UUID NOT NULL REFERENCES career_experiences(id),
    source_refs JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(source_refs) = 'array'),
    review_note TEXT,
    text TEXT NOT NULL CHECK (btrim(text) <> ''),
    focus TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'ready', 'needs_review', 'retired')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id, experience_id)
);

CREATE TABLE career_bullet_facts (
    bullet_id UUID NOT NULL,
    fact_id UUID NOT NULL,
    -- 두 FK에 같은 경험을 사용해 다른 제품의 사실을 잘못 합치지 못하게 한다.
    experience_id UUID NOT NULL,
    -- 문구를 검토했을 때의 사실 버전. 사실이 바뀌면 불렛을 다시 검토한다.
    fact_revision INTEGER NOT NULL CHECK (fact_revision > 0),
    PRIMARY KEY (bullet_id, fact_id),
    FOREIGN KEY (bullet_id, experience_id) REFERENCES career_bullets(id, experience_id),
    FOREIGN KEY (fact_id, experience_id) REFERENCES career_facts(id, experience_id)
);

CREATE TABLE career_keywords (
    id UUID PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    key TEXT NOT NULL UNIQUE CHECK (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    label TEXT NOT NULL CHECK (btrim(label) <> ''),
    kind TEXT NOT NULL CHECK (kind IN ('technology', 'task', 'competency')),
    aliases TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE career_bullet_keywords (
    bullet_id UUID NOT NULL REFERENCES career_bullets(id),
    keyword_id UUID NOT NULL REFERENCES career_keywords(id),
    PRIMARY KEY (bullet_id, keyword_id)
);

CREATE INDEX career_facts_experience_idx ON career_facts(experience_id);
CREATE INDEX career_bullets_experience_idx ON career_bullets(experience_id);
CREATE INDEX career_bullet_facts_fact_idx ON career_bullet_facts(fact_id);
CREATE INDEX career_bullet_keywords_keyword_idx ON career_bullet_keywords(keyword_id);


CREATE TABLE resumes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), key VARCHAR(80) NOT NULL CHECK (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 kind TEXT NOT NULL CHECK (kind IN ('base','targeted')), track TEXT NOT NULL CHECK (track IN ('front-end','product-engineer')),
 locale VARCHAR(5) NOT NULL CHECK (locale IN ('ko-KR','en-US','ja-JP')), target_key TEXT,
 visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')), current_version_id UUID,
 revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0), current_version_changed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(key,locale), CHECK ((kind='base' AND target_key IS NULL) OR (kind='targeted' AND target_key IS NOT NULL AND btrim(target_key) <> ''))
);
CREATE TABLE resume_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), resume_id UUID NOT NULL REFERENCES resumes(id), version_name TEXT NOT NULL CHECK (btrim(version_name) <> ''),
 parent_version_id UUID, content JSONB NOT NULL CHECK (jsonb_typeof(content)='object'), content_hash VARCHAR(64) NOT NULL,
 source_ref JSONB, payload_hash VARCHAR(64) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(resume_id,version_name), UNIQUE(id,resume_id),
 FOREIGN KEY (parent_version_id) REFERENCES resume_versions(id)
);
ALTER TABLE resumes ADD CONSTRAINT resumes_current_version_fk FOREIGN KEY (current_version_id,id) REFERENCES resume_versions(id,resume_id);
ALTER TABLE resume_details ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
 ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
 ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE resume_source_items ADD COLUMN "resumeId" UUID REFERENCES resumes(id),
 ADD COLUMN "resumeVersionId" UUID, ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT true,
 ADD CONSTRAINT resume_source_version_fk FOREIGN KEY ("resumeVersionId","resumeId") REFERENCES resume_versions(id,resume_id),
 ADD CONSTRAINT resume_source_version_owner CHECK ("resumeVersionId" IS NULL OR "resumeId" IS NOT NULL);
CREATE UNIQUE INDEX career_data_current_source_idx ON resume_source_items("sourceType","sourceKey") WHERE "sourceType"='career_data' AND "isCurrent";
ALTER TABLE resume_chat_conversations ADD COLUMN "resumeKey" VARCHAR(80);
UPDATE resume_chat_conversations SET "resumeKey"='pe' WHERE channel='resume';
CREATE TABLE resume_content_dependencies (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), resume_version_id UUID REFERENCES resume_versions(id),
 detail_slug VARCHAR(160) REFERENCES resume_details(slug), detail_revision INTEGER CHECK(detail_revision > 0),
 source_item_id UUID REFERENCES resume_source_items(id),
 experience_id UUID REFERENCES career_experiences(id), fact_id UUID REFERENCES career_facts(id),
 bullet_id UUID REFERENCES career_bullets(id), keyword_id UUID REFERENCES career_keywords(id),
 source_revision INTEGER NOT NULL CHECK (source_revision>0), source_snapshot JSONB NOT NULL CHECK(jsonb_typeof(source_snapshot)='object'),
 CHECK (num_nonnulls(resume_version_id,detail_slug,source_item_id)=1),
 CHECK (num_nonnulls(experience_id,fact_id,bullet_id,keyword_id)=1),
 CHECK ((detail_slug IS NOT NULL)=(detail_revision IS NOT NULL))
);
CREATE UNIQUE INDEX resume_dependency_unique_idx ON resume_content_dependencies
 (resume_version_id,detail_slug,detail_revision,source_item_id,experience_id,fact_id,bullet_id,keyword_id) NULLS NOT DISTINCT;
CREATE INDEX resume_dependency_experience_idx ON resume_content_dependencies(experience_id);
CREATE INDEX resume_dependency_fact_idx ON resume_content_dependencies(fact_id);
CREATE INDEX resume_dependency_bullet_idx ON resume_content_dependencies(bullet_id);
CREATE INDEX resume_dependency_keyword_idx ON resume_content_dependencies(keyword_id);
CREATE FUNCTION prevent_resume_version_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'resume versions and dependencies are immutable'; END $$;
CREATE TRIGGER resume_version_immutable BEFORE UPDATE OR DELETE ON resume_versions FOR EACH ROW EXECUTE FUNCTION prevent_resume_version_mutation();
CREATE FUNCTION prevent_frozen_dependency_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'dependency snapshots are immutable'; END $$;
CREATE TRIGGER resume_dependency_immutable BEFORE UPDATE OR DELETE ON resume_content_dependencies FOR EACH ROW EXECUTE FUNCTION prevent_frozen_dependency_mutation();
`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE resume_content_dependencies;
DROP FUNCTION prevent_frozen_dependency_mutation();
ALTER TABLE resume_chat_conversations DROP COLUMN "resumeKey";
DROP INDEX career_data_current_source_idx;
ALTER TABLE resume_source_items DROP CONSTRAINT resume_source_version_owner, DROP CONSTRAINT resume_source_version_fk, DROP COLUMN "resumeVersionId", DROP COLUMN "resumeId", DROP COLUMN "isCurrent";
ALTER TABLE resume_details DROP COLUMN revision, DROP COLUMN visibility, DROP COLUMN updated_at;
ALTER TABLE resumes DROP CONSTRAINT resumes_current_version_fk;
DROP TABLE resume_versions; DROP FUNCTION prevent_resume_version_mutation(); DROP TABLE resumes;
DROP TABLE career_bullet_keywords; DROP TABLE career_bullet_facts; DROP TABLE career_keywords; DROP TABLE career_bullets; DROP TABLE career_facts; DROP TABLE career_experiences;`);
  }
}
