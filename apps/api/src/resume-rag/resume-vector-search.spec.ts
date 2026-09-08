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
      expect(sql).toContain('AND source."itemType" = ANY($12)');
      expect(sql).toContain("source.visibility = 'public'");
      expect(sql).toContain("source.status = 'active'");
      expect(sql).toContain('source.vectorize = TRUE');
      expect(sql).toContain('"sourceType" = ANY($2)');
      expect(sql).toContain('vector_dims(chunk.embedding) = $6');
      expect(sql).toContain('embedding <=> $9::vector');
      expect(params).toEqual([
        ['public'],
        ['app_resume'],
        'ko-KR',
        profile.provider,
        profile.model,
        2,
        'resume-source-item-chunker-v1',
        getResumeChunkConfigHash(config),
        '[1,0]',
        0.3,
        15,
        chatDefinitions[channel].itemTypes,
      ]);
    },
  );

  it.each(['vector', 'hybrid'])(
    '이력 의도가 없으면 %s 모드도 임베딩을 실행하지 않는다',
    async (mode) => {
      const { service, embed, query } = createHarness(mode);
      const keywordService = Reflect.get(service, 'keywordService') as {
        createSearchTokens: jest.Mock;
      };
      keywordService.createSearchTokens.mockResolvedValue([]);
      expect(
        await service.retrieve({
          channel: 'resume',
          question: '내일 비트코인 가격을 알려줘',
          locale: 'ko-KR',
        }),
      ).toEqual([]);
      expect(embed).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    },
  );

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

  it('RRF는 중복 근거를 합치고 긴 원문보다 검색한 청크를 사용한다', () => {
    const shared = chunk('shared', '짧은 벡터 청크');
    const result = mergeResumeSearchResults(
      [chunk('vector-only'), shared],
      [chunk('shared', '긴 전체 문서'), chunk('keyword-only')],
      2,
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(shared);
    expect(new Set(result.map((item) => item.sourceKey)).size).toBe(2);
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
    expect(() =>
      getResumeRagConfig({ RAG_VECTOR_MIN_SIMILARITY: 'NaN' }),
    ).toThrow();
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
        channel === 'main'
          ? ['app_resume']
          : ['app_resume', 'resume_workspace'];
      expect(keyword?.[1][2]).toEqual(sourceTypes);
      expect(vector?.[1][1]).toEqual(sourceTypes);
      expect(keyword?.[1][3]).toEqual(chatDefinitions[channel].itemTypes);
      expect(vector?.[1][11]).toEqual(chatDefinitions[channel].itemTypes);
      expect(query).toHaveBeenCalledTimes(2);
    },
  );
});
