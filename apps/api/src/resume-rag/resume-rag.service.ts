import {
  shouldResolveResumeChatReference,
  type ResumeChatHistoryMessage,
} from './resume-chat-history';
import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ChatAnswer, ChatProvider } from './ai/chat-provider';
import { RESUME_RAG_CHAT_PROVIDER } from './ai/chat-provider';
import {
  ResumeRagRetrieverService,
  type RetrievedResumeChunk,
} from './resume-rag-retriever.service';
import type { ResumeRagChatResponseDto } from './dto/resume-rag-chat-response.dto';
import { ResumeRagChatLogService } from './resume-rag-chat-log.service';
import type { ResumeRagChatOutcome } from './entities/resume-rag-chat-log.entity';
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
  // false면 질문 원문 없이 결과만 기록한다. 저장 대화와 메인 채팅이 사용한다.
  recordQuestion?: boolean;
  history?: ResumeChatHistoryMessage[];
};

const toStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

// 검색 근거 예산(문자 수). 답변에 전달하는 청크 전체 길이의 상한이다.
const RESUME_RAG_CONTEXT_MAX_CHARS = 16_000;

// 모델이 돌려준 1부터 시작하는 reference 번호를 전달한 청크로 바꾼다. 범위 밖·중복 번호는
// 버리고 검색 순위 순서를 유지한다.
const selectUsedChunks = (
  chunks: RetrievedResumeChunk[],
  references: number[],
): RetrievedResumeChunk[] => {
  const used = new Set(
    references.filter(
      (reference) =>
        Number.isSafeInteger(reference) &&
        reference >= 1 &&
        reference <= chunks.length,
    ),
  );
  return chunks.filter((_, index) => used.has(index + 1));
};

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
      locale: request.locale,
      questionLength: request.question.length,
      historyMessageCount: options.history?.length ?? 0,
    };
    let stage = 'selection';
    let stageStartedAt = startedAt;
    const record = (
      outcome: ResumeRagChatOutcome,
      sourceCount: number,
      durationMs: number,
      failureStage?: string,
    ) =>
      this.recordOutcome({
        ...(options.recordQuestion === false
          ? {}
          : { question: request.question }),
        locale: request.locale,
        channel,
        outcome,
        sourceCount,
        durationMs,
        failureStage,
      });
    const finish = async (
      outcome: Exclude<ResumeRagChatOutcome, 'rejected' | 'failed'>,
      response: ResumeRagChatResponseDto,
      details: Record<string, unknown> = {},
    ): Promise<ResumeRagChatResponseDto> => {
      const durationMs = performance.now() - startedAt;
      this.logger.log({
        event: 'chat.answer',
        ...logContext,
        outcome,
        grounded: response.grounded,
        sourceCount: response.sources.length,
        ...details,
        durationMs,
      });
      await record(outcome, response.sources.length, durationMs);
      return response;
    };

    try {
      if (channel === 'resume') await this.retriever.assertSelection(request);
      const simpleReply = getChatSimpleReply(
        request.question,
        request.locale,
        channel,
      );
      if (simpleReply) {
        return await finish('simple-reply', {
          answer: simpleReply,
          grounded: false,
          sources: [],
        });
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
            await this.chatProvider.rewriteQuery({
              channel,
              question: request.question,
              locale: request.locale,
              history: options.history,
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
        });
        let remaining = RESUME_RAG_CONTEXT_MAX_CHARS;
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
          contextCharacters: RESUME_RAG_CONTEXT_MAX_CHARS - remaining,
          durationMs: performance.now() - stageStartedAt,
        });
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new ServiceUnavailableException(
          error instanceof Error ? error.message : String(error),
        );
      }

      if (chunks.length === 0) {
        return await finish('no-evidence', {
          answer: getChatNoEvidenceAnswer(request.locale, channel),
          grounded: false,
          sources: [],
        });
      }

      stage = 'answer';
      stageStartedAt = performance.now();
      let generated: ChatAnswer;
      try {
        generated = await this.chatProvider.answer({
          channel,
          question: request.question,
          locale: request.locale,
          contexts: chunks,
          ...(options.history?.length ? { history: options.history } : {}),
        });
      } catch (error) {
        throw new ServiceUnavailableException(
          error instanceof Error ? error.message : String(error),
        );
      }
      const usedChunks = selectUsedChunks(chunks, generated.usedReferences);
      const grounded = generated.answerable && usedChunks.length > 0;
      // 근거가 없다고 판단한 답변도 모델 문장을 그대로 돌려준다. 요청 언어로 무엇이 공개 자료에
      // 없는지 설명하거나 되묻는 문장이 고정 안내문보다 정확하다. 출처와 grounded만 거둔다.
      return await finish(
        grounded ? 'answered' : 'no-evidence',
        {
          answer: generated.answer,
          grounded,
          sources: grounded ? usedChunks.map(toSource) : [],
        },
        {
          provider: this.chatProvider.constructor.name,
          answerLength: generated.answer.length,
          answerable: generated.answerable,
          retrievedSourceCount: chunks.length,
          usedReferenceCount: usedChunks.length,
          providerDurationMs: performance.now() - stageStartedAt,
        },
      );
    } catch (error) {
      // 4xx(선택한 이력서 없음 등)는 요청 거부로, 그 외는 장애로 구분해 집계한다.
      const outcome =
        error instanceof HttpException && error.getStatus() < 500
          ? 'rejected'
          : 'failed';
      const durationMs = performance.now() - startedAt;
      const failure = {
        event: 'chat.answer',
        ...logContext,
        outcome,
        provider: this.chatProvider.constructor.name,
        stage,
        stageDurationMs: performance.now() - stageStartedAt,
        durationMs,
      };
      if (outcome === 'rejected') this.logger.warn(failure);
      else this.logger.error(failure);
      await record(outcome, 0, durationMs, stage);
      throw error;
    }
  }

  // 결과 기록 실패가 이미 만든 답변이나 원래 오류를 바꾸지 않게 한다.
  private async recordOutcome(
    entry: Parameters<ResumeRagChatLogService['recordOutcome']>[0],
  ): Promise<void> {
    try {
      await this.chatLogService.recordOutcome(entry);
    } catch {
      this.logger.warn({
        event: 'chat.log',
        outcome: 'failed',
        channel: entry.channel,
        chatOutcome: entry.outcome,
      });
    }
  }
}
