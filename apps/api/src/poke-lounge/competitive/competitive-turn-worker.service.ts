import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DelayedError, Worker, type Job } from 'bullmq';
import { toPokeLoungePublicRoomState } from '../poke-lounge-room-conflict';
import { PokeLoungeLiveStateService } from '../poke-lounge-live-state.service';
import {
  COMPETITIVE_ACTION_REPOSITORY,
  type CompetitiveActionRepository,
} from './competitive-action.repository';
import {
  COMPETITIVE_TURN_QUEUE_NAME,
  type CompetitiveTurnJobData,
  type CompetitiveTurnJobResult,
} from './competitive-turn-queue';

@Injectable()
export class CompetitiveTurnWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CompetitiveTurnWorkerService.name);
  private worker: Worker<
    CompetitiveTurnJobData,
    CompetitiveTurnJobResult
  > | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly liveState: PokeLoungeLiveStateService,
    @Inject(COMPETITIVE_ACTION_REPOSITORY)
    private readonly actionRepository: CompetitiveActionRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for competitive turn jobs');
    }
    await this.liveState.connect();
    this.worker = new Worker<CompetitiveTurnJobData, CompetitiveTurnJobResult>(
      COMPETITIVE_TURN_QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: { url: redisUrl, maxRetriesPerRequest: null },
        concurrency: 4,
      },
    );
    this.worker.on('error', (error) => {
      this.logger.error(
        'Competitive turn worker error',
        error instanceof Error ? error.stack : String(error),
      );
    });
    await this.worker.waitUntilReady();
  }

  async onModuleDestroy(): Promise<void> {
    await (this.worker?.close() ?? Promise.resolve());
    this.worker = null;
  }

  async process(
    job: Job<CompetitiveTurnJobData, CompetitiveTurnJobResult>,
  ): Promise<CompetitiveTurnJobResult> {
    const result = await this.actionRepository.expirePendingTurn({
      roomCode: job.data.roomCode,
      matchId: job.data.matchId,
      turn: job.data.turn,
      nowMs: Date.now(),
    });
    if (result.outcome === 'not-due') {
      await job.moveToDelayed(result.retryAtMs, job.token);
      throw new DelayedError();
    }
    if (result.outcome === 'ignored') {
      return { outcome: 'ignored' };
    }

    const snapshot = toPokeLoungePublicRoomState(result.room);
    if (
      !snapshot.competitive &&
      result.response.status !== 'completed' &&
      (snapshot.tournament.activeMatchId === null ||
        snapshot.tournament.activeMatchId === result.response.bracketMatchId)
    ) {
      snapshot.competitive = result.response;
    }

    return {
      outcome: 'resolved',
      event: { type: 'competitive-action-committed', snapshot },
    };
  }
}
