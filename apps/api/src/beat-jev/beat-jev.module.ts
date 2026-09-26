import { Module } from '@nestjs/common';
import { BeatJevController } from './beat-jev.controller';
import { BeatJevService } from './beat-jev.service';
import { JevClientService } from './jev-client.service';
import { BeatJevRateLimitGuard } from './beat-jev-rate-limit.guard';

@Module({
  controllers: [BeatJevController],
  providers: [BeatJevService, JevClientService, BeatJevRateLimitGuard],
})
export class BeatJevModule {}
