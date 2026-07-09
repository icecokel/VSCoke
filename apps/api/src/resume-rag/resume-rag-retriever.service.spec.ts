import { DataSource } from 'typeorm';
import { ResumeRagRetrieverService } from './resume-rag-retriever.service';
import type { ResumeRagConfig } from './resume-rag.config';
import type { ResumeRagKeywordService } from './resume-rag-keyword.service';
import { createResumeRagSearchTokens } from './resume-rag-keyword-gate';

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
  keywordService: ResumeRagKeywordService = {
    createSearchTokens: jest.fn((question: string) =>
      Promise.resolve(createResumeRagSearchTokens(question)),
    ),
  } as unknown as ResumeRagKeywordService,
): ResumeRagRetrieverService =>
  new ResumeRagRetrieverService(dataSource, config, keywordService);

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

  it('expands compact resume keywords before scoring source items', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'item-1',
        title: '프론트엔드 CI/CD 및 배포 환경 정리',
        bodyText: 'GitHub Actions 기반 배포와 검증 흐름을 정리했습니다.',
        sourcePath: 'resume/oprimed.md',
        sourceKey: 'oprimed#delivery',
        metadata: { sectionPath: 'Oprimed' },
      },
    ]);
    const dataSource = { query } as unknown as DataSource;
    const service = createService(
      dataSource,
      createConfig({ topK: 1, minSimilarity: 0.1 }),
    );

    const result = await service.retrieve({
      question: 'cicd경험',
      locale: 'ko-KR',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'item-1',
        title: '프론트엔드 CI/CD 및 배포 환경 정리',
      }),
    );
  });

  it('uses database-backed keyword expansions when scoring source items', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'item-1',
        title: '배포 검증 흐름',
        bodyText:
          'GitHub Actions와 pre-push 검증으로 배포 신뢰도를 높였습니다.',
        sourcePath: 'resume/delivery.md',
        sourceKey: 'delivery#verification',
        metadata: {},
      },
    ]);
    const dataSource = { query } as unknown as DataSource;
    const createSearchTokens = jest
      .fn()
      .mockResolvedValue(['운영키워드', '배포', '검증']);
    const keywordService = {
      createSearchTokens,
    } as unknown as ResumeRagKeywordService;
    const service = createService(
      dataSource,
      createConfig({ topK: 1, minSimilarity: 0.1 }),
      keywordService,
    );

    const result = await service.retrieve({
      question: '운영키워드',
      locale: 'ko-KR',
    });

    expect(result).toContainEqual(expect.objectContaining({ id: 'item-1' }));
    expect(createSearchTokens).toHaveBeenCalledWith('운영키워드');
  });

  it('expands source-backed domain keywords for compact Korean questions', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'webview',
        title: '모바일 웹뷰 Playground 기획·구축',
        bodyText:
          '앱 배포 없이 이벤트와 게임형 콘텐츠를 운영하는 웹뷰 영역을 개발했습니다.',
        sourcePath: 'resume/code-crayon.md',
        sourceKey: 'code-crayon#webview',
        metadata: {},
      },
      {
        id: 'translation',
        title: '자막 번역 관리 도구로 콘텐츠 운영 자동화',
        bodyText:
          'CLI로 처리하던 자막 번역을 웹 관리 도구로 옮기고 번역 검수와 프롬프트를 관리했습니다.',
        sourcePath: 'resume/code-crayon.md',
        sourceKey: 'code-crayon#translation',
        metadata: {},
      },
      {
        id: 'performance',
        title: '렌더링 성능과 브라우저 호환성 개선',
        bodyText:
          'Lighthouse 기준 LCP와 Speed Index를 낮추고 Chrome, Safari 대응을 확인했습니다.',
        sourcePath: 'resume/performance.md',
        sourceKey: 'performance#browser',
        metadata: {},
      },
      {
        id: 'backoffice',
        title: '커머스·백오피스 개발',
        bodyText:
          '주문, 상품, 셀러, 정산, 이벤트, 문의 관리 화면과 공통 테이블·폼 컴포넌트를 개발했습니다.',
        sourcePath: 'resume/code-crayon.md',
        sourceKey: 'code-crayon#backoffice',
        metadata: {},
      },
      {
        id: 'operations',
        title: '운영 중인 서비스의 유지보수, API 개발, 장애 대응',
        bodyText:
          '사용자 영향, 재현 가능성, 수정 범위를 기준으로 이슈를 분리하고 운영팀과 공유했습니다.',
        sourcePath: 'resume/datalogics.md',
        sourceKey: 'datalogics#operations',
        metadata: {},
      },
    ]);
    const dataSource = { query } as unknown as DataSource;
    const service = createService(
      dataSource,
      createConfig({ topK: 5, minSimilarity: 0.1 }),
    );

    await expect(
      service.retrieve({ question: '웹뷰경험', locale: 'ko-KR' }),
    ).resolves.toContainEqual(expect.objectContaining({ id: 'webview' }));
    await expect(
      service.retrieve({ question: '번역자동화', locale: 'ko-KR' }),
    ).resolves.toContainEqual(expect.objectContaining({ id: 'translation' }));
    await expect(
      service.retrieve({ question: '성능최적화', locale: 'ko-KR' }),
    ).resolves.toContainEqual(expect.objectContaining({ id: 'performance' }));
    await expect(
      service.retrieve({ question: '백오피스운영', locale: 'ko-KR' }),
    ).resolves.toContainEqual(expect.objectContaining({ id: 'backoffice' }));
    await expect(
      service.retrieve({ question: '장애대응', locale: 'ko-KR' }),
    ).resolves.toContainEqual(expect.objectContaining({ id: 'operations' }));
  });

  it('expands common resume wording that is grounded in the resume corpus', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'product-design',
        title: '제품 문제 해결과 화면 흐름 설계',
        bodyText:
          '제품 요구사항을 입력, 실행, 결과 확인 단계로 나누고 프론트엔드 구조를 설계했습니다.',
        sourcePath: 'resume/product.md',
        sourceKey: 'product#design',
        metadata: {},
      },
      {
        id: 'usability',
        title: '운영자 사용성과 유지보수성 개선',
        bodyText:
          '관리자 화면의 반복 작업을 줄이고 공통 컴포넌트와 디자인 시스템 기준을 적용했습니다.',
        sourcePath: 'resume/usability.md',
        sourceKey: 'usability#admin',
        metadata: {},
      },
      {
        id: 'type-modeling',
        title: 'API 연동과 타입 모델링',
        bodyText:
          '로딩, 에러, 유효성 검사와 타입 미지정 데이터를 타입 모델링해 유지보수 부담을 줄였습니다.',
        sourcePath: 'resume/types.md',
        sourceKey: 'types#modeling',
        metadata: {},
      },
      {
        id: 'web-vitals',
        title: 'Web Vitals 기반 성능 튜닝',
        bodyText:
          'Web Vitals, TTFB, Cache-Control, SWR 캐시 기준으로 응답 속도와 렌더링 성능을 확인했습니다.',
        sourcePath: 'resume/performance.md',
        sourceKey: 'performance#web-vitals',
        metadata: {},
      },
    ]);
    const dataSource = { query } as unknown as DataSource;
    const service = createService(
      dataSource,
      createConfig({ topK: 4, minSimilarity: 0.1 }),
    );

    await expect(
      service.retrieve({ question: '제품설계', locale: 'ko-KR' }),
    ).resolves.toContainEqual(
      expect.objectContaining({ id: 'product-design' }),
    );
    await expect(
      service.retrieve({ question: '사용성개선', locale: 'ko-KR' }),
    ).resolves.toContainEqual(expect.objectContaining({ id: 'usability' }));
    await expect(
      service.retrieve({ question: '타입모델링', locale: 'ko-KR' }),
    ).resolves.toContainEqual(expect.objectContaining({ id: 'type-modeling' }));
    await expect(
      service.retrieve({ question: 'webvitals', locale: 'ko-KR' }),
    ).resolves.toContainEqual(expect.objectContaining({ id: 'web-vitals' }));
  });
});
