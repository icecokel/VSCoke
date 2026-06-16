import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { GeekNewsService } from './geeknews.service';

@Injectable()
export class GeekNewsSchedulerService {
  private readonly logger = new Logger(GeekNewsSchedulerService.name);

  constructor(
    private readonly geekNewsService: GeekNewsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 0 0/3 * * *', { timeZone: 'Asia/Seoul' })
  async syncGeekNews(): Promise<void> {
    const enabled =
      this.configService.get<string>('GEEKNEWS_SYNC_ENABLED', 'true') !==
      'false';

    if (!enabled) {
      return;
    }

    const result = await this.geekNewsService.syncLatestTopics();

    if (result.status === 'skipped') {
      return;
    }

    this.logger.log(
      `GeekNews sync completed: created=${result.createdTopics}, updated=${result.updatedTopics}, translated=${result.translatedTopics}, pending=${result.pendingTopics}, failed=${result.failedTopics}`,
    );
  }
}
