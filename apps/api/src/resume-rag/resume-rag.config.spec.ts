import {
  getResumeRagConfig,
  requireChatProviderConfig,
  requireOpenAiCompatibleChatModelConfig,
  requireEmbeddingModelConfig,
} from './resume-rag.config';

describe('resume rag config', () => {
  it('does not default provider, model, or dimensions', () => {
    const config = getResumeRagConfig({});

    expect(config.embeddingProvider).toBeUndefined();
    expect(config.embeddingModel).toBeUndefined();
    expect(config.embeddingDimensions).toBeUndefined();
    expect(config.chatProvider).toBeUndefined();
    expect(config.chatModel).toBeUndefined();
  });

  it('defaults retrieval similarity for keyword text search', () => {
    const config = getResumeRagConfig({});

    expect(config.minSimilarity).toBe(0.1);
  });

  it('parses numeric retrieval and model settings from strings', () => {
    const config = getResumeRagConfig({
      RAG_EMBEDDING_PROVIDER: 'openai-compatible',
      RAG_EMBEDDING_MODEL: 'embedding-model',
      RAG_EMBEDDING_DIMENSIONS: '1536',
      RAG_CHAT_PROVIDER: 'codex-app-server',
      RAG_CHAT_MODEL: 'codex-model',
      RAG_CODEX_APP_SERVER_URL: 'ws://127.0.0.1:14561',
      RAG_CODEX_CWD: '/home/icenux/projects/vscoke-api',
      RAG_CODEX_TIMEOUT_MS: '45000',
      RAG_TOP_K: '7',
      RAG_MIN_SIMILARITY: '0.73',
    });

    expect(config.embeddingDimensions).toBe(1536);
    expect(config.chatProvider).toBe('codex-app-server');
    expect(config.chatModel).toBe('codex-model');
    expect(config.codexAppServerUrl).toBe('ws://127.0.0.1:14561');
    expect(config.codexCwd).toBe('/home/icenux/projects/vscoke-api');
    expect(config.codexTimeoutMs).toBe(45000);
    expect(config.topK).toBe(7);
    expect(config.minSimilarity).toBe(0.73);
  });

  it('fails clearly when embedding model settings are missing', () => {
    expect(() => requireEmbeddingModelConfig(getResumeRagConfig({}))).toThrow(
      'RAG_EMBEDDING_PROVIDER',
    );
  });

  it('fails clearly when chat provider settings are missing', () => {
    expect(() => requireChatProviderConfig(getResumeRagConfig({}))).toThrow(
      'RAG_CHAT_PROVIDER',
    );
  });

  it('allows codex chat provider without a separate chat model env', () => {
    expect(() =>
      requireChatProviderConfig(
        getResumeRagConfig({ RAG_CHAT_PROVIDER: 'codex-app-server' }),
      ),
    ).not.toThrow();
  });

  it('still requires chat model settings for openai-compatible chat', () => {
    expect(() =>
      requireOpenAiCompatibleChatModelConfig(
        getResumeRagConfig({ RAG_CHAT_PROVIDER: 'openai-compatible' }),
      ),
    ).toThrow('RAG_CHAT_MODEL');
  });
});
