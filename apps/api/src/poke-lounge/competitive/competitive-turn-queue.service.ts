import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import {
  POKE_LOUNGE_ROOM_EVENT_PUBLISHER,
  type PokeLoungeRoomEventPublisher,
} from '../poke-lounge-room-event.publisher';
import {
  COMPETITIVE_TURN_JOB_NAME,
  COMPETITIVE_TURN_QUEUE_NAME,
  createCompetitiveTurnJobId,
  type CompetitiveTurnJobData,
  type CompetitiveTurnJobResult,
  type CompetitiveTurnQueue,
} from './competitive-turn-queue';

const RETRY_ATTEMPTS = 720;
const RETRY_DELAY_MS = 5_000;

@Injectable()
export class CompetitiveTurnQueueService
  implements CompetitiveTurnQueue, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CompetitiveTurnQueueService.name);
  private queue: Queue<
    CompetitiveTurnJobData,
    CompetitiveTurnJobResult
  > | null = null;
  private queueEvents: QueueEvents<CompetitiveTurnJobResult> | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(POKE_LOUNGE_ROOM_EVENT_PUBLISHER)
    private readonly eventPublisher: PokeLoungeRoomEventPublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.requireRedisUrl();
    this.queue = new Queue(COMPETITIVE_TURN_QUEUE_NAME, {
      connection: {
        url: redisUrl,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      },
      defaultJobOptions: {
        attempts: RETRY_ATTEMPTS,
        backoff: { type: 'fixed', delay: RETRY_DELAY_MS },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 1_000 },
      },
    });
    this.queueEvents = new QueueEvents<CompetitiveTurnJobResult>(
      COMPETITIVE_TURN_QUEUE_NAME,
      {
        connection: { url: redisUrl, maxRetriesPerRequest: null },
      },
    );
    this.queueEvents.on('completed', ({ returnvalue }) => {
      if (returnvalue?.outcome === 'resolved') {
        void this.eventPublisher.publish(returnvalue.event).catch((error) => {
          this.logger.error(
            'Failed to publish a completed competitive turn job',
            error instanceof Error ? error.stack : String(error),
          );
        });
      }
    });
    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(
        `Competitive turn job ${jobId} failed: ${failedReason}`,
      );
    });
    await Promise.all([
      this.queue.waitUntilReady(),
      this.queueEvents.waitUntilReady(),
    ]);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.queue?.close() ?? Promise.resolve(),
      this.queueEvents?.close() ?? Promise.resolve(),
    ]);
    this.queue = null;
    this.queueEvents = null;
  }

  async schedule(turn: CompetitiveTurnJobData): Promise<void> {
    const queue = this.queue;
    if (!queue) {
      throw new Error('Competitive turn queue is unavailable');
    }
    await queue.add(COMPETITIVE_TURN_JOB_NAME, turn, {
      jobId: createCompetitiveTurnJobId(turn),
      delay: Math.max(0, turn.deadlineMs - Date.now()),
    });
  }

  private requireRedisUrl(): string {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for competitive turn jobs');
    }
    return redisUrl;
  }
}
