// targetSql은 서버가 작성한 SQL 조건만 받는다. 저장된 버전은 명시적 공개 철회만 차단한다.
export const publicDependencyCondition = (
  targetSql: string,
): string => `NOT EXISTS (
 SELECT 1 FROM resume_content_dependencies d
 LEFT JOIN career_experiences e ON e.id=d.experience_id
 LEFT JOIN career_facts f ON f.id=d.fact_id
 LEFT JOIN career_bullets b ON b.id=d.bullet_id
 WHERE (${targetSql}) AND (
  (d.experience_id IS NOT NULL AND e.public_title IS NULL) OR
  (d.fact_id IS NOT NULL AND (f.visibility<>'public' OR f.verification_status='retracted')) OR
  (d.bullet_id IS NOT NULL AND (b.visibility<>'public' OR b.status='retired'))
 ))`;
