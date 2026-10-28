import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ResumeRagService } from './resume-rag.service';
import type { ChatProvider } from './ai/chat-provider';
import type { ResumeRagRetrieverService } from './resume-rag-retriever.service';
import type { ResumeRagChatLogService } from './resume-rag-chat-log.service';

const numberMatcher: unknown = expect.any(Number);
let logSpy: jest.SpiedFunction<Logger['log']>;
let errorSpy: jest.SpiedFunction<Logger['error']>;

const createChatLogService = () => {
  const recordQuestion = jest.fn().mockResolvedValue(undefined);

  return {
    chatLogService: { recordQuestion } as unknown as ResumeRagChatLogService,
    recordQuestion,
  };
};

beforeEach(() => {
  logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
});

afterEach(() => jest.restoreAllMocks());

describe('ResumeRagService', () => {
  it('searches every question and recommends related topics when no evidence is found', async () => {
    const retrieve = jest.fn().mockResolvedValue([]);
    const retriever = {
      assertSelection: jest.fn().mockResolvedValue(undefined),
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
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'chat.answer',
        channel: 'resume',
        outcome: 'no-evidence',
        grounded: false,
        sourceCount: 0,
        durationMs: numberMatcher,
      }),
    );
  });

  it('can answer without recording a question for a memory-only chat surface', async () => {
    const retrieve = jest.fn().mockResolvedValue([]);
    const chatProvider = { answer: jest.fn() } as unknown as ChatProvider;
    const { chatLogService, recordQuestion } = createChatLogService();
    const service = new ResumeRagService(
      {
        retrieve,
        assertSelection: jest.fn().mockResolvedValue(undefined),
      } as unknown as ResumeRagRetrieverService,
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
      assertSelection: jest.fn().mockResolvedValue(undefined),
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
      assertSelection: jest.fn().mockResolvedValue(undefined),
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
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'chat.retrieval',
        sourceCount: 1,
        contextCharacters: '근거 내용'.length,
      }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'chat.answer',
        outcome: 'completed',
        grounded: true,
        sourceCount: 1,
        providerDurationMs: numberMatcher,
      }),
    );
    expect(JSON.stringify(logSpy.mock.calls)).not.toMatch(
      /Oprimed에서 맡은 업무 질문|근거 내용|근거 기반 답변|docs\/source.md/,
    );
  });

  it.each(['question-log', 'query-rewrite', 'retrieval', 'answer'])(
    '%s 실패 단계만 기록하고 질문과 공급자 오류 내용은 남기지 않는다',
    async (stage) => {
      const error = new Error('private-provider-secret');
      const retrieve = jest.fn().mockResolvedValue([
        {
          id: 'private-source-id',
          content: 'private-context',
          title: 'Private Source',
          sourcePath: 'private-path',
          sourceKey: 'private-key',
          citationMetadata: {},
          similarity: 0.9,
        },
      ]);
      const answer = jest.fn().mockRejectedValue(error);
      const { chatLogService, recordQuestion } = createChatLogService();
      if (stage === 'question-log') recordQuestion.mockRejectedValue(error);
      if (stage === 'retrieval') retrieve.mockRejectedValue(error);
      const service = new ResumeRagService(
        {
          retrieve,
          assertSelection: jest.fn().mockResolvedValue(undefined),
        } as unknown as ResumeRagRetrieverService,
        { answer },
        chatLogService,
      );

      const result = service.answer(
        { question: '거기서 맡은 역할은? private-question', locale: 'ko-KR' },
        {
          history:
            stage === 'query-rewrite'
              ? [{ role: 'user', content: 'private-history' }]
              : undefined,
        },
      );

      if (stage === 'question-log') await expect(result).rejects.toBe(error);
      else
        await expect(result).rejects.toBeInstanceOf(
          ServiceUnavailableException,
        );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'chat.answer',
          channel: 'resume',
          outcome: 'failed',
          stage,
          stageDurationMs: numberMatcher,
          durationMs: numberMatcher,
        }),
      );
      expect(JSON.stringify(errorSpy.mock.calls)).not.toMatch(/private-/);
    },
  );

  it('surfaces missing chat model setup as service unavailable', async () => {
    const retriever = {
      assertSelection: jest.fn().mockResolvedValue(undefined),
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
        {
          retrieve,
          assertSelection: jest.fn().mockResolvedValue(undefined),
        } as unknown as ResumeRagRetrieverService,
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
      {
        retrieve,
        assertSelection: jest.fn().mockResolvedValue(undefined),
      } as unknown as ResumeRagRetrieverService,
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
      {
        retrieve,
        assertSelection: jest.fn().mockResolvedValue(undefined),
      } as unknown as ResumeRagRetrieverService,
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
        {
          retrieve,
          assertSelection: jest.fn().mockResolvedValue(undefined),
        } as unknown as ResumeRagRetrieverService,
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

describe('독립 사실의 맥락 경계', () => {
  it('전체 context 예산에 못 들어가는 사실은 표현 한계를 자르지 않고 통째로 제외한다', async () => {
    const fact = `${'승인된 공개 사실 '.repeat(220)}\n\n측정 조건: 제한된 테스트 환경\n\n표현 한계: 전체 트래픽으로 일반화하지 않는다`;
    const contexts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => ({
      id: `fact-${index}`,
      title: '공개 사실',
      sourcePath: 'career-data',
      sourceKey: `fact-${index}`,
      content: fact,
      citationMetadata: { factId: `fact-${index}` },
      similarity: 0.9,
    }));
    const answer = jest.fn().mockResolvedValue('현재 공개 근거 답변');
    const service = new ResumeRagService(
      {
        assertSelection: jest.fn().mockResolvedValue(undefined),
        retrieve: jest.fn().mockResolvedValue(contexts),
      } as unknown as ResumeRagRetrieverService,
      { answer },
      createChatLogService().chatLogService,
    );
    await service.answer({
      question: '공개 사실의 측정 조건은?',
      locale: 'ko-KR',
      resumeKey: 'fe',
    });
    const calls = answer.mock.calls as Array<
      [{ contexts: { content: string }[] }]
    >;
    const provided = calls[0][0].contexts;
    expect(provided.length).toBeGreaterThan(0);
    expect(provided.length).toBeLessThan(contexts.length);
    expect(provided.every((context) => context.content === fact)).toBe(true);
    expect(
      provided.every(
        (context) =>
          context.content.includes('측정 조건: 제한된 테스트 환경') &&
          context.content.includes(
            '표현 한계: 전체 트래픽으로 일반화하지 않는다',
          ),
      ),
    ).toBe(true);
    expect(
      provided.reduce((length, context) => length + context.content.length, 0),
    ).toBeLessThanOrEqual(16000);
  });
});
