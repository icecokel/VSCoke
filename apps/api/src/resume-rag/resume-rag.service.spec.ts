import { ServiceUnavailableException } from '@nestjs/common';
import { ResumeRagService } from './resume-rag.service';
import type { ChatProvider } from './ai/chat-provider';
import type { ResumeRagRetrieverService } from './resume-rag-retriever.service';
import type { ResumeRagChatLogService } from './resume-rag-chat-log.service';

const createChatLogService = () => {
  const recordQuestion = jest.fn().mockResolvedValue(undefined);

  return {
    chatLogService: { recordQuestion } as unknown as ResumeRagChatLogService,
    recordQuestion,
  };
};

describe('ResumeRagService', () => {
  it('searches every question and recommends related topics when no evidence is found', async () => {
    const retrieve = jest.fn().mockResolvedValue([]);
    const retriever = {
      retrieve,
    } as unknown as ResumeRagRetrieverService;
    const answer = jest.fn();
    const chatProvider = {
      answer,
    } as unknown as ChatProvider;

    const { chatLogService, recordQuestion } = createChatLogService();
    const service = new ResumeRagService(
      retriever,
      chatProvider,
      chatLogService,
    );

    await expect(
      service.answer({ question: '오늘 날씨 어때?', locale: 'ko-KR' }),
    ).resolves.toEqual({
      answer:
        '이 질문은 제 이력 범위를 벗어난 것 같아요. 프로젝트, 기술 경험, 업무 성과, 강점처럼 이력과 관련된 내용으로 다시 물어봐 주세요.\n\n추천 키워드: Oprimed, 의료 도메인, CI/CD와 배포, 프론트엔드 강점',
      grounded: false,
      sources: [],
    });
    expect(retrieve).toHaveBeenCalledWith({
      question: '오늘 날씨 어때?',
      locale: 'ko-KR',
    });
    expect(answer).not.toHaveBeenCalled();
    expect(recordQuestion).toHaveBeenCalledWith('오늘 날씨 어때?', 'ko-KR');
  });

  it('can answer without recording a question for a memory-only chat surface', async () => {
    const retrieve = jest.fn().mockResolvedValue([]);
    const chatProvider = { answer: jest.fn() } as unknown as ChatProvider;
    const { chatLogService, recordQuestion } = createChatLogService();
    const service = new ResumeRagService(
      { retrieve } as unknown as ResumeRagRetrieverService,
      chatProvider,
      chatLogService,
    );

    await service.answer(
      { question: '오늘 날씨 어때?', locale: 'ko-KR' },
      { recordQuestion: false },
    );

    expect(recordQuestion).not.toHaveBeenCalled();
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
      createChatLogService().chatLogService,
    );

    await expect(
      service.answer({ question: 'Oprimed에 없는 내용?', locale: 'ko-KR' }),
    ).resolves.toEqual({
      answer:
        '이 질문은 제 이력 범위를 벗어난 것 같아요. 프로젝트, 기술 경험, 업무 성과, 강점처럼 이력과 관련된 내용으로 다시 물어봐 주세요.\n\n추천 키워드: Oprimed, 의료 도메인, CI/CD와 배포, 프론트엔드 강점',
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
      createChatLogService().chatLogService,
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
      createChatLogService().chatLogService,
    );

    await expect(
      service.answer({ question: 'Oprimed 업무 질문', locale: 'ko-KR' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
