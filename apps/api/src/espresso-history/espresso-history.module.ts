import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EspressoHistoryController } from './espresso-history.controller';
import { EspressoHistoryService } from './espresso-history.service';
import { EspressoBean } from './entities/espresso-bean.entity';
import { EspressoHistory } from './entities/espresso-history.entity';
import { EspressoRound } from './entities/espresso-round.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EspressoBean, EspressoHistory, EspressoRound]),
  ],
  controllers: [EspressoHistoryController],
  providers: [EspressoHistoryService],
  exports: [EspressoHistoryService],
})
export class EspressoHistoryModule {}
