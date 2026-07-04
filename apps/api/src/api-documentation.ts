import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';

const noCache = (_req: Request, res: Response, next: NextFunction) => {
  res.header(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  );
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
};

export const setupApiDocumentation = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('VSCoke API')
    .setDescription('VSCoke API 문서입니다.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  app.use('/api', noCache);
  app.use('/api-json', noCache);

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
};
