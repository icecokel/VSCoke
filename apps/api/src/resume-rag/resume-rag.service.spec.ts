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
        '이 채팅의 공개 자료에서 질문에 답할 근거를 찾지 못했어요. 경력과 담당 업무, 기술 경험, 업무 성과와 강점에 대해 물어봐 주세요.',
      grounded: false,
      sources: [],
    });
    expect(retrieve).toHaveBeenCalledWith({
      channel: 'resume',
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
        '이 채팅의 공개 자료에서 질문에 답할 근거를 찾지 못했어요. 경력과 담당 업무, 기술 경험, 업무 성과와 강점에 대해 물어봐 주세요.',
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

describe('ResumeRagService conversational retrieval', () => {
  const history = [
    { role: 'user' as const, content: 'Oprimed 프로젝트를 설명해줘' },
    { role: 'assistant' as const, content: 'Oprimed 의료 프로젝트 설명' },
  ];
  it.each(['main', 'resume'] as const)(
    '%s 이전 맥락으로 재작성해 같은 채널의 새 근거로 답변한다',
    async (channel) => {
      const contexts = [
        {
          id: '1',
          title: '역할',
          content: '공개 역할 근거',
          sourcePath: 'role.md',
          sourceKey: 'role',
          citationMetadata: {},
          similarity: 0.9,
        },
      ];
      const retrieve = jest.fn().mockResolvedValue(contexts);
      const answer = jest
        .fn()
        .mockResolvedValueOnce('Oprimed 프로젝트의 담당 역할')
        .mockResolvedValueOnce('새 근거를 따른 역할 설명');
      const service = new ResumeRagService(
        { retrieve } as unknown as ResumeRagRetrieverService,
        { answer },
        createChatLogService().chatLogService,
      );
      const result = await service.answer(
        { question: '거기서 맡은 역할은?', locale: 'ko-KR' },
        { channel, history },
      );
      expect(answer).toHaveBeenNthCalledWith(1, {
        channel,
        task: 'rewrite-query',
        question: '거기서 맡은 역할은?',
        locale: 'ko-KR',
        history,
        contexts: [],
      });
      expect(retrieve).toHaveBeenCalledWith({
        channel,
        question: 'Oprimed 프로젝트의 담당 역할',
        locale: 'ko-KR',
      });
      expect(answer).toHaveBeenNthCalledWith(2, {
        channel,
        question: '거기서 맡은 역할은?',
        locale: 'ko-KR',
        history,
        contexts,
      });
      expect(result.answer).toBe('새 근거를 따른 역할 설명');
    },
  );
  it('이전 답변이 있어도 새로운 근거가 없으면 경력 답변을 생성하지 않는다', async () => {
    const retrieve = jest.fn().mockResolvedValue([]);
    const answer = jest.fn().mockResolvedValue('Oprimed의 공개되지 않은 수치');
    const service = new ResumeRagService(
      { retrieve } as unknown as ResumeRagRetrieverService,
      { answer },
      createChatLogService().chatLogService,
    );
    const result = await service.answer(
      { question: '정확한 수치는?', locale: 'ko-KR' },
      { history },
    );
    expect(result.grounded).toBe(false);
    expect(answer).not.toHaveBeenCalled();
    expect(retrieve).toHaveBeenCalledWith({
      channel: 'resume',
      question: '정확한 수치는?',
      locale: 'ko-KR',
    });
  });

  it('명시적으로 새 주제로 전환하면 이전 대화로 검색어를 재작성하지 않는다', async () => {
    const retrieve = jest.fn().mockResolvedValue([]);
    const answer = jest.fn();
    const service = new ResumeRagService(
      { retrieve } as unknown as ResumeRagRetrieverService,
      { answer },
      createChatLogService().chatLogService,
    );
    const result = await service.answer(
      {
        question: '이제 주제를 바꿔서 내일 비트코인 가격을 알려줘',
        locale: 'ko-KR',
      },
      { history },
    );
    expect(result.grounded).toBe(false);
    expect(retrieve).toHaveBeenCalledWith({
      channel: 'resume',
      question: '이제 주제를 바꿔서 내일 비트코인 가격을 알려줘',
      locale: 'ko-KR',
    });
    expect(answer).not.toHaveBeenCalled();
  });
});

describe('공통 채팅 인사 처리', () => {
  it.each(['main', 'resume'] as const)(
    '%s 인사는 검색과 AI 호출 없이 처리한다',
    async (channel) => {
      const retrieve = jest.fn();
      const answer = jest.fn();
      const service = new ResumeRagService(
        { retrieve } as unknown as ResumeRagRetrieverService,
        { answer },
        createChatLogService().chatLogService,
      );
      const result = await service.answer(
        { question: '안녕하세요!', locale: 'ko-KR' },
        { channel },
      );
      expect(result).toMatchObject({ grounded: false, sources: [] });
      expect(result.answer).toContain(channel === 'main' ? '사이트' : '경력');
      expect(retrieve).not.toHaveBeenCalled();
      expect(answer).not.toHaveBeenCalled();
    },
  );
});
