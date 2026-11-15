import {
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ResumeRagService } from './resume-rag.service';
import type { ChatProvider } from './ai/chat-provider';
import type { ResumeRagRetrieverService } from './resume-rag-retriever.service';
import type { ResumeRagChatLogService } from './resume-rag-chat-log.service';

const numberMatcher: unknown = expect.any(Number);
let logSpy: jest.SpiedFunction<Logger['log']>;
let errorSpy: jest.SpiedFunction<Logger['error']>;
let warnSpy: jest.SpiedFunction<Logger['warn']>;

const createChatLogService = () => {
  const recordOutcome = jest.fn<Promise<void>, [Record<string, unknown>]>();
  recordOutcome.mockResolvedValue(undefined);

  return {
    chatLogService: { recordOutcome } as unknown as ResumeRagChatLogService,
    recordOutcome,
  };
};

const createChatProvider = (
  overrides: Partial<Record<keyof ChatProvider, jest.Mock>> = {},
): ChatProvider => ({
  answer: overrides.answer ?? jest.fn(),
  rewriteQuery: overrides.rewriteQuery ?? jest.fn(),
});

const groundedAnswer = (answer: string, usedReferences = [1]) => ({
  answer,
  answerable: true,
  usedReferences,
});

beforeEach(() => {
  logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
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
    const chatProvider = createChatProvider({ answer });

    const { chatLogService, recordOutcome } = createChatLogService();
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
    expect(recordOutcome).toHaveBeenCalledTimes(1);
    expect(recordOutcome).toHaveBeenCalledWith({
      question: '오늘 날씨 어때?',
      locale: 'ko-KR',
      channel: 'resume',
      outcome: 'no-evidence',
      sourceCount: 0,
      durationMs: numberMatcher,
      failureStage: undefined,
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'chat.answer',
        channel: 'resume',
        locale: 'ko-KR',
        outcome: 'no-evidence',
        grounded: false,
        sourceCount: 0,
        durationMs: numberMatcher,
      }),
    );
  });

  it('records only the outcome without question text when the question is stored elsewhere', async () => {
    const retrieve = jest.fn().mockResolvedValue([]);
    const chatProvider = createChatProvider();
    const { chatLogService, recordOutcome } = createChatLogService();
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

    expect(recordOutcome).toHaveBeenCalledTimes(1);
    expect(recordOutcome).toHaveBeenCalledWith(
      expect.not.objectContaining({ question: expect.anything() as unknown }),
    );
    expect(recordOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'no-evidence', sourceCount: 0 }),
    );
  });

  it('keeps the answer when recording the outcome fails', async () => {
    const { chatLogService, recordOutcome } = createChatLogService();
    recordOutcome.mockRejectedValue(new Error('private-db-error'));
    const service = new ResumeRagService(
      {
        retrieve: jest.fn().mockResolvedValue([]),
        assertSelection: jest.fn().mockResolvedValue(undefined),
      } as unknown as ResumeRagRetrieverService,
      createChatProvider(),
      chatLogService,
    );

    await expect(
      service.answer({ question: '오늘 날씨 어때?', locale: 'ko-KR' }),
    ).resolves.toMatchObject({ grounded: false });
    expect(warnSpy).toHaveBeenCalledWith({
      event: 'chat.log',
      outcome: 'failed',
      channel: 'resume',
      chatOutcome: 'no-evidence',
    });
    expect(JSON.stringify(warnSpy.mock.calls)).not.toMatch(/private-|날씨/);
  });

  it('records a missing resume selection as rejected with its stage', async () => {
    const { chatLogService, recordOutcome } = createChatLogService();
    const retrieve = jest.fn();
    const service = new ResumeRagService(
      {
        retrieve,
        assertSelection: jest
          .fn()
          .mockRejectedValue(new NotFoundException('Resume not found')),
      } as unknown as ResumeRagRetrieverService,
      createChatProvider(),
      chatLogService,
    );

    await expect(
      service.answer({ question: '경력 알려줘', locale: 'ja-JP' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(retrieve).not.toHaveBeenCalled();
    expect(recordOutcome).toHaveBeenCalledWith({
      question: '경력 알려줘',
      locale: 'ja-JP',
      channel: 'resume',
      outcome: 'rejected',
      sourceCount: 0,
      durationMs: numberMatcher,
      failureStage: 'selection',
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'chat.answer',
        outcome: 'rejected',
        stage: 'selection',
      }),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns grounded false when no chunks are retrieved', async () => {
    const retriever = {
      assertSelection: jest.fn().mockResolvedValue(undefined),
      retrieve: jest.fn().mockResolvedValue([]),
    } as unknown as ResumeRagRetrieverService;
    const answer = jest.fn();
    const chatProvider = createChatProvider({ answer });

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
    const answer = jest
      .fn()
      .mockResolvedValue(groundedAnswer('근거 기반 답변'));
    const chatProvider = createChatProvider({ answer });
    const { chatLogService, recordOutcome } = createChatLogService();

    const service = new ResumeRagService(
      retriever,
      chatProvider,
      chatLogService,
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
        channel: 'resume',
        locale: 'ko-KR',
        outcome: 'answered',
        grounded: true,
        sourceCount: 1,
        providerDurationMs: numberMatcher,
        durationMs: numberMatcher,
      }),
    );
    expect(recordOutcome).toHaveBeenCalledTimes(1);
    expect(recordOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'answered', sourceCount: 1 }),
    );
    expect(JSON.stringify(logSpy.mock.calls)).not.toMatch(
      /Oprimed에서 맡은 업무 질문|근거 내용|근거 기반 답변|docs\/source.md/,
    );
  });

  it.each(['query-rewrite', 'retrieval', 'answer'])(
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
      const { chatLogService, recordOutcome } = createChatLogService();
      if (stage === 'retrieval') retrieve.mockRejectedValue(error);
      const service = new ResumeRagService(
        {
          retrieve,
          assertSelection: jest.fn().mockResolvedValue(undefined),
        } as unknown as ResumeRagRetrieverService,
        createChatProvider({ answer, rewriteQuery: answer }),
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

      await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
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
      expect(recordOutcome).toHaveBeenCalledTimes(1);
      expect(recordOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'failed',
          sourceCount: 0,
          failureStage: stage,
        }),
      );
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
    const chatProvider = createChatProvider({
      answer: jest
        .fn()
        .mockRejectedValue(new Error('RAG_CHAT_PROVIDER missing')),
    });

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
      const rewriteQuery = jest
        .fn()
        .mockResolvedValue('Oprimed 프로젝트의 담당 역할');
      const answer = jest
        .fn()
        .mockResolvedValue(groundedAnswer('새 근거를 따른 역할 설명'));
      const service = new ResumeRagService(
        {
          retrieve,
          assertSelection: jest.fn().mockResolvedValue(undefined),
        } as unknown as ResumeRagRetrieverService,
        createChatProvider({ answer, rewriteQuery }),
        createChatLogService().chatLogService,
      );
      const result = await service.answer(
        { question: '거기서 맡은 역할은?', locale: 'ko-KR' },
        { channel, history },
      );
      expect(rewriteQuery).toHaveBeenCalledWith({
        channel,
        question: '거기서 맡은 역할은?',
        locale: 'ko-KR',
        history,
      });
      expect(retrieve).toHaveBeenCalledWith({
        channel,
        question: 'Oprimed 프로젝트의 담당 역할',
        locale: 'ko-KR',
      });
      expect(answer).toHaveBeenCalledWith({
        channel,
        question: '거기서 맡은 역할은?',
        locale: 'ko-KR',
        history,
        contexts,
      });
      expect(result).toMatchObject({
        answer: '새 근거를 따른 역할 설명',
        grounded: true,
        sources: [expect.objectContaining({ sourceKey: 'role' })],
      });
    },
  );
  it('이전 답변이 있어도 새로운 근거가 없으면 경력 답변을 생성하지 않는다', async () => {
    const retrieve = jest.fn().mockResolvedValue([]);
    const answer = jest
      .fn()
      .mockResolvedValue(groundedAnswer('Oprimed의 공개되지 않은 수치'));
    const service = new ResumeRagService(
      {
        retrieve,
        assertSelection: jest.fn().mockResolvedValue(undefined),
      } as unknown as ResumeRagRetrieverService,
      createChatProvider({ answer }),
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
      createChatProvider({ answer }),
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
        createChatProvider({ answer }),
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
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'chat.answer',
          channel,
          outcome: 'simple-reply',
          sourceCount: 0,
        }),
      );
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
    const answer = jest
      .fn()
      .mockResolvedValue(groundedAnswer('현재 공개 근거 답변'));
    const service = new ResumeRagService(
      {
        assertSelection: jest.fn().mockResolvedValue(undefined),
        retrieve: jest.fn().mockResolvedValue(contexts),
      } as unknown as ResumeRagRetrieverService,
      createChatProvider({ answer }),
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

describe('모델 판단에 따른 근거 표시', () => {
  const contexts = ['first', 'second', 'third'].map((key, index) => ({
    id: key,
    title: `Source ${key}`,
    content: `${key} 근거`,
    sourcePath: `${key}.md`,
    sourceKey: `source/${key}`,
    citationMetadata: {},
    similarity: 0.9 - index / 10,
  }));
  const createService = (generated: unknown) => {
    const { chatLogService, recordOutcome } = createChatLogService();
    const answer = jest.fn().mockResolvedValue(generated);
    const service = new ResumeRagService(
      {
        assertSelection: jest.fn().mockResolvedValue(undefined),
        retrieve: jest.fn().mockResolvedValue(contexts),
      } as unknown as ResumeRagRetrieverService,
      createChatProvider({ answer }),
      chatLogService,
    );
    return { service, recordOutcome, answer };
  };

  it('모델이 사용한 reference의 청크만 검색 순위대로 출처로 돌려준다', async () => {
    const { service, recordOutcome, answer } = createService({
      answer: '세 번째와 첫 번째 근거 답변',
      answerable: true,
      usedReferences: [3, 1, 3, 0, 4, -1],
    });

    const result = await service.answer({
      question: '사용한 근거만 보여줘',
      locale: 'en-US',
    });

    expect(answer).toHaveBeenCalledWith(
      expect.objectContaining({ contexts, locale: 'en-US' }),
    );
    expect(result.grounded).toBe(true);
    expect(result.sources.map((source) => source.sourceKey)).toEqual([
      'source/first',
      'source/third',
    ]);
    expect(recordOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'answered', sourceCount: 2 }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'chat.answer',
        outcome: 'answered',
        grounded: true,
        sourceCount: 2,
        retrievedSourceCount: 3,
        usedReferenceCount: 2,
        answerable: true,
      }),
    );
  });

  it.each([
    ['답할 수 없다고 판단한 답변', { answerable: false, usedReferences: [] }],
    [
      '답할 수 없다면서 근거 번호를 낸 답변',
      { answerable: false, usedReferences: [1, 2] },
    ],
    [
      '답할 수 있다면서 근거 번호가 없는 답변',
      { answerable: true, usedReferences: [] },
    ],
    [
      '범위 밖 근거 번호만 낸 답변',
      { answerable: true, usedReferences: [0, 4, 99] },
    ],
  ])(
    '%s은 모델 문장을 유지하되 근거 없음으로 기록하고 출처를 비운다',
    async (_, judgement) => {
      const modelAnswer =
        'The public material available to this chat does not cover that question.';
      const { service, recordOutcome } = createService({
        answer: modelAnswer,
        ...judgement,
      });

      await expect(
        service.answer({
          question: 'What is your favorite food?',
          locale: 'en-US',
        }),
      ).resolves.toEqual({ answer: modelAnswer, grounded: false, sources: [] });
      expect(recordOutcome).toHaveBeenCalledTimes(1);
      expect(recordOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'no-evidence',
          sourceCount: 0,
          failureStage: undefined,
        }),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'chat.answer',
          outcome: 'no-evidence',
          grounded: false,
          sourceCount: 0,
          retrievedSourceCount: 3,
        }),
      );
      expect(JSON.stringify(logSpy.mock.calls)).not.toContain(modelAnswer);
    },
  );
});
