import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';
import { ResumeChatConversation } from './entities/resume-chat-conversation.entity';
import { ResumeChatTurn } from './entities/resume-chat-turn.entity';
import { ResumeConversationService } from './resume-conversation.service';
import {
  buildResumeChatHistory,
  RESUME_CHAT_HISTORY_CHARACTERS,
} from './resume-chat-history';

const token = 'a'.repeat(64);
const answer = {
  answer: 'Oprimed의 공개 역할 설명',
  grounded: true,
  sources: [],
};

const createHarness = () => {
  const conversation = Object.assign(new ResumeChatConversation(), {
    id: randomUUID(),
    tokenHash: createHash('sha256').update(token).digest('hex'),
    channel: 'resume',
    locale: 'ko-KR',
    version: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  const saved: ResumeChatTurn[] = [];
  let deleted = false;
  const conversations = {
    query: jest.fn().mockResolvedValue([{ id: 'public-resume' }]),
    findOneBy: jest.fn((where: { id: string; tokenHash: string }) =>
      Promise.resolve(
        !deleted &&
          where.id === conversation.id &&
          where.tokenHash === conversation.tokenHash
          ? { ...conversation }
          : null,
      ),
    ),
    findOne: jest.fn(() =>
      Promise.resolve(deleted ? null : { ...conversation }),
    ),
    update: jest.fn((_id: string, values: Partial<ResumeChatConversation>) => {
      Object.assign(conversation, values);
      return Promise.resolve({ affected: 1 });
    }),
    softDelete: jest.fn(() => {
      deleted = true;
      return Promise.resolve({ affected: 1 });
    }),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    create: jest.fn((values: Partial<ResumeChatConversation>) => values),
    save: jest.fn((values: Partial<ResumeChatConversation>) =>
      Promise.resolve({ ...conversation, ...values }),
    ),
  };
  const turns = {
    findOne: jest.fn(({ where }: { where: { requestId: string } }) =>
      Promise.resolve(
        saved.find((turn) => turn.requestId === where.requestId) ?? null,
      ),
    ),
    find: jest.fn(() =>
      Promise.resolve(saved.filter((turn) => !turn.deletedAt).reverse()),
    ),
    softDelete: jest.fn(() => {
      for (const turn of saved) turn.deletedAt = new Date();
      return Promise.resolve({ affected: saved.length });
    }),
    save: jest.fn((turn: ResumeChatTurn) => {
      const stored = Object.assign(new ResumeChatTurn(), turn, {
        id: randomUUID(),
        createdAt: new Date(),
      });
      saved.push(stored);
      return Promise.resolve(stored);
    }),
    query: jest.fn().mockResolvedValue([]),
  };
  const manager = {
    getRepository: (entity: unknown) =>
      entity === ResumeChatTurn ? turns : conversations,
  };
  const transaction = jest.fn(
    (operation: (manager: EntityManager) => Promise<unknown>) =>
      operation(manager as unknown as EntityManager),
  );
  const service = new ResumeConversationService(
    {
      ...conversations,
      manager: { transaction },
    } as unknown as Repository<ResumeChatConversation>,
    turns as unknown as Repository<ResumeChatTurn>,
  );
  const request = (question = 'Oprimed 역할', requestId = randomUUID()) => ({
    conversationId: conversation.id,
    requestId,
    question,
    locale: 'ko-KR',
  });
  return {
    service,
    conversation,
    conversations,
    turns,
    saved,
    transaction,
    request,
  };
};

describe('ResumeConversationService', () => {
  it('이전 질문·답변을 DB에서 읽어 다음 턴에 전달한다', async () => {
    const { service, request, saved } = createHarness();
    const generate = jest.fn().mockResolvedValue(answer);
    await service.runTurn(request(), token, 'resume', generate);
    await service.runTurn(
      request('그 프로젝트의 성과는?'),
      token,
      'resume',
      generate,
    );
    expect(generate.mock.calls[0]).toEqual([[], 'Oprimed 역할']);
    expect(generate.mock.calls[1]).toEqual([
      [
        { role: 'user', content: 'Oprimed 역할' },
        { role: 'assistant', content: answer.answer },
      ],
      '그 프로젝트의 성과는?',
    ]);
    expect(saved).toHaveLength(2);
  });

  it('같은 요청을 재시도하면 생성·저장하지 않고 기존 답변을 반환한다', async () => {
    const { service, request, saved } = createHarness();
    const generate = jest.fn().mockResolvedValue(answer);
    const input = request();
    const first = await service.runTurn(input, token, 'resume', generate);
    expect(await service.runTurn(input, token, 'resume', generate)).toEqual(
      first,
    );
    expect(generate).toHaveBeenCalledTimes(1);
    expect(saved).toHaveLength(1);
    await expect(
      service.runTurn(
        { ...input, question: '다른 질문' },
        token,
        'resume',
        generate,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it.each([undefined, 'b'.repeat(64), 'invalid'])(
    '잘못된 접근키 %s로 기록을 읽을 수 없다',
    async (wrongToken) => {
      const { service, conversation } = createHarness();
      await expect(
        service.history(conversation.id, wrongToken),
      ).rejects.toThrow(NotFoundException);
    },
  );

  it('만료·다른 채널·다른 언어 요청을 거부한다', async () => {
    const { service, request, conversation } = createHarness();
    const generate = jest.fn().mockResolvedValue(answer);
    await expect(
      service.runTurn(request(), token, 'main', generate),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.runTurn(
        { ...request(), locale: 'en-US' },
        token,
        'resume',
        generate,
      ),
    ).rejects.toThrow(NotFoundException);
    conversation.expiresAt = new Date(0);
    await expect(
      service.runTurn(request(), token, 'resume', generate),
    ).rejects.toThrow(NotFoundException);
    expect(generate).not.toHaveBeenCalled();
  });

  it('AI 실패는 대화 기록이나 버전을 변경하지 않는다', async () => {
    const { service, request, saved, conversation, transaction } =
      createHarness();
    await expect(
      service.runTurn(
        request(),
        token,
        'resume',
        jest.fn().mockRejectedValue(new Error('provider unavailable')),
      ),
    ).rejects.toThrow('provider unavailable');
    expect(saved).toHaveLength(0);
    expect(conversation.version).toBe(0);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('동시에 대화가 바뀌면 오래된 맥락의 답변을 저장하지 않는다', async () => {
    const { service, request, saved, conversation } = createHarness();
    const generate = jest.fn(() => {
      conversation.version += 1;
      return Promise.resolve(answer);
    });
    await expect(
      service.runTurn(request(), token, 'resume', generate),
    ).rejects.toThrow(ConflictException);
    expect(saved).toHaveLength(0);
  });

  it('민감 정보는 맥락 전달과 저장 전에 마스킹하고, 삭제 후 접근을 막는다', async () => {
    const { service, request, saved, conversation } = createHarness();
    const generate = jest
      .fn()
      .mockResolvedValue({ ...answer, answer: '연락처 test@example.com' });
    await service.runTurn(
      request('test@example.com 연락처'),
      token,
      'resume',
      generate,
    );
    expect(generate).toHaveBeenCalledWith([], '[email] 연락처');
    expect(saved[0].question).toBe('[email] 연락처');
    expect(saved[0].answer).toBe('연락처 [email]');
    await service.remove(conversation.id, token);
    await expect(service.history(conversation.id, token)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('생성 중 대화가 삭제되면 늦은 모델 응답을 저장하지 않는다', async () => {
    const { service, request, saved, conversation, conversations, turns } =
      createHarness();
    const generate = jest.fn(async () => {
      await service.remove(conversation.id, token);
      return answer;
    });
    await expect(
      service.runTurn(request(), token, 'resume', generate),
    ).rejects.toThrow(NotFoundException);
    expect(saved).toHaveLength(0);
    expect(conversations.softDelete).toHaveBeenCalledWith({
      id: conversation.id,
    });
    expect(turns.softDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: conversation.id,
      }),
    );
    expect(conversations.delete).not.toHaveBeenCalled();
  });

  it('최근 기록에서 제외된 requestId를 재실행하거나 복구하지 않는다', async () => {
    const { service, request, saved, turns } = createHarness();
    const input = request();
    await service.runTurn(
      input,
      token,
      'resume',
      jest.fn().mockResolvedValue(answer),
    );
    saved[0].deletedAt = new Date();
    const generate = jest.fn().mockResolvedValue(answer);
    await expect(
      service.runTurn(input, token, 'resume', generate),
    ).rejects.toThrow(ConflictException);
    expect(generate).not.toHaveBeenCalled();
    expect(turns.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE resume_chat_turns SET deleted_at'),
      expect.any(Array),
    );
    expect(saved).toHaveLength(1);
  });

  it('다른 문서의 대화를 복원하거나 이어서 사용할 수 없다', async () => {
    const { service, conversation, request } = createHarness();
    conversation.resumeKey = 'fe';
    const generate = jest.fn().mockResolvedValue(answer);
    await expect(
      service.history(conversation.id, token, {
        channel: 'resume',
        locale: 'ko-KR',
        resumeKey: 'pe',
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.runTurn(
        { ...request(), resumeKey: 'pe' },
        token,
        'resume',
        generate,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(generate).not.toHaveBeenCalled();
    expect(
      (await service.history(conversation.id, token, { resumeKey: 'fe' }))
        .resumeKey,
    ).toBe('fe');
  });

  it('선택 문서가 철회되면 인사·새 대화·복원도 허용하지 않는다', async () => {
    const { service, conversation, conversations, request } = createHarness();
    conversations.query.mockResolvedValue([]);
    const generate = jest.fn().mockResolvedValue(answer);
    await expect(
      service.create({ channel: 'resume', locale: 'ko-KR', resumeKey: 'pe' }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.history(conversation.id, token)).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.runTurn(request('안녕'), token, 'resume', generate),
    ).rejects.toThrow(NotFoundException);
    expect(generate).not.toHaveBeenCalled();
    expect(conversations.save).not.toHaveBeenCalled();
  });

  it('접근키 원문 대신 해시를 저장하고 생성 응답에만 원문을 반환한다', async () => {
    const { service, conversations } = createHarness();
    const access = await service.create({ locale: 'ko-KR', channel: 'resume' });
    expect(access.token).toMatch(/^[a-f0-9]{64}$/);
    expect(conversations.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: createHash('sha256').update(access.token).digest('hex'),
      }),
    );
    expect(JSON.stringify(conversations.save.mock.calls)).not.toContain(
      access.token,
    );
    expect(Date.parse(access.expiresAt) - Date.now()).toBeGreaterThan(
      29 * 86_400_000,
    );
  });
});

describe('buildResumeChatHistory', () => {
  it('최근 여섯 턴을 순서대로 전달하며 오래된 턴을 제외한다', () => {
    const history = buildResumeChatHistory(
      Array.from({ length: 8 }, (_, index) => ({
        question: `질문 ${index}`,
        answer: `답변 ${index}`,
      })),
    );
    expect(history).toHaveLength(12);
    expect(history[0].content).toBe('질문 2');
    expect(history[11].content).toBe('답변 7');
  });
  it('긴 이력에도 길이 제한과 질문·답변 쌍을 유지한다', () => {
    const history = buildResumeChatHistory(
      Array.from({ length: 8 }, () => ({
        question: 'q'.repeat(1000),
        answer: 'a'.repeat(10_000),
      })),
    );
    expect(
      history.reduce((total, message) => total + message.content.length, 0),
    ).toBeLessThanOrEqual(RESUME_CHAT_HISTORY_CHARACTERS);
    expect(history.length % 2).toBe(0);
  });
});
