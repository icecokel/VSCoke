import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordleController } from './wordle.controller';
import { WordleService } from './wordle.service';
import { Word } from './entities/word.entity';

/**
 * 워들 게임 관련 기능을 캡슐화한 모듈
 */
@Module({
  imports: [TypeOrmModule.forFeature([Word])],
  controllers: [WordleController],
  providers: [WordleService],
  exports: [WordleService],
})
export class WordleModule {}
