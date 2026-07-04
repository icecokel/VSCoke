import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/utils/winston.config';
import { getCorsOptions } from './common/utils/cors.util';
import { setupApiDocumentation } from './api-documentation';

/**
 * 애플리케이션 진입점 함수
 */
async function bootstrap() {
  // NestJS 애플리케이션 인스턴스 생성 (Winston 로거 적용)
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  app.enableCors(getCorsOptions(process.env.CORS_ORIGINS));

  // 전역 필터 및 인터셉터 등록
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  setupApiDocumentation(app);

  // 지정된 포트에서 서버 실행
  await app.listen(process.env.PORT ?? 3000);
}

// 애플리케이션 실행
void bootstrap();
