import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EspressoHistoryModule } from './espresso-history/espresso-history.module';
import { GameModule } from './game/game.module';
import { PokeLoungeModule } from './poke-lounge/poke-lounge.module';
import { RecipeModule } from './recipe/recipe.module';
import { ResumeRagModule } from './resume-rag/resume-rag.module';
import { WordleModule } from './wordle/wordle.module';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/utils/winston.config';

/**
 * 애플리케이션의 루트 모듈
 * 모든 기능 모듈과 전역 설정을 조립함
 */
@Module({
  imports: [
    // 환경 변수 설정 (.env 파일 로드)
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Winston 로깅 모듈 설정
    WinstonModule.forRoot(winstonConfig),
    // 데이터베이스 연결 설정 (TypeORM)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const dbSynchronize = configService.get<string>('DB_SYNCHRONIZE');
        const synchronize = dbSynchronize === 'true';

        if (nodeEnv === 'production' && synchronize) {
          throw new Error('DB_SYNCHRONIZE=true is not allowed in production');
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_DATABASE', 'vscoke'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize,
        };
      },
      inject: [ConfigService],
    }),
    // 기능별 모듈
    AuthModule,
    EspressoHistoryModule,
    GameModule,
    PokeLoungeModule,
    RecipeModule,
    ResumeRagModule,
    WordleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
