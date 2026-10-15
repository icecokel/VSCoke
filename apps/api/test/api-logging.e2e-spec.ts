import {
  Controller,
  Get,
  Logger,
  Post,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WinstonModule } from 'nest-winston';
import { Writable } from 'node:stream';
import type { Server } from 'node:http';
import request from 'supertest';
import * as winston from 'winston';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { requestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { createWinstonConfig } from '../src/common/utils/winston.config';

@Controller('logging-check')
class LoggingCheckController {
  private readonly logger = new Logger(LoggingCheckController.name);

  @Post()
  async complete(): Promise<{ done: boolean }> {
    await new Promise<void>((resolve) => setImmediate(resolve));
    this.logger.log({
      event: 'test.operation',
      message: 'Operation completed',
      access_token: 'private-operation-token',
    });
    return { done: true };
  }

  @Get('failure')
  fail(): void {
    throw new Error('Upstream failure token=private-error-token');
  }
}

const originalEnv = process.env;

describe('API logging (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let entries: Record<string, unknown>[];

  beforeEach(async () => {
    process.env = { ...originalEnv, LOG_LEVEL: 'debug' };
    delete process.env.NOTIFY_SERVICE_URL;
    delete process.env.NOTIFY_SERVICE_USER;
    delete process.env.NOTIFY_SERVICE_PASSWORD;
    entries = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        entries.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
        callback();
      },
    });
    const config = createWinstonConfig();
    config.transports.forEach((transport) => transport.close?.());
    const logger = WinstonModule.createLogger({
      ...config,
      transports: [
        new winston.transports.Stream({
          stream,
          format: winston.format.json(),
        }),
      ],
    });
    const moduleFixture = await Test.createTestingModule({
      controllers: [LoggingCheckController],
    }).compile();
    app = moduleFixture.createNestApplication({ logger });
    app.use(requestIdMiddleware);
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app.close();
    process.env = originalEnv;
  });

  it('POST 본문 처리 후 비동기 작업과 완료 로그가 같은 요청 ID를 갖는다', async () => {
    const requestId = 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594';
    const response = await request(httpServer)
      .post('/logging-check')
      .set('X-Request-Id', requestId)
      .send({ text: 'private-body-value' })
      .expect(201);

    expect(response.headers['x-request-id']).toBe(requestId);
    expect(response.body).toEqual({ success: true, data: { done: true } });
    const related = entries.filter((entry) => entry.requestId === requestId);
    expect(related).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'test.operation',
          access_token: '[REDACTED]',
        }),
        expect.objectContaining({
          event: 'api.request',
          route: '/logging-check',
          outcome: 'completed',
          statusCode: 201,
        }),
      ]),
    );
    expect(
      related.filter((entry) => entry.event === 'api.request'),
    ).toHaveLength(1);
    expect(JSON.stringify(entries)).not.toMatch(
      /private-body-value|private-operation-token/,
    );
  });

  it('500 응답에 상세 예외와 단일 완료 이벤트를 연결하고 비밀을 제거한다', async () => {
    const requestId = 'b5fa93a9-5f91-44f0-9f6e-02e4360a1594';
    const response = await request(httpServer)
      .get('/logging-check/failure?question=private-query')
      .set('X-Request-Id', requestId)
      .expect(500);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 500,
      requestId,
    });
    const related = entries.filter((entry) => entry.requestId === requestId);
    expect(related.filter((entry) => entry.event === 'api.error')).toHaveLength(
      1,
    );
    expect(
      related.filter((entry) => entry.event === 'api.request'),
    ).toHaveLength(1);
    expect(related).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'api.error',
          errorName: 'Error',
          message: 'Upstream failure token=[REDACTED]',
        }),
      ]),
    );
    expect(JSON.stringify(entries)).not.toMatch(
      /private-error-token|private-query/,
    );
  });
});
