// 이력 질문 RAG의 검색 전용 오프라인 평가. LLM은 호출하지 않는다.
// 로컬 E5 모델 캐시와 일회용 PostgreSQL _test DB가 필요해 기본 CI와 `pnpm test`에서 실행하지 않는다.
// 실행: RAG_LOCAL_EMBEDDING_CACHE_DIR=<모델 캐시> TEST_DATABASE_URL=<..._test> pnpm --filter @vscoke/api rag:eval
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { DataSource, type QueryRunner } from 'typeorm';
import {
  CareerDataUpsertDto,
  ResumeDetailSaveDto,
} from '../../src/career-data/career-data.dto';
import { CareerDataService } from '../../src/career-data/career-data.service';
import { CreateResumeRagTables1760000000000 } from '../../src/migrations/1760000000000-create-resume-rag-tables';
import { CreateResumeRagKeywords1793836800000 } from '../../src/migrations/1793836800000-create-resume-rag-keywords';
import { CreateResumeRagChatLogs1794873600000 } from '../../src/migrations/1794873600000-create-resume-rag-chat-logs';
import { CreateResumeChatConversations1795000000000 } from '../../src/migrations/1795000000000-create-resume-chat-conversations';
import { CreateSharedCareerData1795000000004 } from '../../src/migrations/1795000000004-create-shared-career-data';
import { AddResumeSoftDelete1795000000005 } from '../../src/migrations/1795000000005-add-resume-soft-delete';
import { AddCareerCuration1795000000006 } from '../../src/migrations/1795000000006-add-career-curation';
import { createEmbeddingProvider } from '../../src/resume-rag/ai/resume-rag-ai-provider.factory';
import { ResumeImportBatch } from '../../src/resume-rag/entities/resume-import-batch.entity';
import { ResumeSourceItem } from '../../src/resume-rag/entities/resume-source-item.entity';
import { ResumeVectorChunk } from '../../src/resume-rag/entities/resume-vector-chunk.entity';
import {
  bulletEvalKey,
  expandResumeRagGoldenSet,
  findResumeRagGoldenSetIssues,
  listResumeRagEvalCorpusTexts,
  parseResumeRagEvalCorpus,
  type ResumeRagEvalCase,
  type ResumeRagEvalCorpus,
} from '../../src/resume-rag/evaluation/resume-rag-eval-dataset';
import {
  reciprocalRankAtK,
  recallAtK,
  summarizeResumeRagEvalByLocale,
  type ResumeRagEvalObservation,
  type ResumeRagEvalSummary,
} from '../../src/resume-rag/evaluation/resume-rag-retrieval-metrics';
import { ResumeSourceItemChunker } from '../../src/resume-rag/indexing/resume-source-item-chunker';
import { ResumeVectorIndexerService } from '../../src/resume-rag/indexing/resume-vector-indexer.service';
import { ResumeRagKeywordService } from '../../src/resume-rag/resume-rag-keyword.service';
import { ResumeRagRetrieverService } from '../../src/resume-rag/resume-rag-retriever.service';
import { getResumeRagConfig } from '../../src/resume-rag/resume-rag.config';
import { requireTestDatabaseUrl } from '../../src/test-data-source';
import { createLegacyResumeTables } from '../support/synthetic-resume-migration';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const fixtureDirectory = __dirname;

// docs/main-chat-ai-usage-guide.md 2절의 운영 값. topK·키워드 기준은 운영 Secret에서 바꾸지 않은 코드 기본값이다.
// 벡터는 절대 기준 없이 순위로 고르므로 폐지된 RAG_VECTOR_MIN_SIMILARITY는 넣지 않는다.
const productionProfile = {
  RAG_RETRIEVAL_MODE: 'hybrid',
  RAG_EMBEDDING_PROVIDER: 'local-e5-q8',
  RAG_EMBEDDING_MODEL:
    'Xenova/multilingual-e5-small@761b726dd34fb83930e26aab4e9ac3899aa1fa78',
  RAG_EMBEDDING_DIMENSIONS: '384',
  RAG_CHUNK_SIZE: '600',
  RAG_CHUNK_OVERLAP: '80',
  RAG_TOP_K: '5',
  RAG_MIN_SIMILARITY: '0.1',
  RAG_ALLOWED_SOURCE_TYPES: 'app_resume,career_data',
};

type EvalOptions = {
  cacheDirectory: string;
  outputPath: string;
  overrides: Record<string, string>;
};

const parseOptions = (argv: string[]): EvalOptions => {
  const flags = new Map<string, string>();
  for (const argument of argv) {
    if (argument === '--') continue;
    const match = /^--([a-z-]+)=(.*)$/.exec(argument);
    if (!match) throw new Error(`알 수 없는 인자: ${argument}`);
    flags.set(match[1], match[2]);
  }
  const allowed = ['cache-dir', 'output', 'mode'];
  const unknown = [...flags.keys()].find((name) => !allowed.includes(name));
  if (unknown) throw new Error(`알 수 없는 옵션: --${unknown}`);

  const cacheDirectory =
    flags.get('cache-dir') ?? process.env.RAG_LOCAL_EMBEDDING_CACHE_DIR;
  if (!cacheDirectory?.trim())
    throw new Error(
      '로컬 E5 모델 캐시 경로가 필요합니다. --cache-dir 또는 RAG_LOCAL_EMBEDDING_CACHE_DIR를 지정하세요.',
    );
  const overrides: Record<string, string> = {};
  const mode = flags.get('mode');
  if (mode) overrides.RAG_RETRIEVAL_MODE = mode;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output =
    flags.get('output') ??
    join(repositoryRoot, 'output', 'rag-eval', `resume-rag-eval-${stamp}.json`);
  return {
    cacheDirectory: resolve(cacheDirectory),
    outputPath: isAbsolute(output) ? output : resolve(process.cwd(), output),
    overrides,
  };
};

// 실행마다 같은 불렛 UUID를 만들어 원문 key와 corpus key를 결정적으로 대응시킨다.
const stableUuid = (name: string): string => {
  const hex = createHash('sha256')
    .update(`resume-rag-eval:${name}`)
    .digest('hex');
  const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const readJson = (name: string): unknown =>
  JSON.parse(readFileSync(join(fixtureDirectory, name), 'utf8'));

const migrate = async (runner: QueryRunner): Promise<void> => {
  await new CreateResumeRagTables1760000000000().up(runner);
  await new CreateResumeChatConversations1795000000000().up(runner);
  await createLegacyResumeTables(runner);
  await new CreateSharedCareerData1795000000004().up(runner);
  await new CreateResumeRagKeywords1793836800000().up(runner);
  await new CreateResumeRagChatLogs1794873600000().up(runner);
  await new AddResumeSoftDelete1795000000005().up(runner);
  await new AddCareerCuration1795000000006().up(runner);
};

const validated = async <T extends object>(
  type: new () => T,
  value: unknown,
): Promise<T> => {
  const instance = plainToInstance(type, value);
  await validateOrReject(instance, { forbidUnknownValues: true });
  return instance;
};

// 운영 관리 API와 같은 서비스 경로로 공개 불렛·상세를 저장해 검색 원문을 만든다.
const seedCorpus = async (
  db: DataSource,
  corpus: ResumeRagEvalCorpus,
): Promise<Map<string, string>> => {
  const writer = new CareerDataService(db);
  const bulletKeyById = new Map<string, string>();
  const experiences = corpus.experiences.map((experience) => ({
    ...experience,
    id: stableUuid(`experience/${experience.key}`),
    bullets: experience.bullets.map((bullet) => ({
      ...bullet,
      id: stableUuid(`bullet/${bullet.key}`),
      factId: stableUuid(`fact/${bullet.key}`),
    })),
  }));
  const bullets = experiences.flatMap((experience) =>
    experience.bullets.map((bullet) => ({ experience, bullet })),
  );
  for (const { bullet } of bullets)
    bulletKeyById.set(bullet.id, bulletEvalKey(bullet.key));

  await writer.upsertData(
    await validated(CareerDataUpsertDto, {
      experiences: experiences.map((experience) => ({
        id: experience.id,
        expectedRevision: 0,
        company: experience.company,
        title: experience.publicTitle,
        publicTitle: experience.publicTitle,
      })),
      facts: bullets.map(({ experience, bullet }) => ({
        id: bullet.factId,
        experienceId: experience.id,
        expectedRevision: 0,
        kind: 'action',
        // 대리 corpus: 운영 근거 사실 대신 공개 업무 문장을 근거 사실로 쓴다.
        content: bullet.text,
        verificationStatus: 'confirmed',
        visibility: 'public',
        evidence: [
          {
            kind: 'document',
            locator: 'public-resume-fe-ko-KR',
            as_of: '2026-11-15',
          },
        ],
      })),
      keywords: [],
      bullets: bullets.map(({ experience, bullet }) => ({
        id: bullet.id,
        experienceId: experience.id,
        expectedRevision: 0,
        text: bullet.text,
        status: 'ready',
        visibility: 'public',
        facts: [{ factId: bullet.factId, factRevision: 1 }],
        keywordIds: [],
      })),
    }),
  );
  for (const detail of corpus.projectDetails)
    await writer.saveDetail(
      detail.slug,
      await validated(ResumeDetailSaveDto, {
        expectedRevision: 0,
        title: detail.title,
        content: detail.content,
        startDate: detail.startDate,
        endDate: detail.endDate,
        visibility: 'public',
        dependencies: [],
      }),
    );
  return bulletKeyById;
};

const toEvalKey = (
  sourceKey: string,
  bulletKeyById: Map<string, string>,
): string => {
  const bullet = /^career-bullet\/([0-9a-f-]{36})\/[a-z]{2}-[A-Z]{2}$/.exec(
    sourceKey,
  );
  return bullet ? (bulletKeyById.get(bullet[1]) ?? sourceKey) : sourceKey;
};

const percent = (value: number | null): string =>
  value === null ? '-' : `${(value * 100).toFixed(1)}%`;
const decimal = (value: number | null): string =>
  value === null ? '-' : value.toFixed(3);

const formatSummaryTable = (
  summaries: Record<string, ResumeRagEvalSummary>,
  k: number,
): string => {
  const header = [
    'locale',
    '질문(답변 가능/불가)',
    '별칭 일치',
    '검색 반환',
    `recall@${k}`,
    `hit@${k}`,
    'MRR',
    '필수 언급',
    '답변 불가 검색 반환(검색 전용)',
  ];
  const rows = Object.entries(summaries).map(([locale, summary]) => [
    locale,
    `${summary.questions} (${summary.answerable}/${summary.unanswerable})`,
    percent(summary.gatePassRate),
    percent(summary.retrievedRate),
    decimal(summary.recallAtK),
    percent(summary.hitRateAtK),
    decimal(summary.mrr),
    percent(summary.mustMentionRate),
    percent(summary.falsePositiveRate),
  ]);
  return [header, header.map(() => '---'), ...rows]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');
};

// 순위 기반 검색은 답변 불가 질문에도 후보를 돌려준다. 답할지 여부는 답변 모델이 정하므로
// 표의 마지막 열을 최종 오탐률로 읽지 않게 결과와 함께 안내한다.
const RETRIEVAL_ONLY_NOTE =
  '답변 불가 검색 반환은 검색 전용 지표다. 검색은 질문을 거르지 않고 순위만 매기며, 답변 가능 여부(answerable)와 사용 근거(usedReferences)는 답변 모델이 판단한다. 최종 근거 없음 비율은 운영 resume_rag_chat_logs의 outcome으로 확인한다.';

const main = async (): Promise<void> => {
  const options = parseOptions(process.argv.slice(2));
  const corpus = parseResumeRagEvalCorpus(
    readJson('resume-rag-eval-corpus.json'),
  );
  const cases: ResumeRagEvalCase[] = expandResumeRagGoldenSet(
    readJson('resume-rag-golden-set.json'),
  );
  const issues = findResumeRagGoldenSetIssues(
    cases,
    listResumeRagEvalCorpusTexts(corpus),
  );
  if (issues.length) throw new Error(issues.join('\n'));

  const config = getResumeRagConfig({
    ...productionProfile,
    ...options.overrides,
    RAG_LOCAL_EMBEDDING_CACHE_DIR: options.cacheDirectory,
    // 평가는 모델을 내려받지 않는다. 캐시가 없으면 실패해야 같은 모델로 비교할 수 있다.
    RAG_LOCAL_EMBEDDING_LOCAL_FILES_ONLY: 'true',
  });
  // requireTestDatabaseUrl은 TEST_DATABASE_URL이 _test DB이고 일반 DB와 다른지 검사한다.
  const schemaName = `rag_eval_${randomUUID().replaceAll('-', '')}_test`;
  const db = new DataSource({
    type: 'postgres',
    url: requireTestDatabaseUrl(),
    synchronize: false,
    schema: schemaName,
    entities: [ResumeImportBatch, ResumeSourceItem, ResumeVectorChunk],
    migrations: [],
    extra: { options: `-c search_path=${schemaName},public` },
  });
  await db.initialize();
  try {
    await db.query(`CREATE SCHEMA "${schemaName}"`);
    const runner = db.createQueryRunner();
    try {
      await migrate(runner);
    } finally {
      await runner.release();
    }
    const bulletKeyById = await seedCorpus(db, corpus);
    const embeddingProvider = createEmbeddingProvider(config);
    const indexStartedAt = performance.now();
    const indexSummary = await new ResumeVectorIndexerService(
      db.getRepository(ResumeSourceItem),
      db.getRepository(ResumeVectorChunk),
      new ResumeSourceItemChunker(),
      embeddingProvider,
      config,
    ).indexAll();
    console.log(
      `색인 완료: ${JSON.stringify(indexSummary)} (${Math.round(performance.now() - indexStartedAt)}ms)`,
    );

    const keywordService = new ResumeRagKeywordService(db);
    const retriever = new ResumeRagRetrieverService(
      db,
      config,
      keywordService,
      embeddingProvider,
    );
    const observations: ResumeRagEvalObservation[] = [];
    const details = [];
    for (const item of cases) {
      const tokens = await keywordService.createSearchTokens(item.question);
      const chunks = await retriever.retrieve({
        channel: 'resume',
        question: item.question,
        locale: item.locale,
      });
      const observation: ResumeRagEvalObservation = {
        caseId: item.id,
        isGatePassed: tokens.length > 0,
        retrievedSources: chunks.map((chunk) =>
          toEvalKey(chunk.sourceKey, bulletKeyById),
        ),
        retrievedContents: chunks.map((chunk) => chunk.content),
      };
      observations.push(observation);
      details.push({
        id: item.id,
        locale: item.locale,
        origin: item.origin,
        question: item.question,
        answerable: item.answerable,
        expectedSources: item.expectedSources,
        isGatePassed: observation.isGatePassed,
        recallAtK: recallAtK(
          item.expectedSources,
          observation.retrievedSources,
          config.topK,
        ),
        reciprocalRank: reciprocalRankAtK(
          item.expectedSources,
          observation.retrievedSources,
          config.topK,
        ),
        retrieved: chunks.map((chunk, index) => ({
          source: observation.retrievedSources[index],
          similarity: chunk.similarity,
          title: chunk.title,
        })),
      });
    }

    const summaries = summarizeResumeRagEvalByLocale(
      cases,
      observations,
      config.topK,
    );
    const table = formatSummaryTable(summaries, config.topK);
    mkdirSync(resolve(options.outputPath, '..'), { recursive: true });
    writeFileSync(
      options.outputPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          profile: {
            retrievalMode: config.retrievalMode,
            embeddingProvider: config.embeddingProvider,
            embeddingModel: config.embeddingModel,
            vectorSelection: 'rank',
            minSimilarity: config.minSimilarity,
            topK: config.topK,
            chunkSize: config.chunkSize,
            chunkOverlap: config.chunkOverlap,
          },
          corpus: {
            projectDetails: corpus.projectDetails.length,
            bullets: bulletKeyById.size,
            index: indexSummary,
          },
          summaries,
          table,
          notes: [RETRIEVAL_ONLY_NOTE],
          cases: details,
        },
        null,
        2,
      )}\n`,
    );
    console.log(
      `\n${table}\n\n${RETRIEVAL_ONLY_NOTE}\n결과 JSON: ${options.outputPath}`,
    );
  } finally {
    await db.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await db.destroy();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
