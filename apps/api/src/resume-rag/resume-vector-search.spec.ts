import { chatDefinitions } from './chat-definition';
import type { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { getResumeRagConfig } from './resume-rag.config';
import {
  ResumeRagRetrieverService,
  mergeResumeSearchResults,
  type RetrievedResumeChunk,
} from './resume-rag-retriever.service';
import type { ResumeRagKeywordService } from './resume-rag-keyword.service';
import { getResumeChunkConfigHash } from './indexing/resume-index-profile';

const chunk = (
  sourceKey: string,
  content = '관련 근거',
): RetrievedResumeChunk => ({
  id: sourceKey,
  sourceKey,
  title: 'Oprimed',
  content,
  sourcePath: 'public.md',
  citationMetadata: {},
  similarity: 0.8,
});
const profile = {
  provider: 'openai-compatible',
  model: 'test-embedding',
  dimensions: 2,
  vector: [1, 0],
};
const createHarness = (mode = 'vector') => {
  const config = getResumeRagConfig({
    RAG_RETRIEVAL_MODE: mode,
    RAG_EMBEDDING_PROVIDER: profile.provider,
    RAG_EMBEDDING_MODEL: profile.model,
    RAG_EMBEDDING_DIMENSIONS: '2',
  });
  const query = jest.fn().mockResolvedValue([chunk('source-a')]);
  const embed = jest.fn().mockResolvedValue(profile);
  const createSearchTokens = jest.fn().mockResolvedValue(['oprimed']);
  return {
    config,
    query,
    embed,
    service: new ResumeRagRetrieverService(
      { query } as unknown as DataSource,
      config,
      { createSearchTokens } as unknown as ResumeRagKeywordService,
      { embed },
    ),
  };
};

describe('Resume vector retrieval', () => {
  it.each(['main', 'resume'] as const)(
    '%s 벡터 검색은 채널별 공개 원본·동일 프로필 청크만 조회한다',
    async (channel) => {
      const { service, query, embed, config } = createHarness();
      const result = await service.retrieve({
        channel,
        question: 'Oprimed 경험',
        locale: 'ko-KR',
      });
      expect(result).toEqual([chunk('source-a')]);
      expect(embed).toHaveBeenCalledWith('Oprimed 경험');
      const [sql, params] = query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('AS MATERIALIZED');
      expect(sql).toContain('INNER JOIN current_items');
      expect(sql).toContain('AND source."itemType" = ANY($11)');
      expect(sql).toContain("source.visibility = 'public'");
      expect(sql).toContain("source.status = 'active'");
      expect(sql).toContain('source.vectorize = TRUE');
      expect(sql).toContain('"sourceType" = ANY($2)');
      expect(sql).toContain('vector_dims(chunk.embedding) = $6');
      expect(sql).toContain('embedding <=> $9::vector');
      // 절대 점수 기준 없이 코사인 순위 상위 후보(topK * 3)만 고른다.
      expect(sql).not.toMatch(/WHERE 1 - \(embedding <=>/);
      expect(sql).toContain('LIMIT $10');
      expect(params).toEqual([
        ['public'],
        channel === 'resume' ? ['career_data'] : ['app_resume', 'career_data'],
        'ko-KR',
        profile.provider,
        profile.model,
        2,
        'resume-source-item-chunker-v1',
        getResumeChunkConfigHash(config),
        '[1,0]',
        config.topK * 3,
        chatDefinitions[channel].itemTypes,
      ]);
    },
  );

  it.each(['vector', 'hybrid'])(
    '별칭이 일치하지 않는 질문도 %s 모드는 벡터 순위로 검색한다',
    async (mode) => {
      const { service, embed, query } = createHarness(mode);
      const keywordService = Reflect.get(service, 'keywordService') as {
        createSearchTokens: jest.Mock;
      };
      keywordService.createSearchTokens.mockResolvedValue([]);
      query.mockImplementation((sql: string) =>
        Promise.resolve(
          sql.includes('resume_vector_chunks') ? [chunk('source-a')] : [],
        ),
      );
      expect(
        await service.retrieve({
          channel: 'resume',
          question: 'What did you work on at Oprimed?',
          locale: 'en-US',
        }),
      ).toEqual([chunk('source-a')]);
      expect(embed).toHaveBeenCalledWith('What did you work on at Oprimed?');
    },
  );

  it('키워드 검색은 별칭이 없어도 질문의 직접 토큰으로 점수를 매기고 영어 기능어는 무시한다', async () => {
    const { service, query } = createHarness('keyword');
    const keywordService = Reflect.get(service, 'keywordService') as {
      createSearchTokens: jest.Mock;
    };
    keywordService.createSearchTokens.mockResolvedValue([]);
    query.mockResolvedValue([
      {
        id: 'layout',
        title: 'Layout',
        bodyText: 'Your layout of the page',
        sourceKey: 'layout',
        sourcePath: 'layout.md',
        metadata: {},
      },
      {
        id: 'graphql',
        title: 'API',
        bodyText: 'GraphQL schema migration',
        sourceKey: 'graphql',
        sourcePath: 'graphql.md',
        metadata: {},
      },
    ]);
    const result = await service.retrieve({
      channel: 'resume',
      question: 'What did you do with GraphQL?',
      locale: 'en-US',
    });
    expect(result.map((item) => item.id)).toEqual(['graphql']);
  });

  it('영문 토큰은 단어 앞부분부터 일치해야 점수를 얻는다', async () => {
    const { service, query } = createHarness('keyword');
    const keywordService = Reflect.get(service, 'keywordService') as {
      createSearchTokens: jest.Mock;
    };
    keywordService.createSearchTokens.mockResolvedValue([]);
    query.mockResolvedValue([
      {
        id: 'restart',
        title: 'Restart',
        bodyText: 'restart the server',
        sourceKey: 'restart',
        sourcePath: 'restart.md',
        metadata: {},
      },
      {
        id: 'artifact',
        title: 'Build',
        bodyText: 'artifact upload',
        sourceKey: 'artifact',
        sourcePath: 'artifact.md',
        metadata: {},
      },
    ]);
    const result = await service.retrieve({
      channel: 'resume',
      question: 'art',
      locale: 'en-US',
    });
    expect(result.map((item) => item.id)).toEqual(['artifact']);
  });

  it('벡터 모드는 공급자 실패를 숨기지 않고 DB를 조회하지 않는다', async () => {
    const { service, embed, query } = createHarness();
    embed.mockRejectedValue(new Error('embedding unavailable'));
    await expect(
      service.retrieve({
        channel: 'resume',
        question: '관련 질문',
        locale: 'ko-KR',
      }),
    ).rejects.toThrow('embedding unavailable');
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    [0, 0],
    [NaN, 0],
    [1, 2, 3],
  ])('유효하지 않은 벡터 %j를 검색 전에 거부한다', async (...vector) => {
    const { service, embed, query } = createHarness();
    embed.mockResolvedValue({ ...profile, vector });
    await expect(
      service.retrieve({
        channel: 'resume',
        question: '관련 질문',
        locale: 'ko-KR',
      }),
    ).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('하이브리드 모드는 벡터 장애 시 경고하고 키워드 결과를 제공한다', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    try {
      const { service, query, embed } = createHarness('hybrid');
      embed.mockRejectedValue(new Error('private upstream failure'));
      query.mockResolvedValue([
        {
          id: 'a',
          title: 'Oprimed',
          bodyText: 'Oprimed 역할',
          sourceKey: 'a',
          sourcePath: 'a.md',
          metadata: {},
        },
      ]);
      expect(
        await service.retrieve({
          channel: 'resume',
          question: 'Oprimed',
          locale: 'ko-KR',
        }),
      ).toHaveLength(1);
      expect(warn).toHaveBeenCalledWith(
        'Resume vector search unavailable; using keyword retrieval',
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('RRF는 같은 청크를 합치고 한 원문의 서로 다른 청크를 함께 전달한다', () => {
    const shared = chunk('shared', '공통 청크');
    const result = mergeResumeSearchResults(
      [chunk('vector-only'), shared],
      [chunk('shared', '공통 청크'), chunk('shared', '다른 관련 청크')],
      5,
    );
    expect(result[0]).toEqual(shared);
    expect(result.map((item) => item.content)).toEqual([
      '공통 청크',
      expect.any(String),
      expect.any(String),
    ]);
    expect(result.filter((item) => item.sourceKey === 'shared')).toHaveLength(
      2,
    );
  });

  it('RRF는 한 원문이 결과를 독점하지 않게 원문당 3개까지만 전달한다', () => {
    const result = mergeResumeSearchResults(
      ['첫째', '둘째', '셋째', '넷째'].map((content) => chunk('long', content)),
      [chunk('other')],
      5,
    );
    expect(result.filter((item) => item.sourceKey === 'long')).toHaveLength(3);
    expect(result).toContainEqual(chunk('other'));
  });

  it('분할 설정 해시는 모델·API 키 변경과 무관하며 잘못된 설정을 거부한다', () => {
    const first = getResumeRagConfig({ RAG_AI_API_KEY: 'first' });
    const second = getResumeRagConfig({
      RAG_AI_API_KEY: 'second',
      RAG_CHAT_MODEL: 'other',
    });
    expect(getResumeChunkConfigHash(first)).toBe(
      getResumeChunkConfigHash(second),
    );
    expect(getResumeChunkConfigHash({ ...first, chunkSize: 500 })).not.toBe(
      getResumeChunkConfigHash(first),
    );
    expect(() =>
      getResumeRagConfig({ RAG_RETRIEVAL_MODE: 'invalid' }),
    ).toThrow();
    // 폐지된 벡터 기준값은 읽지 않으므로 잘못된 값이어도 기동을 막지 않는다.
    expect(
      getResumeRagConfig({ RAG_VECTOR_MIN_SIMILARITY: 'NaN' }).ignoredSettings,
    ).toEqual(['RAG_VECTOR_MIN_SIMILARITY']);
  });
});

describe('채팅 자료 범위', () => {
  it.each(['main', 'resume'] as const)(
    '%s hybrid는 두 검색에서 같은 데이터 범위를 유지한다',
    async (channel) => {
      const { service, query, config } = createHarness('hybrid');
      config.allowedSourceTypes = [
        'app_resume',
        'resume_workspace',
        'career_data',
        'unapproved',
      ];
      query.mockResolvedValue([]);
      expect(
        await service.retrieve({
          channel,
          question: 'Oprimed',
          locale: 'ko-KR',
        }),
      ).toEqual([]);
      const calls = query.mock.calls as Array<[string, unknown[]]>;
      const keyword = calls.find(
        ([sql]) => !sql.includes('resume_vector_chunks'),
      );
      const vector = calls.find(([sql]) =>
        sql.includes('resume_vector_chunks'),
      );
      const sourceTypes =
        channel === 'main' ? ['app_resume', 'career_data'] : ['career_data'];
      expect(keyword?.[1][2]).toEqual(sourceTypes);
      expect(vector?.[1][1]).toEqual(sourceTypes);
      expect(keyword?.[1][3]).toEqual(chatDefinitions[channel].itemTypes);
      expect(vector?.[1][10]).toEqual(chatDefinitions[channel].itemTypes);
      expect(query).toHaveBeenCalledTimes(2);
    },
  );
});

describe('공통 DB 원문 선택', () => {
  it.each(['keyword', 'vector', 'hybrid'])(
    '%s는 현재 공개 불렛과 live 사실만 허용하고 철회된 상세 파일을 차단한다',
    async (mode) => {
      const { service, query } = createHarness(mode);
      query.mockResolvedValue([]);
      await service.retrieve({
        channel: 'resume',
        question: 'Oprimed',
        locale: 'en-US',
      });
      for (const [sql, parameters] of query.mock.calls as Array<
        [string, unknown[]]
      >) {
        expect(sql).toContain('"isCurrent" = TRUE');
        expect(sql.indexOf('OR "isCurrent" = TRUE')).toBeLessThan(
          sql.indexOf('ORDER BY "sourceType"'),
        );
        expect(sql).toContain("pb.status='ready' AND pb.visibility='public'");
        expect(sql).toContain('pf.revision<>pbf.fact_revision');
        expect(sql).not.toContain('resumeVersionId');
        expect(sql).toContain('f.revision = dep.source_revision');
        expect(sql).toContain("f.verification_status = 'confirmed'");
        expect(sql).toContain('canonical."isCurrent" = TRUE');
        expect(sql).toContain('starts_with(');
        expect(sql).toContain("|| '#'");
        expect(sql).not.toContain("canonical.status = 'active'");
        expect(parameters).toContain('en-US');
        expect(parameters).toContainEqual(['career_data']);
      }
    },
  );

  it('운영자가 career_data를 제외한 명시적 allowlist를 우회하지 않는다', async () => {
    const { service, query, config } = createHarness('hybrid');
    config.allowedSourceTypes = ['app_resume'];
    query.mockResolvedValue([]);
    await service.retrieve({
      channel: 'resume',
      locale: 'ko-KR',
      question: '경력',
    });
    for (const [sql, parameters] of query.mock.calls as Array<
      [string, unknown[]]
    >) {
      expect(parameters[sql.includes('resume_vector_chunks') ? 1 : 2]).toEqual(
        [],
      );
    }
  });

  it('미등록·비공개 선택은 기존 원문으로 우회하지 않는다', async () => {
    const { service, query, embed } = createHarness();
    query.mockResolvedValue([]);
    await expect(
      service.assertSelection({ locale: 'ko-KR', resumeKey: 'private' }),
    ).rejects.toThrow('Resume not found');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("r.visibility = 'public'"),
      ['private', 'ko-KR'],
    );
    expect(embed).not.toHaveBeenCalled();
  });
});
