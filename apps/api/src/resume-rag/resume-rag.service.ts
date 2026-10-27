import {
  shouldResolveResumeChatReference,
  type ResumeChatHistoryMessage,
} from './resume-chat-history';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ChatProvider } from './ai/chat-provider';
import { RESUME_RAG_CHAT_PROVIDER } from './ai/chat-provider';
import {
  ResumeRagRetrieverService,
  type RetrievedResumeChunk,
} from './resume-rag-retriever.service';
import type { ResumeRagChatResponseDto } from './dto/resume-rag-chat-response.dto';
import { ResumeRagChatLogService } from './resume-rag-chat-log.service';
import {
  getChatSimpleReply,
  getChatNoEvidenceAnswer,
  type ChatChannel,
} from './chat-definition';
import { RESUME_RAG_RETRIEVED_CHUNK_MAX_CHARS } from './resume-rag.config';

type AnswerRequest = {
  question: string;
  locale: string;
  resumeKey?: string;
};

type AnswerOptions = {
  channel?: ChatChannel;
  recordQuestion?: boolean;
  history?: ResumeChatHistoryMessage[];
};

const toStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

const toSource = (chunk: RetrievedResumeChunk) => ({
  title: chunk.title,
  sourcePath: chunk.sourcePath,
  sourceKey: chunk.sourceKey,
  sectionPath:
    typeof chunk.citationMetadata.sectionPath === 'string'
      ? chunk.citationMetadata.sectionPath
      : undefined,
  version:
    typeof chunk.citationMetadata.version === 'string'
      ? chunk.citationMetadata.version
      : typeof chunk.citationMetadata.versionName === 'string'
        ? chunk.citationMetadata.versionName
        : undefined,
  caveats: toStringArray(chunk.citationMetadata.caveats),
  excerpt: chunk.content.slice(0, 240),
  similarity: Number(chunk.similarity),
});

@Injectable()
export class ResumeRagService {
  private readonly logger = new Logger(ResumeRagService.name);

  constructor(
    private readonly retriever: ResumeRagRetrieverService,
    @Inject(RESUME_RAG_CHAT_PROVIDER)
    private readonly chatProvider: ChatProvider,
    private readonly chatLogService: ResumeRagChatLogService,
  ) {}

  async answer(
    request: AnswerRequest,
    options: AnswerOptions = {},
  ): Promise<ResumeRagChatResponseDto> {
    const startedAt = performance.now();
    const channel = options.channel ?? 'resume';
    const logContext = {
      channel,
      questionLength: request.question.length,
      historyMessageCount: options.history?.length ?? 0,
    };
    let stage = 'question-log';
    let stageStartedAt = startedAt;
    try {
      if (options.recordQuestion !== false) {
        await this.chatLogService.recordQuestion(
          request.question,
          request.locale,
        );
      }

      if (channel === 'resume') await this.retriever.assertSelection(request);
      const simpleReply = getChatSimpleReply(
        request.question,
        request.locale,
        channel,
      );
      if (simpleReply) {
        this.logger.log({
          event: 'chat.answer',
          ...logContext,
          outcome: 'simple-reply',
          grounded: false,
          sourceCount: 0,
          durationMs: performance.now() - startedAt,
        });
        return { answer: simpleReply, grounded: false, sources: [] };
      }

      let chunks: RetrievedResumeChunk[];
      try {
        let searchQuestion = request.question;
        if (
          options.history?.length &&
          shouldResolveResumeChatReference(request.question)
        ) {
          stage = 'query-rewrite';
          stageStartedAt = performance.now();
          searchQuestion = (
            await this.chatProvider.answer({
              channel,
              task: 'rewrite-query',
              question: request.question,
              locale: request.locale,
              history: options.history,
              contexts: [],
            })
          ).trim();
          if (!searchQuestion || searchQuestion.length > 1000)
            throw new Error('Invalid contextual search query');
          this.logger.log({
            event: 'chat.provider',
            ...logContext,
            provider: this.chatProvider.constructor.name,
            task: 'rewrite-query',
            durationMs: performance.now() - stageStartedAt,
          });
        }
        stage = 'retrieval';
        stageStartedAt = performance.now();
        chunks = await this.retriever.retrieve({
          channel,
          question: searchQuestion,
          locale: request.locale,
          ...(request.resumeKey ? { resumeKey: request.resumeKey } : {}),
        });
        let remaining = 16_000;
        chunks = chunks
          .map((chunk) => {
            if (
              typeof chunk.citationMetadata.factId === 'string' &&
              chunk.content.length > remaining
            )
              return { ...chunk, content: '' };
            const content = chunk.content.slice(
              0,
              Math.min(RESUME_RAG_RETRIEVED_CHUNK_MAX_CHARS, remaining),
            );
            remaining -= content.length;
            return { ...chunk, content };
          })
          .filter((chunk) => chunk.content.length > 0);
        this.logger.log({
          event: 'chat.retrieval',
          ...logContext,
          sourceCount: chunks.length,
          contextCharacters: 16_000 - remaining,
          durationMs: performance.now() - stageStartedAt,
        });
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new ServiceUnavailableException(
          error instanceof Error ? error.message : String(error),
        );
      }

      if (chunks.length === 0) {
        this.logger.log({
          event: 'chat.answer',
          ...logContext,
          outcome: 'no-evidence',
          grounded: false,
          sourceCount: 0,
          durationMs: performance.now() - startedAt,
        });
        return {
          answer: getChatNoEvidenceAnswer(request.locale, channel),
          grounded: false,
          sources: [],
        };
      }

      try {
        stage = 'answer';
        stageStartedAt = performance.now();
        const answer = await this.chatProvider.answer({
          channel,
          question: request.question,
          locale: request.locale,
          contexts: chunks,
          ...(options.history?.length ? { history: options.history } : {}),
        });

        this.logger.log({
          event: 'chat.answer',
          ...logContext,
          outcome: 'completed',
          provider: this.chatProvider.constructor.name,
          grounded: true,
          sourceCount: chunks.length,
          answerLength: answer.length,
          providerDurationMs: performance.now() - stageStartedAt,
          durationMs: performance.now() - startedAt,
        });
        return {
          answer,
          grounded: true,
          sources: chunks.map(toSource),
        };
      } catch (error) {
        throw new ServiceUnavailableException(
          error instanceof Error ? error.message : String(error),
        );
      }
    } catch (error) {
      this.logger.error({
        event: 'chat.answer',
        ...logContext,
        outcome: 'failed',
        provider: this.chatProvider.constructor.name,
        stage,
        stageDurationMs: performance.now() - stageStartedAt,
        durationMs: performance.now() - startedAt,
      });
      throw error;
    }
  }
}
