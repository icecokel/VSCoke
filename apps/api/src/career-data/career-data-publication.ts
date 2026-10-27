// targetSql은 서버가 작성한 SQL 조건만 받는다. 저장된 버전은 명시적 공개 철회만 차단한다.
export const publicDependencyCondition = (
  targetSql: string,
): string => `NOT EXISTS (
 SELECT 1 FROM resume_content_dependencies d
 LEFT JOIN career_experiences e ON e.id=d.experience_id
 LEFT JOIN career_facts f ON f.id=d.fact_id
 LEFT JOIN career_bullets b ON b.id=d.bullet_id
 LEFT JOIN career_experiences fe ON fe.id=f.experience_id
 LEFT JOIN career_experiences be ON be.id=b.experience_id
 WHERE (${targetSql}) AND (
  d.deleted_at IS NOT NULL OR
  (d.experience_id IS NOT NULL AND (e.id IS NULL OR e.deleted_at IS NOT NULL OR e.public_title IS NULL)) OR
  (d.fact_id IS NOT NULL AND (f.id IS NULL OR f.deleted_at IS NOT NULL OR fe.deleted_at IS NOT NULL OR f.visibility<>'public' OR f.verification_status='retracted')) OR
  (d.bullet_id IS NOT NULL AND (b.id IS NULL OR b.deleted_at IS NOT NULL OR be.deleted_at IS NOT NULL OR b.visibility<>'public' OR b.status='retired'))
 ))`;
