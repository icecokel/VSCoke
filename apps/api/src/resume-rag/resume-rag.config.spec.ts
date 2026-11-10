import {
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
