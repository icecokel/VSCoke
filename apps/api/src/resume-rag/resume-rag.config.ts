export type ResumeRagConfig = {
  retrievalMode?: 'keyword' | 'vector' | 'hybrid';
  vectorMinSimilarity?: number;
  embeddingSendDimensions?: boolean;
  localEmbeddingCacheDir?: string;
  localEmbeddingLocalFilesOnly?: boolean;
  embeddingProvider?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  chatProvider?: string;
  chatModel?: string;
  chatTimeoutMs: number;
  anthropicApiKey?: string;
  aiBaseUrl?: string;
  aiApiKey?: string;
  topK: number;
  minSimilarity: number;
  chunkSize: number;
  chunkOverlap: number;
  allowedVisibilities: string[];
  allowedSourceTypes: string[];
};

export type RequiredEmbeddingModelConfig = {
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
};

export type RequiredChatProviderConfig = {
  chatProvider: string;
};

export type RequiredClaudeConfig = {
  chatProvider: string;
  chatModel: string;
  chatTimeoutMs: number;
  anthropicApiKey: string;
};

export const RESUME_RAG_CONFIG = 'RESUME_RAG_CONFIG';

// 프롬프트에 넣는 검색 청크 하나의 최대 길이. keyword 검색은 항목 본문 전체를
// 청크로 돌려주므로 공개 원천 기록은 이 길이 안에 있어야 잘리지 않는다.
export const RESUME_RAG_RETRIEVED_CHUNK_MAX_CHARS = 4000;

const parseOptionalInt = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseOptionalFloat = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseChatTimeout = (value: string | undefined): number => {
  const timeout = value?.trim() ? Number(value) : 45_000;
  if (
    !Number.isSafeInteger(timeout) ||
    timeout <= 0 ||
    timeout > 2_147_483_647
  ) {
    throw new Error('Invalid RAG_CHAT_TIMEOUT_MS');
  }
  return timeout;
};

const splitCsv = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length > 0 ? values : fallback;
};

const parseRetrievalMode = (
  value: string | undefined,
): 'keyword' | 'vector' | 'hybrid' => {
  const mode = value || 'hybrid';
  if (mode !== 'keyword' && mode !== 'vector' && mode !== 'hybrid') {
    throw new Error('Invalid RAG_RETRIEVAL_MODE');
  }
  return mode;
};

const parseVectorThreshold = (value: string | undefined): number => {
  const threshold = value === undefined || value === '' ? 0.3 : Number(value);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error('Invalid RAG_VECTOR_MIN_SIMILARITY');
  }
  return threshold;
};

export const getResumeRagConfig = (
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ResumeRagConfig => ({
  retrievalMode: parseRetrievalMode(env.RAG_RETRIEVAL_MODE),
  vectorMinSimilarity: parseVectorThreshold(env.RAG_VECTOR_MIN_SIMILARITY),
  embeddingSendDimensions: env.RAG_EMBEDDING_SEND_DIMENSIONS === 'true',
  localEmbeddingCacheDir: env.RAG_LOCAL_EMBEDDING_CACHE_DIR || undefined,
  localEmbeddingLocalFilesOnly:
    env.RAG_LOCAL_EMBEDDING_LOCAL_FILES_ONLY === 'true',
  embeddingProvider: env.RAG_EMBEDDING_PROVIDER || undefined,
  embeddingModel: env.RAG_EMBEDDING_MODEL || undefined,
  embeddingDimensions: parseOptionalInt(env.RAG_EMBEDDING_DIMENSIONS),
  chatProvider: env.RAG_CHAT_PROVIDER || 'claude',
  chatModel: env.RAG_CHAT_MODEL || 'claude-sonnet-5-5',
  chatTimeoutMs: parseChatTimeout(env.RAG_CHAT_TIMEOUT_MS),
  anthropicApiKey: env.ANTHROPIC_API_KEY?.trim() || undefined,
  aiBaseUrl: env.RAG_AI_BASE_URL || undefined,
  aiApiKey: env.RAG_AI_API_KEY || undefined,
  topK: parseOptionalInt(env.RAG_TOP_K) ?? 5,
  minSimilarity: parseOptionalFloat(env.RAG_MIN_SIMILARITY) ?? 0.1,
  chunkSize: parseOptionalInt(env.RAG_CHUNK_SIZE) ?? 1200,
  chunkOverlap: parseOptionalInt(env.RAG_CHUNK_OVERLAP) ?? 120,
  allowedVisibilities: splitCsv(env.RAG_ALLOWED_VISIBILITIES, ['public']),
  allowedSourceTypes: splitCsv(env.RAG_ALLOWED_SOURCE_TYPES, [
    'app_resume',
    'career_data',
  ]),
});

export const requireEmbeddingModelConfig = (
  config: ResumeRagConfig,
): RequiredEmbeddingModelConfig => {
  const missing = [
    config.embeddingProvider ? null : 'RAG_EMBEDDING_PROVIDER',
    config.embeddingModel ? null : 'RAG_EMBEDDING_MODEL',
    config.embeddingDimensions ? null : 'RAG_EMBEDDING_DIMENSIONS',
  ].filter((value): value is string => Boolean(value));

  if (missing.length > 0) {
    throw new Error(
      `Missing Resume RAG embedding config: ${missing.join(', ')}`,
    );
  }

  return {
    embeddingProvider: config.embeddingProvider as string,
    embeddingModel: config.embeddingModel as string,
    embeddingDimensions: config.embeddingDimensions as number,
  };
};

export const requireChatProviderConfig = (
  config: ResumeRagConfig,
): RequiredChatProviderConfig => {
  const missing = [config.chatProvider ? null : 'RAG_CHAT_PROVIDER'].filter(
    (value): value is string => Boolean(value),
  );

  if (missing.length > 0) {
    throw new Error(`Missing Resume RAG chat config: ${missing.join(', ')}`);
  }

  return {
    chatProvider: config.chatProvider as string,
  };
};

export const requireClaudeConfig = (
  config: ResumeRagConfig,
): RequiredClaudeConfig => {
  const providerConfig = requireChatProviderConfig(config);
  const missing = [
    config.chatModel ? null : 'RAG_CHAT_MODEL',
    config.anthropicApiKey ? null : 'ANTHROPIC_API_KEY',
  ].filter((value): value is string => Boolean(value));
  if (missing.length > 0) {
    throw new Error(`Missing Resume RAG Claude config: ${missing.join(', ')}`);
  }

  return {
    chatProvider: providerConfig.chatProvider,
    chatModel: config.chatModel as string,
    chatTimeoutMs: config.chatTimeoutMs,
    anthropicApiKey: config.anthropicApiKey as string,
  };
};
