import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameHistory } from './entities/game-history.entity';
import { GamePokeLoungeState } from './entities/game-poke-lounge-state.entity';
import { AuthModule } from '../auth/auth.module';
import { VerifiedPokeLoungeHistoryWriter } from './verified-poke-lounge-history-writer.service';

/**
 * 게임 결과 및 랭킹 기능을 담당하는 모듈
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([GameHistory, GamePokeLoungeState]),
    // 구글 인증 가드를 사용하기 위해 AuthModule 주입
    AuthModule,
  ],
  controllers: [GameController],
  providers: [GameService, VerifiedPokeLoungeHistoryWriter],
  exports: [VerifiedPokeLoungeHistoryWriter],
})
export class GameModule {}
