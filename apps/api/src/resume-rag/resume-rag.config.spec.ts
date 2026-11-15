import {
  assertResumeRagSearchScope,
  describeResumeRagConfig,
  getResumeRagConfig,
  requireClaudeConfig,
  requireEmbeddingModelConfig,
} from './resume-rag.config';

describe('resume rag config', () => {
  it('defaults Claude generation without defaulting embedding settings', () => {
    const config = getResumeRagConfig({});

    expect(config.embeddingProvider).toBeUndefined();
    expect(config.embeddingModel).toBeUndefined();
    expect(config.embeddingDimensions).toBeUndefined();
    expect(config.chatProvider).toBe('claude');
    expect(config.chatModel).toBe('claude-sonnet-5-5');
    expect(config.chatTimeoutMs).toBe(45_000);
  });

  it('defaults retrieval and source safety settings', () => {
    const config = getResumeRagConfig({});

    expect(config.minSimilarity).toBe(0.1);
    expect(config.allowedVisibilities).toEqual(['public']);
    expect(config.allowedSourceTypes).toEqual(['app_resume', 'career_data']);
  });

  it('defaults chunking to the production values', () => {
    const config = getResumeRagConfig({});

    expect(config.chunkSize).toBe(600);
    expect(config.chunkOverlap).toBe(80);
    expect(config.ignoredSettings).toEqual([]);
  });

  it('ignores the retired vector threshold instead of filtering vector search', () => {
    // 운영 Secret에 남은 0.85가 순위 기반 벡터 검색을 다시 거르지 않게 한다.
    const config = getResumeRagConfig({ RAG_VECTOR_MIN_SIMILARITY: '0.85' });

    expect(config).not.toHaveProperty('vectorMinSimilarity');
    expect(config.ignoredSettings).toEqual(['RAG_VECTOR_MIN_SIMILARITY']);
    expect(describeResumeRagConfig(config)).toMatchObject({
      vectorSelection: 'rank',
      ignoredSettings: ['RAG_VECTOR_MIN_SIMILARITY'],
    });
  });

  it('accepts the default search scope for every chat channel', () => {
    expect(() =>
      assertResumeRagSearchScope(getResumeRagConfig({})),
    ).not.toThrow();
    expect(() =>
      assertResumeRagSearchScope(
        getResumeRagConfig({ RAG_ALLOWED_SOURCE_TYPES: 'career_data' }),
      ),
    ).not.toThrow();
  });

  it('rejects a source type list that leaves the resume channel empty', () => {
    // 2026-10-29 장애 설정: resume 채널은 career_data만 검색한다.
    expect(() =>
      assertResumeRagSearchScope(
        getResumeRagConfig({ RAG_ALLOWED_SOURCE_TYPES: 'app_resume' }),
      ),
    ).toThrow(
      /resume channel: RAG_ALLOWED_SOURCE_TYPES \(current: app_resume\) must include one of career_data/,
    );
  });

  it.each([
    [
      { RAG_ALLOWED_SOURCE_TYPES: 'resume_workspace' },
      /main channel.*resume channel/,
    ],
    [{ RAG_ALLOWED_VISIBILITIES: 'private' }, /RAG_ALLOWED_VISIBILITIES/],
    [{ RAG_TOP_K: '0' }, /RAG_TOP_K/],
  ])(
    'rejects a search scope that can never return evidence: %j',
    (env, message) => {
      expect(() => assertResumeRagSearchScope(getResumeRagConfig(env))).toThrow(
        message,
      );
    },
  );

  it('describes the effective config without keys or credential-bearing URLs', () => {
    const description = describeResumeRagConfig(
      getResumeRagConfig({
        RAG_EMBEDDING_PROVIDER: 'openai-compatible',
        RAG_EMBEDDING_MODEL: 'embedding-model',
        RAG_EMBEDDING_DIMENSIONS: '384',
        ANTHROPIC_API_KEY: 'private-claude-key',
        RAG_AI_API_KEY: 'private-embedding-key',
        RAG_AI_BASE_URL: 'https://user:private-password@example.test/v1',
        RAG_LOCAL_EMBEDDING_CACHE_DIR: '/private/cache',
        RAG_ALLOWED_SOURCE_TYPES: 'career_data',
      }),
    );

    expect(description).toMatchObject({
      retrievalMode: 'hybrid',
      embeddingProvider: 'openai-compatible',
      embeddingModel: 'embedding-model',
      embeddingDimensions: 384,
      vectorSelection: 'rank',
      minSimilarity: 0.1,
      topK: 10,
      chunkSize: 600,
      chunkOverlap: 80,
      chunkConfigHash: expect.stringMatching(/^[a-f0-9]{64}$/) as unknown,
      allowedVisibilities: ['public'],
      allowedSourceTypes: ['career_data'],
      channelSourceTypes: { main: ['career_data'], resume: ['career_data'] },
      chatProvider: 'claude',
      chatModel: 'claude-sonnet-5-5',
      chatTimeoutMs: 45_000,
    });
    expect(JSON.stringify(description)).not.toMatch(/private/);
  });

  it.each(['0', '-1', '1.5', '45000ms', 'NaN', 'Infinity', '2147483648'])(
    'rejects invalid chat timeout %s',
    (timeout) => {
      expect(() =>
        getResumeRagConfig({ RAG_CHAT_TIMEOUT_MS: timeout }),
      ).toThrow('RAG_CHAT_TIMEOUT_MS');
    },
  );

  it('parses numeric retrieval and model settings from strings', () => {
    const config = getResumeRagConfig({
      RAG_EMBEDDING_PROVIDER: 'openai-compatible',
      RAG_EMBEDDING_MODEL: 'embedding-model',
      RAG_EMBEDDING_DIMENSIONS: '1536',
      RAG_CHAT_PROVIDER: 'claude',
      RAG_CHAT_MODEL: 'claude-model',
      RAG_CHAT_TIMEOUT_MS: '30000',
      ANTHROPIC_API_KEY: ' claude-key ',
      RAG_AI_API_KEY: 'embedding-key',
      RAG_TOP_K: '7',
      RAG_MIN_SIMILARITY: '0.73',
      RAG_ALLOWED_SOURCE_TYPES: 'app_resume,curated_resume',
    });

    expect(config.embeddingDimensions).toBe(1536);
    expect(config.chatProvider).toBe('claude');
    expect(config.chatModel).toBe('claude-model');
    expect(config.chatTimeoutMs).toBe(30_000);
    expect(config.anthropicApiKey).toBe('claude-key');
    expect(config.aiApiKey).toBe('embedding-key');
    expect(config.topK).toBe(7);
    expect(config.minSimilarity).toBe(0.73);
    expect(config.allowedSourceTypes).toEqual(['app_resume', 'curated_resume']);
  });

  it('fails clearly when embedding model settings are missing', () => {
    expect(() => requireEmbeddingModelConfig(getResumeRagConfig({}))).toThrow(
      'RAG_EMBEDDING_PROVIDER',
    );
  });

  it('requires a Claude key independently from embedding credentials', () => {
    expect(() =>
      requireClaudeConfig(
        getResumeRagConfig({ RAG_AI_API_KEY: 'embedding-key' }),
      ),
    ).toThrow('ANTHROPIC_API_KEY');
    expect(
      requireClaudeConfig(getResumeRagConfig({ ANTHROPIC_API_KEY: 'key' })),
    ).toEqual({
      chatProvider: 'claude',
      chatModel: 'claude-sonnet-5-5',
      chatTimeoutMs: 45_000,
      anthropicApiKey: 'key',
    });
  });
});
