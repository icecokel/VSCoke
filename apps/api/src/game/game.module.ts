import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameHistory } from './entities/game-history.entity';
import { AuthModule } from '../auth/auth.module';

/**
 * 게임 결과 및 랭킹 기능을 담당하는 모듈
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([GameHistory]),
    // 구글 인증 가드를 사용하기 위해 AuthModule 주입
    AuthModule,
  ],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
