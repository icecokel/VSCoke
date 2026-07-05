export type ResumeRagConfig = {
  embeddingProvider?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  chatProvider?: string;
  chatModel?: string;
  codexModelProvider?: string;
  codexAppServerUrl?: string;
  codexCwd?: string;
  codexTimeoutMs: number;
  aiBaseUrl?: string;
  aiApiKey?: string;
  topK: number;
  minSimilarity: number;
  chunkSize: number;
  chunkOverlap: number;
  allowedVisibilities: string[];
};

export type RequiredEmbeddingModelConfig = {
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
};

export type RequiredChatModelConfig = {
  chatProvider: string;
  chatModel: string;
};

export type RequiredChatProviderConfig = {
  chatProvider: string;
};

export type RequiredCodexAppServerConfig = {
  chatProvider: string;
  chatModel?: string;
  codexModelProvider?: string;
  codexAppServerUrl: string;
  codexCwd?: string;
  codexTimeoutMs: number;
};

export const RESUME_RAG_CONFIG = 'RESUME_RAG_CONFIG';

const DEFAULT_CODEX_APP_SERVER_URL = 'ws://127.0.0.1:14561';
const DEFAULT_CODEX_TIMEOUT_MS = 120_000;

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

const splitCsv = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length > 0 ? values : fallback;
};

export const getResumeRagConfig = (
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ResumeRagConfig => ({
  embeddingProvider: env.RAG_EMBEDDING_PROVIDER || undefined,
  embeddingModel: env.RAG_EMBEDDING_MODEL || undefined,
  embeddingDimensions: parseOptionalInt(env.RAG_EMBEDDING_DIMENSIONS),
  chatProvider: env.RAG_CHAT_PROVIDER || undefined,
  chatModel: env.RAG_CHAT_MODEL || undefined,
  codexModelProvider: env.RAG_CODEX_MODEL_PROVIDER || undefined,
  codexAppServerUrl:
    env.RAG_CODEX_APP_SERVER_URL || DEFAULT_CODEX_APP_SERVER_URL,
  codexCwd: env.RAG_CODEX_CWD || undefined,
  codexTimeoutMs:
    parseOptionalInt(env.RAG_CODEX_TIMEOUT_MS) ?? DEFAULT_CODEX_TIMEOUT_MS,
  aiBaseUrl: env.RAG_AI_BASE_URL || undefined,
  aiApiKey: env.RAG_AI_API_KEY || undefined,
  topK: parseOptionalInt(env.RAG_TOP_K) ?? 5,
  minSimilarity: parseOptionalFloat(env.RAG_MIN_SIMILARITY) ?? 0.78,
  chunkSize: parseOptionalInt(env.RAG_CHUNK_SIZE) ?? 1200,
  chunkOverlap: parseOptionalInt(env.RAG_CHUNK_OVERLAP) ?? 120,
  allowedVisibilities: splitCsv(env.RAG_ALLOWED_VISIBILITIES, ['public']),
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

export const requireOpenAiCompatibleChatModelConfig = (
  config: ResumeRagConfig,
): RequiredChatModelConfig => {
  const providerConfig = requireChatProviderConfig(config);
  if (!config.chatModel) {
    throw new Error('Missing Resume RAG chat config: RAG_CHAT_MODEL');
  }

  return {
    chatProvider: providerConfig.chatProvider,
    chatModel: config.chatModel,
  };
};

export const requireCodexAppServerConfig = (
  config: ResumeRagConfig,
): RequiredCodexAppServerConfig => {
  const providerConfig = requireChatProviderConfig(config);
  if (!config.codexAppServerUrl) {
    throw new Error(
      'Missing Resume RAG Codex config: RAG_CODEX_APP_SERVER_URL',
    );
  }

  return {
    chatProvider: providerConfig.chatProvider,
    chatModel: config.chatModel,
    codexModelProvider: config.codexModelProvider,
    codexAppServerUrl: config.codexAppServerUrl,
    codexCwd: config.codexCwd,
    codexTimeoutMs: config.codexTimeoutMs,
  };
};
