import { CodexAppServerProvider } from './codex-app-server.provider';
import { OpenAiCompatibleProvider } from './open-ai-compatible.provider';
import type { ChatProvider } from './chat-provider';
import type { EmbeddingProvider } from './embedding-provider';
import {
  type ResumeRagConfig,
  requireChatProviderConfig,
  requireEmbeddingModelConfig,
} from '../resume-rag.config';

class MissingEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: ResumeRagConfig) {}

  embed(): Promise<never> {
    try {
      requireEmbeddingModelConfig(this.config);
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    return Promise.reject(
      new Error(
        `Unsupported Resume RAG embedding provider: ${this.config.embeddingProvider}`,
      ),
    );
  }
}

class MissingChatProvider implements ChatProvider {
  constructor(private readonly config: ResumeRagConfig) {}

  answer(): Promise<never> {
    try {
      requireChatProviderConfig(this.config);
    } catch (error) {
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    return Promise.reject(
      new Error(
        `Unsupported Resume RAG chat provider: ${this.config.chatProvider}`,
      ),
    );
  }
}

export const createEmbeddingProvider = (
  config: ResumeRagConfig,
): EmbeddingProvider => {
  if (config.embeddingProvider === 'openai-compatible') {
    return new OpenAiCompatibleProvider(config);
  }

  return new MissingEmbeddingProvider(config);
};

export const createChatProvider = (config: ResumeRagConfig): ChatProvider => {
  if (config.chatProvider === 'openai-compatible') {
    return new OpenAiCompatibleProvider(config);
  }

  if (config.chatProvider === 'codex-app-server') {
    return new CodexAppServerProvider(config);
  }

  return new MissingChatProvider(config);
};
