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

type AnswerRequest = {
  question: string;
  locale: string;
};

const FALLBACK_BY_LOCALE: Record<string, string> = {
  'ko-KR': '검색된 이력 근거가 부족해 답변할 수 없습니다.',
  'en-US': 'I do not have enough retrieved resume evidence to answer.',
  'ja-JP': '検索された履歴根拠が不足しているため回答できません。',
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
  ) {}

  async answer(request: AnswerRequest): Promise<ResumeRagChatResponseDto> {
    let chunks: RetrievedResumeChunk[];
    try {
      chunks = await this.retriever.retrieve(request);
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : String(error),
      );
    }

    if (chunks.length === 0) {
      return {
        answer:
          FALLBACK_BY_LOCALE[request.locale] ?? FALLBACK_BY_LOCALE['ko-KR'],
        grounded: false,
        sources: [],
      };
    }

    try {
      const answer = await this.chatProvider.answer({
        question: request.question,
        locale: request.locale,
        contexts: chunks,
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
