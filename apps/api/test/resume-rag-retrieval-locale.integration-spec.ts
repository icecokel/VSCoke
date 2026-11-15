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
import { CareerDataService } from '../src/career-data/career-data.service';
import { CareerDataUpsertDto } from '../src/career-data/career-data.dto';
import { getResumeRagConfig } from '../src/resume-rag/resume-rag.config';
import { ResumeRagRetrieverService } from '../src/resume-rag/resume-rag-retriever.service';
import type { ResumeRagKeywordService } from '../src/resume-rag/resume-rag-keyword.service';
import { getResumeChunkConfigHash } from '../src/resume-rag/indexing/resume-index-profile';
import { RESUME_CHUNKER_VERSION } from '../src/resume-rag/indexing/resume-source-item-chunker';
import { createLegacyResumeTables } from './support/synthetic-resume-migration';

const schemaName = `rag_locale_${randomUUID().replaceAll('-', '')}_test`;
const embeddingProfile = {
  provider: 'openai-compatible',
  model: 'test-embedding',
  dimensions: 2,
};

// 불렛 원문은 ko-KR로만 발행된다. 영어·일본어 요청도 같은 원문을 검색해야 한다.
describe('이력 채팅 검색의 언어 범위 (PostgreSQL)', () => {
  let db: DataSource;
  const createRetriever = (mode: 'keyword' | 'vector') => {
    const config = getResumeRagConfig({
      RAG_RETRIEVAL_MODE: mode,
      RAG_EMBEDDING_PROVIDER: embeddingProfile.provider,
      RAG_EMBEDDING_MODEL: embeddingProfile.model,
      RAG_EMBEDDING_DIMENSIONS: String(embeddingProfile.dimensions),
      RAG_VECTOR_MIN_SIMILARITY: '0.5',
      RAG_ALLOWED_SOURCE_TYPES: 'app_resume,career_data',
    });
    const keywordService = {
      createSearchTokens: jest.fn().mockResolvedValue(['oprimed']),
    } as unknown as ResumeRagKeywordService;
    const embeddingProvider = {
      embed: jest
        .fn()
        .mockResolvedValue({ ...embeddingProfile, vector: [1, 0] }),
    };
    return {
      config,
      retriever: new ResumeRagRetrieverService(
        db,
        config,
        keywordService,
        embeddingProvider,
      ),
    };
  };

  beforeAll(async () => {
    db = new DataSource({
      ...createTestDataSourceOptions(),
      type: 'postgres',
      schema: schemaName,
      entities: [],
      migrations: [],
      extra: { options: `-c search_path=${schemaName},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schemaName}"`);
    const runner = db.createQueryRunner();
    try {
      await new CreateResumeRagTables1760000000000().up(runner);
      await new CreateResumeChatConversations1795000000000().up(runner);
      await createLegacyResumeTables(runner);
      await new CreateSharedCareerData1795000000004().up(runner);
      await new CreateResumeRagKeywords1793836800000().up(runner);
      await new CreateResumeRagChatLogs1794873600000().up(runner);
      await new AddResumeSoftDelete1795000000005().up(runner);
      await new AddCareerCuration1795000000006().up(runner);
    } finally {
      await runner.release();
    }

    const experienceId = randomUUID();
    const factId = randomUUID();
    await new CareerDataService(db).upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [
          {
            id: experienceId,
            expectedRevision: 0,
            company: 'Oprimed',
            title: '내부 제목',
            publicTitle: '의료 분석 제품',
          },
        ],
        facts: [
          {
            id: factId,
            experienceId,
            expectedRevision: 0,
            kind: 'action',
            content: '분석 재실행 시 실행 식별자로 결과를 구분했다',
            verificationStatus: 'confirmed',
            visibility: 'public',
            evidence: [
              { kind: 'code', locator: 'private/run.ts', as_of: '2026-11-01' },
            ],
          },
        ],
        keywords: [],
        bullets: [
          {
            id: randomUUID(),
            experienceId,
            expectedRevision: 0,
            text: 'Oprimed 분석 재실행 결과가 섞이지 않게 실행 식별자로 구분했습니다.',
            status: 'ready',
            visibility: 'public',
            facts: [{ factId, factRevision: 1 }],
            keywordIds: [],
          },
        ],
      }),
    );

    // 언어별 사본이 있는 app_resume 자료는 계속 요청 언어로 거른다.
    await db.query(
      `INSERT INTO resume_source_items
        ("sourceType","itemType","sourcePath","sourceKey","title","bodyText","locale","status","visibility","vectorize","contentHash","metadata")
       VALUES ('app_resume','public_site_guide','guide/ko.md','app:guide:ko','사이트 안내','Oprimed 사이트 안내 한국어','ko-KR','active','public',TRUE,$1,'{}')`,
      [randomUUID()],
    );

    // 벡터 경로 검증용으로 각 원문에 같은 프로필의 청크를 하나씩 둔다.
    const { config } = createRetriever('vector');
    const sources = await db.query<
      Array<{
        id: string;
        sourceType: string;
        itemType: string;
        title: string;
        locale: string | null;
        sourcePath: string;
        sourceKey: string;
        bodyText: string;
      }>
    >(
      `SELECT id,"sourceType","itemType",title,locale,"sourcePath","sourceKey","bodyText" FROM resume_source_items WHERE "status" = 'active'`,
    );
    for (const source of sources) {
      await db.query(
        `INSERT INTO resume_vector_chunks
          ("sourceItemId","chunkIndex","content","contentHash","sourceType","itemType","title","locale","sourcePath","sourceKey","visibility","status","embeddingProvider","embeddingModel","embeddingDimensions","embedding","chunkerVersion","chunkConfigHash","indexedAt")
         VALUES ($1,0,$2,$3,$4,$5,$6,$7,$8,$9,'public','active',$10,$11,$12,'[1,0]',$13,$14,now())`,
        [
          source.id,
          source.bodyText,
          randomUUID(),
          source.sourceType,
          source.itemType,
          source.title,
          source.locale,
          source.sourcePath,
          source.sourceKey,
          embeddingProfile.provider,
          embeddingProfile.model,
          embeddingProfile.dimensions,
          RESUME_CHUNKER_VERSION,
          getResumeChunkConfigHash(config),
        ],
      );
    }
  });

  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await db.destroy();
    }
  });

  it.each(['keyword', 'vector'] as const)(
    '%s 검색은 요청 언어와 무관하게 ko-KR 경력 불렛을 찾는다',
    async (mode) => {
      const { retriever } = createRetriever(mode);
      for (const locale of ['ko-KR', 'en-US', 'ja-JP']) {
        const chunks = await retriever.retrieve({
          channel: 'resume',
          question: 'Oprimed analysis rerun',
          locale,
          resumeKey: 'pe',
        });
        expect(chunks.map((chunk) => chunk.sourceKey)).toEqual([
          expect.stringMatching(/^career-bullet\/.+\/ko-KR$/),
        ]);
      }
    },
  );

  it.each(['keyword', 'vector'] as const)(
    '%s 검색은 언어별 사본이 있는 app_resume 자료를 요청 언어로 거른다',
    async (mode) => {
      const { retriever } = createRetriever(mode);
      const search = async (locale: string) =>
        (
          await retriever.retrieve({
            channel: 'main',
            question: 'Oprimed',
            locale,
          })
        ).map((chunk) => chunk.sourceKey);

      expect(await search('ko-KR')).toContain('app:guide:ko');
      expect(await search('en-US')).not.toContain('app:guide:ko');
    },
  );
});
