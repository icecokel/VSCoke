import { ServiceUnavailableException } from '@nestjs/common';
import { ResumeRagService } from './resume-rag.service';
import type { ChatProvider } from './ai/chat-provider';
import type { ResumeRagRetrieverService } from './resume-rag-retriever.service';
import type { ResumeRagKeywordService } from './resume-rag-keyword.service';

const createKeywordService = (inScope = true): ResumeRagKeywordService =>
  ({
    isQuestionInScope: jest.fn().mockResolvedValue(inScope),
  }) as unknown as ResumeRagKeywordService;

describe('ResumeRagService', () => {
  it('returns a fixed out-of-scope message without retrieving or calling AI', async () => {
    const retrieve = jest.fn();
    const retriever = {
      retrieve,
    } as unknown as ResumeRagRetrieverService;
    const answer = jest.fn();
    const chatProvider = {
      answer,
    } as unknown as ChatProvider;

    const isQuestionInScope = jest.fn().mockResolvedValue(false);
    const keywordService = {
      isQuestionInScope,
    } as unknown as ResumeRagKeywordService;
    const service = new ResumeRagService(
      retriever,
      chatProvider,
      keywordService,
    );

    await expect(
      service.answer({ question: '오늘 날씨 어때?', locale: 'ko-KR' }),
    ).resolves.toEqual({
      answer:
        '이 질문은 제 이력 범위를 벗어난 것 같아요. 프로젝트, 기술 경험, 업무 성과, 강점처럼 이력과 관련된 내용으로 다시 물어봐 주세요.',
      grounded: false,
      sources: [],
    });
    expect(retrieve).not.toHaveBeenCalled();
    expect(answer).not.toHaveBeenCalled();
    expect(isQuestionInScope).toHaveBeenCalledWith('오늘 날씨 어때?');
  });

  it('returns grounded false when no chunks are retrieved', async () => {
    const retriever = {
      retrieve: jest.fn().mockResolvedValue([]),
    } as unknown as ResumeRagRetrieverService;
    const answer = jest.fn();
    const chatProvider = {
      answer,
    } as unknown as ChatProvider;

    const service = new ResumeRagService(
      retriever,
      chatProvider,
      createKeywordService(),
    );

    await expect(
      service.answer({ question: 'Oprimed에 없는 내용?', locale: 'ko-KR' }),
    ).resolves.toEqual({
      answer: '검색된 이력 근거가 부족해 답변할 수 없습니다.',
      grounded: false,
      sources: [],
    });
    expect(answer).not.toHaveBeenCalled();
  });

  it('passes retrieved chunks to the chat provider and returns source citations', async () => {
    const retriever = {
      retrieve: jest.fn().mockResolvedValue([
        {
          id: 'chunk-1',
          content: '근거 내용',
          title: 'Source',
          sourcePath: 'docs/source.md',
          sourceKey: 'source#section',
          citationMetadata: { sectionPath: 'A', version: 'current' },
          similarity: 0.91,
        },
      ]),
    } as unknown as ResumeRagRetrieverService;
    const answer = jest.fn().mockResolvedValue('근거 기반 답변');
    const chatProvider: ChatProvider = { answer };

    const service = new ResumeRagService(
      retriever,
      chatProvider,
      createKeywordService(),
    );

    await expect(
      service.answer({
        question: 'Oprimed에서 맡은 업무 질문',
        locale: 'ko-KR',
      }),
    ).resolves.toEqual({
      answer: '근거 기반 답변',
      grounded: true,
      sources: [
        expect.objectContaining({
          title: 'Source',
          sourcePath: 'docs/source.md',
          sectionPath: 'A',
          similarity: 0.91,
        }),
      ],
    });
    expect(answer).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'Oprimed에서 맡은 업무 질문',
        contexts: [expect.objectContaining({ content: '근거 내용' })],
      }),
    );
  });

  it('surfaces missing chat model setup as service unavailable', async () => {
    const retriever = {
      retrieve: jest.fn().mockResolvedValue([
        {
          id: 'chunk-1',
          content: '근거 내용',
          title: 'Source',
          sourcePath: 'docs/source.md',
          sourceKey: 'source#section',
          citationMetadata: {},
          similarity: 0.91,
        },
      ]),
    } as unknown as ResumeRagRetrieverService;
    const chatProvider: ChatProvider = {
      answer: jest
        .fn()
        .mockRejectedValue(new Error('RAG_CHAT_PROVIDER missing')),
    };

    const service = new ResumeRagService(
      retriever,
      chatProvider,
      createKeywordService(),
    );

    await expect(
      service.answer({ question: 'Oprimed 업무 질문', locale: 'ko-KR' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
