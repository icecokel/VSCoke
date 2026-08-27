import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from '../common/utils/winston.config';
import { COMPETITIVE_ACTION_REPOSITORY } from './competitive/competitive-action.repository';
import { CompetitiveTurnWorkerService } from './competitive/competitive-turn-worker.service';
import { PokeLoungeRedisModule } from './poke-lounge-redis.module';
import { RedisPokeLoungeRepository } from './redis-poke-lounge.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot(winstonConfig),
    PokeLoungeRedisModule,
  ],
  providers: [
    RedisPokeLoungeRepository,
    {
      provide: COMPETITIVE_ACTION_REPOSITORY,
      useExisting: RedisPokeLoungeRepository,
    },
    CompetitiveTurnWorkerService,
  ],
})
export class PokeLoungeTurnWorkerModule {}
