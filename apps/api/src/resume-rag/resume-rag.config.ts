import { chatDefinitions, type ChatChannel } from './chat-definition';
import { getResumeChunkConfigHash } from './indexing/resume-index-profile';

export type ResumeRagConfig = {
  retrievalMode?: 'keyword' | 'vector' | 'hybrid';
  // 값이 있어도 동작에 쓰지 않는 폐지된 환경 변수 이름. 기동 로그로 정리를 안내한다.
  ignoredSettings?: string[];
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

// 운영 Secret 값과 같은 기본값이다. 환경 변수 한 줄이 빠져도 청크 설정 해시가
// 조용히 바뀌어 색인된 벡터가 검색에서 빠지지 않게 한다.
export const RESUME_RAG_DEFAULT_CHUNK_SIZE = 600;
export const RESUME_RAG_DEFAULT_CHUNK_OVERLAP = 80;

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

// 벡터 검색은 절대 점수 기준 대신 순위로 후보를 고른다. 이전 기준값 설정이 남아 있어도
// 검색을 거르지 않도록 읽지 않고 이름만 기동 로그에 남긴다.
const DEPRECATED_SETTINGS = ['RAG_VECTOR_MIN_SIMILARITY'] as const;

const findIgnoredSettings = (
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string[] => DEPRECATED_SETTINGS.filter((name) => Boolean(env[name]?.trim()));

export const getResumeRagConfig = (
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ResumeRagConfig => ({
  retrievalMode: parseRetrievalMode(env.RAG_RETRIEVAL_MODE),
  ignoredSettings: findIgnoredSettings(env),
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
  topK: parseOptionalInt(env.RAG_TOP_K) ?? 10,
  minSimilarity: parseOptionalFloat(env.RAG_MIN_SIMILARITY) ?? 0.1,
  chunkSize:
    parseOptionalInt(env.RAG_CHUNK_SIZE) ?? RESUME_RAG_DEFAULT_CHUNK_SIZE,
  chunkOverlap:
    parseOptionalInt(env.RAG_CHUNK_OVERLAP) ?? RESUME_RAG_DEFAULT_CHUNK_OVERLAP,
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

export const getChatChannelSourceTypes = (
  config: Pick<ResumeRagConfig, 'allowedSourceTypes'>,
  channel: ChatChannel,
): string[] =>
  config.allowedSourceTypes.filter((sourceType) =>
    chatDefinitions[channel].sourceTypes.includes(sourceType),
  );

const chatChannels = Object.keys(chatDefinitions) as ChatChannel[];

// 검색 대상이 구조적으로 비는 설정은 200 + "근거 없음"으로 조용히 응답하게 만든다.
// 2026-10-29 장애처럼 배포가 성공한 것처럼 보이지 않도록 기동과 배포 검증에서 거부한다.
export const assertResumeRagSearchScope = (
  config: Pick<
    ResumeRagConfig,
    'allowedSourceTypes' | 'allowedVisibilities' | 'topK'
  >,
): void => {
  const problems: string[] = [];
  if (!config.allowedVisibilities.includes('public')) {
    problems.push(
      `RAG_ALLOWED_VISIBILITIES must include public (current: ${config.allowedVisibilities.join(',')})`,
    );
  }
  for (const channel of chatChannels) {
    if (getChatChannelSourceTypes(config, channel).length > 0) continue;
    problems.push(
      `${channel} channel: RAG_ALLOWED_SOURCE_TYPES (current: ${config.allowedSourceTypes.join(',')}) must include one of ${chatDefinitions[channel].sourceTypes.join(',')}`,
    );
  }
  if (!Number.isSafeInteger(config.topK) || config.topK < 1) {
    problems.push(`RAG_TOP_K must be at least 1 (current: ${config.topK})`);
  }
  if (problems.length > 0) {
    throw new Error(
      `Resume RAG 검색 범위가 비어 있습니다 / search scope is empty: ${problems.join('; ')}`,
    );
  }
};

// 기동 로그용 유효 설정. 키·인증 정보가 들어갈 수 있는 URL과 경로는 넣지 않는다.
export const describeResumeRagConfig = (config: ResumeRagConfig) => ({
  retrievalMode: config.retrievalMode,
  embeddingProvider: config.embeddingProvider ?? null,
  embeddingModel: config.embeddingModel ?? null,
  embeddingDimensions: config.embeddingDimensions ?? null,
  embeddingSendDimensions: config.embeddingSendDimensions,
  localEmbeddingLocalFilesOnly: config.localEmbeddingLocalFilesOnly,
  vectorSelection: 'rank',
  minSimilarity: config.minSimilarity,
  topK: config.topK,
  chunkSize: config.chunkSize,
  chunkOverlap: config.chunkOverlap,
  chunkConfigHash: getResumeChunkConfigHash(config),
  allowedVisibilities: config.allowedVisibilities,
  allowedSourceTypes: config.allowedSourceTypes,
  channelSourceTypes: Object.fromEntries(
    chatChannels.map((channel) => [
      channel,
      getChatChannelSourceTypes(config, channel),
    ]),
  ),
  chatProvider: config.chatProvider,
  chatModel: config.chatModel,
  chatTimeoutMs: config.chatTimeoutMs,
  ignoredSettings: config.ignoredSettings ?? [],
});
