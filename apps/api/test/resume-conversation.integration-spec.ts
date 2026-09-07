import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { In } from 'typeorm';
import testDataSource from '../src/test-data-source';
import type { CreateResumeConversationDto } from '../src/resume-rag/dto/resume-conversation.dto';
import { ResumeChatConversation } from '../src/resume-rag/entities/resume-chat-conversation.entity';
import { ResumeChatTurn } from '../src/resume-rag/entities/resume-chat-turn.entity';
import {
  RESUME_CHAT_HISTORY_TURNS,
  RESUME_CHAT_STORED_TURNS,
} from '../src/resume-rag/resume-chat-history';
import { ResumeConversationService } from '../src/resume-rag/resume-conversation.service';

const answer = {
  answer: 'PostgreSQL 통합 검증 답변',
  grounded: true,
  sources: [],
};

const createConcurrentGenerator = () => {
  let release: (() => void) | undefined;
  return jest.fn(async () => {
    if (release) {
      release();
    } else {
      await new Promise<void>((resolve, reject) => {
        // 한 요청이 생성 단계 전에 실패해도 다른 요청을 무한히 대기시키지 않는다.
        const timeout = setTimeout(
          () => reject(new Error('동시 생성 진입 제한 시간 초과')),
          2_000,
        );
        release = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    }
    return answer;
  });
};

describe('ResumeConversationService PostgreSQL integration', () => {
  let service: ResumeConversationService;
  const conversationIds = new Set<string>();
  const createService = () =>
    new ResumeConversationService(
      testDataSource.getRepository(ResumeChatConversation),
      testDataSource.getRepository(ResumeChatTurn),
    );
  const createConversation = async (
    request: CreateResumeConversationDto = {
      channel: 'resume',
      locale: 'ko-KR',
    },
  ) => {
    const access = await service.create(request);
    conversationIds.add(access.id);
    return access;
  };
  const cleanupConversations = async (): Promise<void> => {
    if (!testDataSource.isInitialized || conversationIds.size === 0) return;
    // 이 테스트에서 만든 대화만 삭제하고 DB의 ON DELETE CASCADE를 사용한다.
    await testDataSource.getRepository(ResumeChatConversation).delete({
      id: In([...conversationIds]),
    });
    conversationIds.clear();
  };

  beforeAll(async () => {
    await testDataSource.initialize();
    service = createService();
  });

  afterEach(cleanupConversations);

  afterAll(async () => {
    try {
      await cleanupConversations();
    } finally {
      if (testDataSource.isInitialized) await testDataSource.destroy();
    }
  });

  it('대화 맥락·재시도·접근키·CASCADE 삭제를 실제 제약으로 보장한다', async () => {
    const access = await createConversation();
    const request = {
      conversationId: access.id,
      requestId: randomUUID(),
      question: 'Oprimed 역할을 알려줘',
      locale: 'ko-KR',
    };
    const generate = jest.fn().mockResolvedValue(answer);

    const first = await service.runTurn(
      request,
      access.token,
      'resume',
      generate,
    );
    expect(
      await service.runTurn(request, access.token, 'resume', generate),
    ).toEqual(first);
    expect(generate).toHaveBeenCalledTimes(1);

    const follow = jest.fn().mockResolvedValue(answer);
    await service.runTurn(
      {
        ...request,
        requestId: randomUUID(),
        question: '그 프로젝트의 성과는?',
      },
      access.token,
      'resume',
      follow,
    );
    expect(follow).toHaveBeenCalledWith(
      [
        { role: 'user', content: request.question },
        { role: 'assistant', content: answer.answer },
      ],
      '그 프로젝트의 성과는?',
    );
    await expect(service.history(access.id, 'b'.repeat(64))).rejects.toThrow(
      NotFoundException,
    );
    expect((await service.history(access.id, access.token)).turns).toHaveLength(
      2,
    );
    await service.remove(access.id, access.token);
    expect(
      await testDataSource.getRepository(ResumeChatTurn).count({
        where: { conversationId: access.id },
      }),
    ).toBe(0);
    await expect(service.history(access.id, access.token)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('동시에 같은 버전에서 생성된 두 답변 중 하나만 저장한다', async () => {
    const access = await createConversation({
      channel: 'main',
      locale: 'ko-KR',
    });
    const generate = createConcurrentGenerator();
    const results = await Promise.allSettled(
      [1, 2].map((index) =>
        service.runTurn(
          {
            conversationId: access.id,
            requestId: randomUUID(),
            question: `동시 요청 ${index}`,
            locale: 'ko-KR',
          },
          access.token,
          'main',
          generate,
        ),
      ),
    );

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status).toBe('rejected');
    if (rejected?.status === 'rejected') {
      expect(rejected.reason).toBeInstanceOf(ConflictException);
    }
    expect((await service.history(access.id, access.token)).turns).toHaveLength(
      1,
    );
    expect(
      await testDataSource
        .getRepository(ResumeChatConversation)
        .findOneByOrFail({ id: access.id }),
    ).toMatchObject({ version: 1 });
  });

  it('같은 요청의 동시 재시도는 같은 저장 답변을 반환하고 버전을 한 번만 올린다', async () => {
    const access = await createConversation();
    const request = {
      conversationId: access.id,
      requestId: randomUUID(),
      question: '동일한 요청',
      locale: 'ko-KR',
    };
    const generate = createConcurrentGenerator();
    const responses = await Promise.all([
      service.runTurn(request, access.token, 'resume', generate),
      service.runTurn(request, access.token, 'resume', generate),
    ]);
    expect(responses[0]).toEqual(responses[1]);
    expect((await service.history(access.id, access.token)).turns).toHaveLength(
      1,
    );
    expect(
      await testDataSource
        .getRepository(ResumeChatConversation)
        .findOneByOrFail({ id: access.id }),
    ).toMatchObject({ version: 1 });
  });

  it('기존 요청 ID를 다른 질문에 재사용하면 추가 생성 없이 거부한다', async () => {
    const access = await createConversation();
    const request = {
      conversationId: access.id,
      requestId: randomUUID(),
      question: '첫 질문',
      locale: 'ko-KR',
    };
    const generate = jest.fn().mockResolvedValue(answer);
    await service.runTurn(request, access.token, 'resume', generate);
    await expect(
      service.runTurn(
        { ...request, question: '다른 질문' },
        access.token,
        'resume',
        generate,
      ),
    ).rejects.toThrow(ConflictException);
    expect(generate).toHaveBeenCalledTimes(1);
    expect((await service.history(access.id, access.token)).turns).toHaveLength(
      1,
    );
  });

  it.each([
    { channel: 'main' as const, locale: 'ko-KR' },
    { channel: 'resume' as const, locale: 'en-US' },
  ])(
    '다른 채널·언어 요청 $channel/$locale은 생성 전에 거부한다',
    async ({ channel, locale }) => {
      const access = await createConversation();
      const generate = jest.fn().mockResolvedValue(answer);
      await expect(
        service.runTurn(
          {
            conversationId: access.id,
            requestId: randomUUID(),
            question: '경계 검증',
            locale,
          },
          access.token,
          channel,
          generate,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(generate).not.toHaveBeenCalled();
      expect(
        (await service.history(access.id, access.token)).turns,
      ).toHaveLength(0);
    },
  );

  it('DB 재연결과 서비스 재생성 후 기록·접근키·후속 맥락을 복원한다', async () => {
    const access = await createConversation();
    const request = {
      conversationId: access.id,
      requestId: randomUUID(),
      question: '저장된 프로젝트 질문',
      locale: 'ko-KR',
    };
    await service.runTurn(request, access.token, 'resume', () =>
      Promise.resolve(answer),
    );
    const stored = await testDataSource
      .getRepository(ResumeChatConversation)
      .findOneByOrFail({ id: access.id });
    expect(stored.tokenHash).toBe(
      createHash('sha256').update(access.token).digest('hex'),
    );
    expect(stored.tokenHash).not.toBe(access.token);

    await testDataSource.destroy();
    await testDataSource.initialize();
    service = createService();

    expect((await service.history(access.id, access.token)).turns).toHaveLength(
      1,
    );
    const generate = jest.fn().mockResolvedValue(answer);
    await service.runTurn(
      {
        ...request,
        requestId: randomUUID(),
        question: '그 프로젝트의 결과는?',
      },
      access.token,
      'resume',
      generate,
    );
    expect(generate).toHaveBeenCalledWith(
      [
        { role: 'user', content: request.question },
        { role: 'assistant', content: answer.answer },
      ],
      '그 프로젝트의 결과는?',
    );
  });

  it('생성 실패는 기록·버전을 남기지 않고 같은 요청을 재시도할 수 있다', async () => {
    const access = await createConversation();
    const request = {
      conversationId: access.id,
      requestId: randomUUID(),
      question: '실패 후 재시도',
      locale: 'ko-KR',
    };
    await expect(
      service.runTurn(request, access.token, 'resume', () =>
        Promise.reject(new Error('provider unavailable')),
      ),
    ).rejects.toThrow('provider unavailable');
    expect((await service.history(access.id, access.token)).turns).toHaveLength(
      0,
    );
    expect(
      await testDataSource
        .getRepository(ResumeChatConversation)
        .findOneByOrFail({ id: access.id }),
    ).toMatchObject({ version: 0 });
    await service.runTurn(request, access.token, 'resume', () =>
      Promise.resolve(answer),
    );
    expect((await service.history(access.id, access.token)).turns).toHaveLength(
      1,
    );
  });

  it('빈 답변은 DB에 저장하지 않는다', async () => {
    const access = await createConversation();
    await expect(
      service.runTurn(
        {
          conversationId: access.id,
          requestId: randomUUID(),
          question: '빈 답변 검증',
          locale: 'ko-KR',
        },
        access.token,
        'resume',
        () => Promise.resolve({ ...answer, answer: ' ' }),
      ),
    ).rejects.toThrow(ServiceUnavailableException);
    expect((await service.history(access.id, access.token)).turns).toHaveLength(
      0,
    );
  });

  it('최근 50턴만 저장하고 모델에는 최근 6턴만 순서대로 전달한다', async () => {
    const access = await createConversation();
    const generate = jest.fn().mockResolvedValue(answer);
    for (let index = 0; index <= RESUME_CHAT_STORED_TURNS; index += 1) {
      await service.runTurn(
        {
          conversationId: access.id,
          requestId: randomUUID(),
          question: `질문 ${index}`,
          locale: 'ko-KR',
        },
        access.token,
        'resume',
        generate,
      );
    }
    const history = await service.history(access.id, access.token);
    expect(history.turns.map((turn) => turn.question)).toEqual(
      Array.from(
        { length: RESUME_CHAT_STORED_TURNS },
        (_, index) => `질문 ${index + 1}`,
      ),
    );
    const expectedHistory = Array.from(
      { length: RESUME_CHAT_HISTORY_TURNS },
      (_, index) => [
        {
          role: 'user',
          content: `질문 ${RESUME_CHAT_STORED_TURNS - RESUME_CHAT_HISTORY_TURNS + index}`,
        },
        { role: 'assistant', content: answer.answer },
      ],
    ).flat();
    expect(generate).toHaveBeenLastCalledWith(
      expectedHistory,
      `질문 ${RESUME_CHAT_STORED_TURNS}`,
    );
    expect(
      await testDataSource
        .getRepository(ResumeChatTurn)
        .count({ where: { conversationId: access.id } }),
    ).toBe(RESUME_CHAT_STORED_TURNS);
  });

  it('생성 중 삭제된 대화에는 뒤늦은 답변을 저장하지 않는다', async () => {
    const access = await createConversation();
    await expect(
      service.runTurn(
        {
          conversationId: access.id,
          requestId: randomUUID(),
          question: '삭제 경합',
          locale: 'ko-KR',
        },
        access.token,
        'resume',
        async () => {
          await service.remove(access.id, access.token);
          return answer;
        },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(
      await testDataSource
        .getRepository(ResumeChatTurn)
        .count({ where: { conversationId: access.id } }),
    ).toBe(0);
  });

  it('만료된 대화는 접근을 막고 정리 시 턴까지 삭제한다', async () => {
    const access = await createConversation();
    await service.runTurn(
      {
        conversationId: access.id,
        requestId: randomUUID(),
        question: '만료 검증 질문',
        locale: 'ko-KR',
      },
      access.token,
      'resume',
      () => Promise.resolve(answer),
    );
    await testDataSource
      .getRepository(ResumeChatConversation)
      .update(access.id, {
        expiresAt: new Date(Date.now() - 1_000),
      });
    await expect(service.history(access.id, access.token)).rejects.toThrow(
      NotFoundException,
    );
    await service.purgeExpired();
    expect(
      await testDataSource
        .getRepository(ResumeChatConversation)
        .count({ where: { id: access.id } }),
    ).toBe(0);
    expect(
      await testDataSource
        .getRepository(ResumeChatTurn)
        .count({ where: { conversationId: access.id } }),
    ).toBe(0);
  });
});
