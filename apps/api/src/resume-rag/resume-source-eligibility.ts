import { NotFoundException } from '@nestjs/common';
import { publicDependencyCondition } from '../career-data/career-data-publication';

export const publicResumeCondition = (alias: string): string =>
  `${alias}.visibility = 'public' AND ${alias}.current_version_id IS NOT NULL
   AND ${publicDependencyCondition(`d.resume_version_id = ${alias}.current_version_id`)}`;

export const assertPublicResume = async (
  query: (sql: string, parameters: unknown[]) => Promise<unknown>,
  key: string,
  locale: string,
): Promise<void> => {
  const rows: unknown = await query(
    `SELECT r.id FROM resumes r WHERE r.key = $1 AND r.locale = $2
      AND ${publicResumeCondition('r')} LIMIT 1`,
    [key, locale],
  );
  if (!Array.isArray(rows) || rows.length === 0)
    throw new NotFoundException('Resume not found');
};

// 식별자와 placeholder는 서버 코드만 전달한다. 값은 항상 SQL parameter로 묶는다.
export const careerSourceCondition = (source: string): string => `(
  ${source}."sourceType" <> 'career_data' OR (
    ${source}."isCurrent" = TRUE
    AND ${publicDependencyCondition(`d.source_item_id = ${source}.id`)}
    AND (
      (${source}."itemType" = 'resume_version' AND EXISTS (
        SELECT 1 FROM resumes r WHERE r.id = ${source}."resumeId"
          AND r.current_version_id = ${source}."resumeVersionId"
          AND r.locale = ${source}.locale AND ${publicResumeCondition('r')}
      )) OR
      (${source}."itemType" = 'career_fact' AND EXISTS (
        SELECT 1 FROM resume_content_dependencies dep
        INNER JOIN career_facts f ON f.id = dep.fact_id
        WHERE dep.source_item_id = ${source}.id AND f.revision = dep.source_revision
          AND f.visibility = 'public' AND f.verification_status = 'confirmed'
      )) OR
      (${source}."itemType" = 'project_detail' AND EXISTS (
        SELECT 1 FROM resume_details detail
        WHERE detail.slug = ${source}.metadata->>'slug'
          AND detail.visibility = 'public'
          AND detail.revision::text = ${source}.metadata->>'revision'
          AND ${publicDependencyCondition('d.detail_slug = detail.slug AND d.detail_revision = detail.revision')}
      ))
    )
  )
)`;

export const selectedResumeSourceCondition = (
  source: string,
  keyParameter: string,
  localeParameter: string,
): string => `(
  ${source}."sourceType" = 'career_data' AND EXISTS (
    SELECT 1 FROM resumes selected
    WHERE selected.key = ${keyParameter} AND selected.locale = ${localeParameter}
      AND ${publicResumeCondition('selected')}
      AND (${source}."itemType" = 'career_fact' OR
        (${source}."itemType" = 'resume_version'
          AND selected.id = ${source}."resumeId"
          AND selected.current_version_id = ${source}."resumeVersionId"))
  )
)`;

export const legacyDetailCondition = (source: string): string => `NOT (
  ${source}."sourceType" = 'app_resume' AND ${source}."itemType" = 'public_resume_detail'
  AND EXISTS (
    SELECT 1 FROM resume_source_items canonical
    WHERE canonical."sourceType" = 'career_data' AND canonical."itemType" = 'project_detail'
      AND canonical."isCurrent" = TRUE
      AND (${source}."sourceKey" = 'app:resume-detail:' || (canonical.metadata->>'slug')
        OR starts_with(${source}."sourceKey", 'app:resume-detail:' || (canonical.metadata->>'slug') || '#'))
  )
)`;
