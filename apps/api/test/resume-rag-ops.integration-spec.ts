import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';
import { createTestDataSourceOptions } from '../src/test-data-source';
import { CreateResumeRagTables1760000000000 } from '../src/migrations/1760000000000-create-resume-rag-tables';
import { CreateResumeRagKeywords1793836800000 } from '../src/migrations/1793836800000-create-resume-rag-keywords';
import { CreateResumeRagChatLogs1794873600000 } from '../src/migrations/1794873600000-create-resume-rag-chat-logs';
import { CreateResumeChatConversations1795000000000 } from '../src/migrations/1795000000000-create-resume-chat-conversations';
import { CreateSharedCareerData1795000000004 } from '../src/migrations/1795000000004-create-shared-career-data';
import { AddResumeSoftDelete1795000000005 } from '../src/migrations/1795000000005-add-resume-soft-delete';
import { AddCareerCuration1795000000006 } from '../src/migrations/1795000000006-add-career-curation';
import { AddResumeRagChatOutcomes1795000000007 } from '../src/migrations/1795000000007-add-resume-rag-chat-outcomes';
import { CareerDataService } from '../src/career-data/career-data.service';
import { CareerDataUpsertDto } from '../src/career-data/career-data.dto';
import { ResumeRagChatLog } from '../src/resume-rag/entities/resume-rag-chat-log.entity';
import { getResumeChunkConfigHash } from '../src/resume-rag/indexing/resume-index-profile';
import { RESUME_CHUNKER_VERSION } from '../src/resume-rag/indexing/resume-source-item-chunker';
import { ResumeRagChatLogService } from '../src/resume-rag/resume-rag-chat-log.service';
import { getResumeRagConfig } from '../src/resume-rag/resume-rag.config';
import {
  findResumeRagReadinessProblems,
  inspectResumeRagReadiness,
} from '../src/resume-rag/resume-rag-readiness';
import { ResumeRagRetrieverService } from '../src/resume-rag/resume-rag-retriever.service';
import type { ResumeRagKeywordService } from '../src/resume-rag/resume-rag-keyword.service';
import { createLegacyResumeTables } from './support/synthetic-resume-migration';

const schemaName = `rag_ops_${randomUUID().replaceAll('-', '')}_test`;
const config = getResumeRagConfig({
  RAG_RETRIEVAL_MODE: 'hybrid',
  RAG_EMBEDDING_PROVIDER: 'synthetic-embedding',
  RAG_EMBEDDING_MODEL: 'synthetic-model@rev',
  RAG_EMBEDDING_DIMENSIONS: '2',
  RAG_VECTOR_MIN_SIMILARITY: '0',
  RAG_MIN_SIMILARITY: '0',
  RAG_TOP_K: '50',
});

describe('이력 RAG 운영 가드 PostgreSQL 검증', () => {
  let db: DataSource;
  const migration = new AddResumeRagChatOutcomes1795000000007();
  const run = async (
    step: (
      runner: ReturnType<DataSource['createQueryRunner']>,
    ) => Promise<void>,
  ) => {
    const runner = db.createQueryRunner();
    try {
      await step(runner);
    } finally {
      await runner.release();
    }
  };
  const readiness = () =>
    inspectResumeRagReadiness(
      (sql, parameters) => db.query(sql, parameters),
      config,
    );
  const insertSource = async (values: {
    sourceType: string;
    itemType: string;
    sourceKey: string;
    status?: string;
    visibility?: string;
  }): Promise<string> => {
    const rows = await db.query<{ id: string }[]>(
      `INSERT INTO resume_source_items ("sourceType","itemType","sourcePath","sourceKey","title","bodyText","status","visibility","vectorize","contentHash")
       VALUES ($1,$2,'synthetic.md',$3,'Synthetic','synthetic public body',$4,$5,TRUE,$6) RETURNING id`,
      [
        values.sourceType,
        values.itemType,
        values.sourceKey,
        values.status ?? 'active',
        values.visibility ?? 'public',
        randomUUID(),
      ],
    );
    return rows[0].id;
  };
  const insertChunk = async (
    sourceItemId: string,
    profile: { chunkConfigHash?: string; model?: string } = {},
  ): Promise<void> => {
    await db.query(
      `INSERT INTO resume_vector_chunks ("sourceItemId","chunkIndex","content","contentHash","sourceType","itemType","title","sourcePath","sourceKey","visibility","status","embeddingProvider","embeddingModel","embeddingDimensions","embedding","chunkerVersion","chunkConfigHash","indexedAt")
       SELECT id, 0, "bodyText", "contentHash", "sourceType", "itemType", title, "sourcePath", "sourceKey", 'public', 'active',
         $2, $3, 2, '[1,0]'::vector, $4, $5, now()
       FROM resume_source_items WHERE id = $1`,
      [
        sourceItemId,
        config.embeddingProvider,
        profile.model ?? config.embeddingModel,
        RESUME_CHUNKER_VERSION,
        profile.chunkConfigHash ?? getResumeChunkConfigHash(config),
      ],
    );
  };

  beforeAll(async () => {
    db = new DataSource({
      ...createTestDataSourceOptions(),
      type: 'postgres',
      schema: schemaName,
      entities: [ResumeRagChatLog],
      migrations: [],
      extra: { options: `-c search_path=${schemaName},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schemaName}"`);
    await run(async (runner) => {
      await new CreateResumeRagTables1760000000000().up(runner);
      await new CreateResumeChatConversations1795000000000().up(runner);
      await createLegacyResumeTables(runner);
      await new CreateSharedCareerData1795000000004().up(runner);
      await new CreateResumeRagKeywords1793836800000().up(runner);
      await new CreateResumeRagChatLogs1794873600000().up(runner);
      await new AddResumeSoftDelete1795000000005().up(runner);
      await new AddCareerCuration1795000000006().up(runner);
    });
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await db.destroy();
    }
  });

  describe('채팅 결과 기록 migration', () => {
    let legacyRow: Record<string, unknown>;

    beforeAll(async () => {
      // 결과 컬럼이 생기기 전의 운영 질문 행을 재현한다.
      await db.query(
        `INSERT INTO resume_rag_chat_logs ("questionText","questionHash","locale") VALUES ('기존 질문', $1, 'ko-KR')`,
        ['a'.repeat(64)],
      );
      [legacyRow] = await db.query<Record<string, unknown>[]>(
        'SELECT * FROM resume_rag_chat_logs',
      );
      await run((runner) => migration.up(runner));
    });

    it('기존 질문 행은 값을 유지하고 resume 채널·결과 미상으로 남는다', async () => {
      const [row] = await db.query<Record<string, unknown>[]>(
        'SELECT * FROM resume_rag_chat_logs WHERE id = $1',
        [legacyRow.id],
      );
      expect(row).toEqual({
        ...legacyRow,
        channel: 'resume',
        outcome: null,
        sourceCount: null,
        durationMs: null,
        failureStage: null,
      });
    });

    it('서비스는 마스킹 질문 행과 원문 없는 결과 행을 저장한다', async () => {
      const service = new ResumeRagChatLogService(
        db.getRepository(ResumeRagChatLog),
      );
      await service.recordOutcome({
        question: 'kim@example.com 경력 알려줘',
        locale: 'ko-KR',
        channel: 'resume',
        outcome: 'answered',
        sourceCount: 3,
        durationMs: 812.4,
      });
      await service.recordOutcome({
        locale: 'en-US',
        channel: 'main',
        outcome: 'failed',
        sourceCount: 0,
        durationMs: 15,
        failureStage: 'retrieval',
      });

      const rows = await db.query<Record<string, unknown>[]>(
        `SELECT "questionText", "questionHash" IS NOT NULL AS "hasHash", locale, channel, outcome, "sourceCount", "durationMs", "failureStage"
         FROM resume_rag_chat_logs WHERE outcome IS NOT NULL ORDER BY "createdAt", locale DESC`,
      );
      expect(rows).toEqual([
        {
          questionText: '[email] 경력 알려줘',
          hasHash: true,
          locale: 'ko-KR',
          channel: 'resume',
          outcome: 'answered',
          sourceCount: 3,
          durationMs: 812,
          failureStage: null,
        },
        {
          questionText: null,
          hasHash: false,
          locale: 'en-US',
          channel: 'main',
          outcome: 'failed',
          sourceCount: 0,
          durationMs: 15,
          failureStage: 'retrieval',
        },
      ]);
    });

    it.each([
      [`'질문', NULL, 'resume', 'answered', 1, 1, NULL`],
      [`NULL, NULL, 'other', 'answered', 1, 1, NULL`],
      [`NULL, NULL, 'resume', 'unknown', 1, 1, NULL`],
      [`NULL, NULL, 'resume', NULL, NULL, NULL, NULL`],
      [`NULL, NULL, 'resume', 'answered', -1, 1, NULL`],
      [`NULL, NULL, 'resume', 'answered', 1, 1, 'answer'`],
      [`NULL, NULL, 'resume', 'failed', 0, 1, NULL`],
    ])('CHECK 제약은 (%s) 행을 거부한다', async (values) => {
      await expect(
        db.query(
          `INSERT INTO resume_rag_chat_logs ("questionText","questionHash",channel,outcome,"sourceCount","durationMs","failureStage",locale)
           VALUES (${values}, 'ko-KR')`,
        ),
      ).rejects.toThrow(/check constraint/);
    });

    it('결과만 기록한 행이 있으면 down을 거부하고, 없으면 원래 제약으로 되돌린다', async () => {
      await expect(run((runner) => migration.down(runner))).rejects.toThrow(
        'outcome-only rows',
      );
      await db.query(
        `DELETE FROM resume_rag_chat_logs WHERE "questionText" IS NULL`,
      );
      await run((runner) => migration.down(runner));
      await expect(
        db.query(
          `INSERT INTO resume_rag_chat_logs ("questionText","questionHash","locale") VALUES (NULL, NULL, 'ko-KR')`,
        ),
      ).rejects.toThrow(/null value/);
      await run((runner) => migration.up(runner));
    });
  });

  describe('배포 검색 준비 상태 검증', () => {
    // 검증 SQL이 검색기의 후보 조건과 어긋나지 않는지 같은 DB에서 대조한다.
    const retrievedSourceKeys = async (
      channel: 'main' | 'resume',
      retrievalMode: 'keyword' | 'vector',
    ) => {
      const retriever = new ResumeRagRetrieverService(
        db,
        { ...config, retrievalMode },
        {
          createSearchTokens: () => Promise.resolve(['synthetic']),
        } as unknown as ResumeRagKeywordService,
        {
          embed: () =>
            Promise.resolve({
              provider: config.embeddingProvider as string,
              model: config.embeddingModel as string,
              dimensions: 2,
              vector: [1, 0],
            }),
        },
      );
      const chunks = await retriever.retrieve({
        channel,
        question: 'synthetic',
        locale: '',
      });
      return new Set(chunks.map((chunk) => chunk.sourceKey)).size;
    };

    it('resume 채널 원문이 없으면 0건으로 보고하고 배포를 거부한다', async () => {
      const appItem = await insertSource({
        sourceType: 'app_resume',
        itemType: 'public_resume_detail',
        sourceKey: 'app:resume-detail:synthetic',
      });
      await insertSource({
        sourceType: 'app_resume',
        itemType: 'public_site_guide',
        sourceKey: 'app:site-guide:private',
        visibility: 'private',
      });
      await insertChunk(appItem);

      const report = await readiness();
      expect(
        report.map(({ channel, sourceItems, vectors }) => [
          channel,
          sourceItems,
          vectors?.chunks,
        ]),
      ).toEqual([
        ['main', 1, 1],
        ['resume', 0, 0],
      ]);
      const problems = findResumeRagReadinessProblems(report);
      expect(problems).toHaveLength(2);
      expect(problems.join('\n')).toMatch(
        /^resume 채널의 검색 가능한 공개 원문이 0건/,
      );
    });

    it('공개 경력 원문과 현재 프로필 벡터를 검색기와 같은 기준으로 센다', async () => {
      const writer = new CareerDataService(db);
      const experienceId = randomUUID();
      const factId = randomUUID();
      const bulletId = randomUUID();
      await writer.upsertData(
        plainToInstance(CareerDataUpsertDto, {
          experiences: [
            {
              id: experienceId,
              expectedRevision: 0,
              company: 'Synthetic Co',
              title: 'Internal project',
              publicTitle: 'Public project',
            },
          ],
          facts: [
            {
              id: factId,
              experienceId,
              expectedRevision: 0,
              kind: 'action',
              content: 'Synthetic fact',
              verificationStatus: 'confirmed',
              visibility: 'public',
              evidence: [
                { kind: 'code', locator: 'private/a.ts', as_of: '2026-11-01' },
              ],
            },
          ],
          keywords: [],
          bullets: [
            {
              id: bulletId,
              experienceId,
              expectedRevision: 0,
              text: 'Synthetic bullet',
              focus: 'focus',
              status: 'ready',
              visibility: 'public',
              facts: [{ factId, factRevision: 1 }],
              keywordIds: [],
              sourceRefs: [{ path: 'private/a.ts' }],
            },
          ],
        }),
      );

      let report = await readiness();
      const resume = report.find(({ channel }) => channel === 'resume');
      expect(resume?.sourceItems).toBeGreaterThan(0);
      expect(resume?.sourceItems).toBe(
        await retrievedSourceKeys('resume', 'keyword'),
      );
      // 청크 설정이나 모델이 다른 벡터는 검색되지 않으므로 세지 않는다.
      const [careerItem] = await db.query<{ id: string }[]>(
        `SELECT id FROM resume_source_items WHERE "sourceType" = 'career_data' AND "itemType" = 'career_bullet'`,
      );
      await insertChunk(careerItem.id, { chunkConfigHash: 'stale-hash' });
      await insertChunk(careerItem.id, { model: 'old-model' });
      report = await readiness();
      expect(
        report.find(({ channel }) => channel === 'resume')?.vectors,
      ).toMatchObject({ chunks: 0, indexedSourceItems: 0 });

      await insertChunk(careerItem.id);
      report = await readiness();
      expect(findResumeRagReadinessProblems(report)).toEqual([]);
      for (const channel of ['main', 'resume'] as const) {
        const entry = report.find((item) => item.channel === channel);
        expect(entry?.sourceItems).toBe(
          await retrievedSourceKeys(channel, 'keyword'),
        );
        expect(entry?.vectors?.indexedSourceItems).toBe(
          await retrievedSourceKeys(channel, 'vector'),
        );
      }
    });
  });
});
