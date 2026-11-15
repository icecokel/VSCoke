import dataSource from '../src/data-source';
import {
  findResumeRagReadinessProblems,
  inspectResumeRagReadiness,
} from '../src/resume-rag/resume-rag-readiness';
import {
  assertResumeRagSearchScope,
  getResumeRagConfig,
} from '../src/resume-rag/resume-rag.config';

// 배포의 import/index 직후, 서비스 교체 전에 채널별 검색 대상이 실제로 있는지 확인한다.
const main = async () => {
  const config = getResumeRagConfig();
  assertResumeRagSearchScope(config);

  await dataSource.initialize();
  try {
    const report = await inspectResumeRagReadiness(
      (sql, parameters) => dataSource.query(sql, parameters),
      config,
    );
    console.log(JSON.stringify(report, null, 2));
    const problems = findResumeRagReadinessProblems(report);
    if (problems.length > 0) {
      console.error(
        ['Resume RAG 검색 준비 상태 검증 실패:', ...problems].join('\n- '),
      );
      process.exitCode = 1;
    }
  } finally {
    await dataSource.destroy();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
