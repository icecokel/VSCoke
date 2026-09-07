import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import {
  ResumeChatConversation,
  type ResumeChatChannel,
} from './entities/resume-chat-conversation.entity';
import { ResumeChatTurn } from './entities/resume-chat-turn.entity';
import type {
  CreateResumeConversationDto,
  ResumeConversationAccessDto,
  ResumeConversationHistoryDto,
} from './dto/resume-conversation.dto';
import type { ResumeRagChatRequestDto } from './dto/resume-rag-chat-request.dto';
import type { ResumeRagChatResponseDto } from './dto/resume-rag-chat-response.dto';
import { redactResumeRagChatQuestion } from './resume-rag-chat-log.service';
import {
  buildResumeChatHistory,
  RESUME_CHAT_HISTORY_TURNS,
  RESUME_CHAT_RETENTION_DAYS,
  RESUME_CHAT_STORED_TURNS,
  type ResumeChatHistoryMessage,
} from './resume-chat-history';

export const RESUME_CONVERSATION_TOKEN_HEADER = 'X-Resume-Conversation-Token';

const tokenHash = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
const unavailable = (): NotFoundException =>
  new NotFoundException('Conversation not found or expired');
const toResponse = (turn: ResumeChatTurn): ResumeRagChatResponseDto => ({
  conversationId: turn.conversationId,
  requestId: turn.requestId,
  answer: turn.answer,
  grounded: turn.grounded,
  sources: turn.sources,
});

@Injectable()
export class ResumeConversationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ResumeConversationService.name);
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(ResumeChatConversation)
    private readonly conversations: Repository<ResumeChatConversation>,
    @InjectRepository(ResumeChatTurn)
    private readonly turns: Repository<ResumeChatTurn>,
  ) {}

  onModuleInit(): void {
    this.cleanupTimer = setInterval(
      () => {
        void this.purgeExpired().catch(() =>
          this.logger.warn('Expired conversation cleanup failed'),
        );
      },
      60 * 60 * 1000,
    );
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async purgeExpired(): Promise<void> {
    await this.conversations.delete({ expiresAt: LessThanOrEqual(new Date()) });
  }

  async create(
    request: CreateResumeConversationDto,
  ): Promise<ResumeConversationAccessDto> {
    await this.purgeExpired();
    const token = randomBytes(32).toString('hex');
    const conversation = await this.conversations.save(
      this.conversations.create({
        tokenHash: tokenHash(token),
        channel: request.channel,
        locale: request.locale,
        version: 0,
        expiresAt: new Date(
          Date.now() + RESUME_CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
        ),
      }),
    );
    return {
      id: conversation.id,
      token,
      expiresAt: conversation.expiresAt.toISOString(),
    };
  }

  private async authorize(
    id: string,
    token: string | undefined,
  ): Promise<ResumeChatConversation> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw unavailable();
    const conversation = await this.conversations.findOneBy({
      id,
      tokenHash: tokenHash(token),
    });
    if (!conversation || conversation.expiresAt.getTime() <= Date.now())
      throw unavailable();
    return conversation;
  }

  async history(
    id: string,
    token: string | undefined,
  ): Promise<ResumeConversationHistoryDto> {
    const conversation = await this.authorize(id, token);
    const turns = await this.turns.find({
      where: { conversationId: id },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: RESUME_CHAT_STORED_TURNS,
    });
    return {
      id,
      locale: conversation.locale,
      channel: conversation.channel,
      expiresAt: conversation.expiresAt.toISOString(),
      turns: turns.reverse().map((turn) => ({
        id: turn.id,
        requestId: turn.requestId,
        question: turn.question,
        answer: turn.answer,
        grounded: turn.grounded,
        sources: turn.sources,
        createdAt: turn.createdAt.toISOString(),
      })),
    };
  }

  async remove(id: string, token: string | undefined): Promise<void> {
    await this.authorize(id, token);
    await this.conversations.delete({ id });
  }

  async runTurn(
    request: ResumeRagChatRequestDto,
    token: string | undefined,
    channel: ResumeChatChannel,
    generate: (
      history: ResumeChatHistoryMessage[],
      question: string,
    ) => Promise<ResumeRagChatResponseDto>,
  ): Promise<ResumeRagChatResponseDto> {
    if (!request.conversationId) {
      if (request.requestId || token)
        throw new BadRequestException('conversationId is required');
      return generate([], request.question);
    }
    if (!request.requestId)
      throw new BadRequestException('requestId is required for a conversation');
    const conversation = await this.authorize(request.conversationId, token);
    if (
      conversation.channel !== channel ||
      conversation.locale !== request.locale
    )
      throw unavailable();

    const question = redactResumeRagChatQuestion(request.question);
    const requestId = request.requestId;
    const where = { conversationId: conversation.id, requestId };
    const cached = await this.turns.findOneBy(where);
    if (cached) {
      if (cached.question !== question)
        throw new ConflictException(
          'requestId already used for another question',
        );
      return toResponse(cached);
    }
    const previous = await this.turns.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: RESUME_CHAT_HISTORY_TURNS,
    });
    const response = await generate(
      buildResumeChatHistory(previous.reverse()),
      question,
    );
    if (!response.answer.trim() || response.answer.length > 20_000) {
      throw new ServiceUnavailableException(
        'Invalid conversation answer length',
      );
    }

    // 모델 실행 중에는 트랜잭션을 유지하지 않는다. 저장할 때 버전을 비교해 맥락 충돌을 막는다.
    return this.conversations.manager.transaction(async (manager) => {
      const conversations = manager.getRepository(ResumeChatConversation);
      const turns = manager.getRepository(ResumeChatTurn);
      const current = await conversations.findOne({
        where: { id: conversation.id, tokenHash: conversation.tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current || current.expiresAt.getTime() <= Date.now())
        throw unavailable();
      const completed = await turns.findOneBy(where);
      if (completed) {
        if (completed.question !== question)
          throw new ConflictException(
            'requestId already used for another question',
          );
        return toResponse(completed);
      }
      if (current.version !== conversation.version) {
        throw new ConflictException(
          'Conversation changed; retry with the latest context',
        );
      }
      const turn = new ResumeChatTurn();
      Object.assign(turn, {
        ...where,
        question,
        answer: redactResumeRagChatQuestion(response.answer),
        grounded: response.grounded,
        sources: response.sources,
      });
      const saved = await turns.save(turn);
      await conversations.update(current.id, { version: current.version + 1 });
      await turns.query(
        `DELETE FROM resume_chat_turns WHERE "conversationId" = $1
        AND id NOT IN (SELECT id FROM resume_chat_turns WHERE "conversationId" = $1
          ORDER BY "createdAt" DESC, id DESC LIMIT $2)`,
        [current.id, RESUME_CHAT_STORED_TURNS],
      );
      return toResponse(saved);
    });
  }
}
