import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { Request, Response, NextFunction } from 'express';

import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/utils/winston.config';
import { getCorsOptions } from './common/utils/cors.util';

/**
 * 애플리케이션 진입점 함수
 */
async function bootstrap() {
  // NestJS 애플리케이션 인스턴스 생성 (Winston 로거 적용)
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  app.enableCors(getCorsOptions(process.env.CORS_ORIGINS));

  // Swagger 문서 설정
  const config = new DocumentBuilder()
    .setTitle('VSCoke API')
    .setDescription('VSCoke API 문서입니다.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // 전역 필터 및 인터셉터 등록
  /* Global Filters & Interceptors */
  /* Global Filters & Interceptors */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  /**
   * Swagger 관련 응답의 캐싱을 방지하는 미들웨어
   */
  // Prevent Swagger caching
  const noCache = (_req: Request, res: Response, next: NextFunction) => {
    res.header(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
  };
  app.use('/api', noCache);
  app.use('/api-json', noCache);

  // Swagger UI 설정
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 지정된 포트에서 서버 실행
  await app.listen(process.env.PORT ?? 3000);
}

// 애플리케이션 실행
bootstrap();
