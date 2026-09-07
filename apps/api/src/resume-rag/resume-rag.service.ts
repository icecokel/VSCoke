import {
  shouldResolveResumeChatReference,
  type ResumeChatHistoryMessage,
} from './resume-chat-history';
import {
  Inject,
  Injectable,
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
import { getResumeRagNoEvidenceAnswer } from './resume-rag-keyword-gate';

type AnswerRequest = {
  question: string;
  locale: string;
};

type AnswerOptions = {
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
      : undefined,
  caveats: toStringArray(chunk.citationMetadata.caveats),
  excerpt: chunk.content.slice(0, 240),
  similarity: Number(chunk.similarity),
});

@Injectable()
export class ResumeRagService {
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
    if (options.recordQuestion !== false) {
      await this.chatLogService.recordQuestion(
        request.question,
        request.locale,
      );
    }

    let chunks: RetrievedResumeChunk[];
    try {
      let searchQuestion = request.question;
      if (
        options.history?.length &&
        shouldResolveResumeChatReference(request.question)
      ) {
        searchQuestion = (
          await this.chatProvider.answer({
            task: 'rewrite-query',
            question: request.question,
            locale: request.locale,
            history: options.history,
            contexts: [],
          })
        ).trim();
        if (!searchQuestion || searchQuestion.length > 1000)
          throw new Error('Invalid contextual search query');
      }
      chunks = await this.retriever.retrieve({
        question: searchQuestion,
        locale: request.locale,
      });
      let remaining = 16_000;
      chunks = chunks
        .map((chunk) => {
          const content = chunk.content.slice(0, Math.min(4000, remaining));
          remaining -= content.length;
          return { ...chunk, content };
        })
        .filter((chunk) => chunk.content.length > 0);
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : String(error),
      );
    }

    if (chunks.length === 0) {
      return {
        answer: getResumeRagNoEvidenceAnswer(request.locale),
        grounded: false,
        sources: [],
      };
    }

    try {
      const answer = await this.chatProvider.answer({
        question: request.question,
        locale: request.locale,
        contexts: chunks,
        ...(options.history?.length ? { history: options.history } : {}),
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
  }
}
