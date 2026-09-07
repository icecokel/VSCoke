import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import testDataSource from '../src/test-data-source';
import { ResumeChatConversation } from '../src/resume-rag/entities/resume-chat-conversation.entity';
import { ResumeChatTurn } from '../src/resume-rag/entities/resume-chat-turn.entity';
import { ResumeConversationService } from '../src/resume-rag/resume-conversation.service';

const answer = {
  answer: 'PostgreSQL 통합 검증 답변',
  grounded: true,
  sources: [],
};

describe('ResumeConversationService PostgreSQL integration', () => {
  let service: ResumeConversationService;

  beforeAll(async () => {
    await testDataSource.initialize();
    service = new ResumeConversationService(
      testDataSource.getRepository(ResumeChatConversation),
      testDataSource.getRepository(ResumeChatTurn),
    );
  });

  beforeEach(async () => {
    await testDataSource.getRepository(ResumeChatConversation).clear();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.getRepository(ResumeChatConversation).clear();
      await testDataSource.destroy();
    }
  });

  it('대화 맥락·재시도·접근키·CASCADE 삭제를 실제 제약으로 보장한다', async () => {
    const access = await service.create({ channel: 'resume', locale: 'ko-KR' });
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
  });

  it('동시에 같은 버전에서 생성된 두 답변 중 하나만 저장한다', async () => {
    const access = await service.create({ channel: 'main', locale: 'ko-KR' });
    let entered = 0;
    let release!: () => void;
    const bothGenerated = new Promise<void>((resolve) => {
      release = resolve;
    });
    const generate = jest.fn(async () => {
      entered += 1;
      if (entered === 2) release();
      await bothGenerated;
      return answer;
    });

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
  });

  it('만료된 대화는 접근을 막고 정리 시 턴까지 삭제한다', async () => {
    const access = await service.create({ channel: 'resume', locale: 'ko-KR' });
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
      await testDataSource.getRepository(ResumeChatConversation).count({
        where: { id: access.id },
      }),
    ).toBe(0);
    expect(
      await testDataSource.getRepository(ResumeChatTurn).count({
        where: { conversationId: access.id },
      }),
    ).toBe(0);
  });
});
