import {
  buildResumeChatPrompt,
  getResumeChatInstructions,
} from './resume-chat-prompt';
import type { ChatAnswerRequest, ChatProvider } from './chat-provider';
import type { EmbeddingProvider, EmbeddingResult } from './embedding-provider';
import {
  type ResumeRagConfig,
  requireOpenAiCompatibleChatModelConfig,
  requireEmbeddingModelConfig,
} from '../resume-rag.config';

type EmbeddingResponse = {
  data?: Array<{ embedding?: unknown }>;
};

type ChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

const getBaseProviderConfig = (
  config: ResumeRagConfig,
): { baseUrl: string; apiKey: string } => {
  if (!config.aiBaseUrl) {
    throw new Error('Missing Resume RAG AI config: RAG_AI_BASE_URL');
  }
  if (!config.aiApiKey) {
    throw new Error('Missing Resume RAG AI config: RAG_AI_API_KEY');
  }

  return {
    baseUrl: config.aiBaseUrl,
    apiKey: config.aiApiKey,
  };
};

export class OpenAiCompatibleProvider
  implements EmbeddingProvider, ChatProvider
{
  constructor(private readonly config: ResumeRagConfig) {}

  async embed(input: string): Promise<EmbeddingResult> {
    const embeddingConfig = requireEmbeddingModelConfig(this.config);
    const baseConfig = getBaseProviderConfig(this.config);

    const response = await fetch(
      `${normalizeBaseUrl(baseConfig.baseUrl)}/embeddings`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${baseConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: embeddingConfig.embeddingModel,
          input,
          ...(this.config.embeddingSendDimensions
            ? { dimensions: embeddingConfig.embeddingDimensions }
            : {}),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Embedding provider responded with ${response.status}`);
    }

    const json = (await response.json()) as EmbeddingResponse;
    const vector = json.data?.[0]?.embedding;
    if (
      !Array.isArray(vector) ||
      vector.some(
        (value) => typeof value !== 'number' || !Number.isFinite(value),
      )
    ) {
      throw new Error('Embedding provider returned an invalid vector');
    }
    const numericVector = vector.filter(
      (value): value is number => typeof value === 'number',
    );

    if (numericVector.length !== embeddingConfig.embeddingDimensions) {
      throw new Error(
        `Embedding dimensions mismatch: expected ${embeddingConfig.embeddingDimensions}, got ${numericVector.length}`,
      );
    }

    return {
      provider: embeddingConfig.embeddingProvider,
      model: embeddingConfig.embeddingModel,
      dimensions: embeddingConfig.embeddingDimensions,
      vector: numericVector,
    };
  }

  async answer(request: ChatAnswerRequest): Promise<string> {
    const chatConfig = requireOpenAiCompatibleChatModelConfig(this.config);
    const baseConfig = getBaseProviderConfig(this.config);

    const response = await fetch(
      `${normalizeBaseUrl(baseConfig.baseUrl)}/chat/completions`,
      {
        signal: AbortSignal.timeout(this.config.codexTimeoutMs),
        method: 'POST',
        headers: {
          Authorization: `Bearer ${baseConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: chatConfig.chatModel,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: getResumeChatInstructions(request),
            },
            {
              role: 'user',
              content: buildResumeChatPrompt(request),
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Chat provider responded with ${response.status}`);
    }

    const json = (await response.json()) as ChatResponse;
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('Chat provider returned an empty answer');
    }

    return content.trim();
  }
}
