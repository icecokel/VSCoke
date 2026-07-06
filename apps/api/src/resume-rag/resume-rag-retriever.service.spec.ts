import { DataSource } from 'typeorm';
import { ResumeRagRetrieverService } from './resume-rag-retriever.service';
import type { ResumeRagConfig } from './resume-rag.config';

const createConfig = (
  overrides: Partial<ResumeRagConfig> = {},
): ResumeRagConfig => ({
  topK: 5,
  minSimilarity: 0.1,
  chunkSize: 1200,
  chunkOverlap: 120,
  codexTimeoutMs: 120_000,
  allowedVisibilities: ['public'],
  ...overrides,
});

const createService = (
  dataSource: DataSource,
  config: ResumeRagConfig,
): ResumeRagRetrieverService =>
  new ResumeRagRetrieverService(dataSource, config);

describe('ResumeRagRetrieverService', () => {
  it('queries source items directly without embedding configuration', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'item-1',
        title: '대표 프로젝트',
        bodyText: 'VSCoke 대표 프로젝트와 NestJS API 개선 경험',
        sourcePath: 'resume/projects.md',
        sourceKey: 'projects#vscoke',
        metadata: { sectionPath: 'Projects', version: 'current' },
      },
    ]);
    const dataSource = { query } as unknown as DataSource;
    const service = createService(
      dataSource,
      createConfig({
        allowedVisibilities: ['public', 'limited'],
      }),
    );

    const result = await service.retrieve({
      question: '대표 프로젝트가 뭐야?',
      locale: 'ko-KR',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'item-1',
      title: '대표 프로젝트',
      content: 'VSCoke 대표 프로젝트와 NestJS API 개선 경험',
      sourcePath: 'resume/projects.md',
      sourceKey: 'projects#vscoke',
      citationMetadata: { sectionPath: 'Projects', version: 'current' },
    });
    expect(typeof result[0].similarity).toBe('number');

    const calls = query.mock.calls as Array<[string, unknown[]]>;
    expect(calls).toHaveLength(1);
    const [sql, params] = calls[0];
    expect(sql).toContain('FROM resume_source_items');
    expect(sql).not.toContain('resume_vector_chunks');
    expect(sql).toContain(`"status" = 'active'`);
    expect(sql).toContain('"vectorize" = TRUE');
    expect(sql).toContain('"visibility" = ANY($1)');
    expect(sql).toContain('"locale" IS NULL OR "locale" = $2');
    expect(params).toEqual([['public', 'limited'], 'ko-KR']);
  });

  it('matches Korean query terms after stripping common particles', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'item-1',
        title: '운영 경험',
        bodyText: '배포 자동화와 운영 안정성 개선',
        sourcePath: 'resume/operations.md',
        sourceKey: 'operations',
        metadata: {},
      },
      {
        id: 'item-2',
        title: '대표 프로젝트',
        bodyText: '대표 프로젝트는 VSCoke 이력서 RAG와 게임 기능입니다.',
        sourcePath: 'resume/projects.md',
        sourceKey: 'projects',
        metadata: { sectionPath: 'Projects' },
      },
    ]);
    const dataSource = { query } as unknown as DataSource;
    const service = createService(
      dataSource,
      createConfig({ topK: 1, minSimilarity: 0.1 }),
    );

    const result = await service.retrieve({
      question: '대표 프로젝트가 뭐야?',
      locale: 'ko-KR',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'item-2',
        content: '대표 프로젝트는 VSCoke 이력서 RAG와 게임 기능입니다.',
      }),
    );
    expect(result[0].similarity).toBeGreaterThan(0);
    expect(result[0].similarity).toBeLessThanOrEqual(1);
  });
});
