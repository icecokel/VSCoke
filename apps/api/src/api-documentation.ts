import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
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

export const createApiDocument = (app: INestApplication): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle('VSCoke API')
    .setDescription('VSCoke API 문서입니다.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
};

export const setupApiDocumentation = (app: INestApplication): void => {
  app.use('/api', noCache);
  app.use('/api-json', noCache);

  const document = createApiDocument(app);
  SwaggerModule.setup('api', app, document);
};
