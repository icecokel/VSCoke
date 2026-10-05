import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ApiContractModule } from '../src/api-contract.module';
import { GoogleAuthGuard } from '../src/auth/google-auth.guard';
import { GameService } from '../src/game/game.service';
import { setupApiDocumentation } from './../src/api-documentation';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { requestIdMiddleware } from '../src/common/middleware/request-id.middleware';

type OpenApiDocument = {
  info?: {
    title?: string;
  };
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<
      string,
      {
        enum?: string[];
        properties?: Record<string, { enum?: string[] }>;
      }
    >;
  };
};

const requiredOpenApiPaths = [
  '/',
  '/espresso-history/beans',
  '/espresso-history/beans/{id}',
  '/game/ranking',
  '/game/result',
  '/game/result/{id}',
  '/health',
  '/client-errors',
  '/main-chat',
  '/recipes',
  '/recipes/{id}',
  '/resume-rag/chat',
  '/resume-rag/conversations',
  '/resume-rag/conversations/{id}',
  '/wordle/check',
  '/wordle/word',
];

describe('API documentation (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let gameService: { getRanking: jest.Mock };

  beforeEach(async () => {
    gameService = { getRanking: jest.fn() };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiContractModule],
    })
      .overrideProvider(GameService)
      .useValue(gameService)
      .overrideGuard(GoogleAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(requestIdMiddleware);
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    setupApiDocumentation(app);
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('문서화된 오류 envelope가 실제 입력 검증 응답과 일치한다', async () => {
    const response = await request(httpServer)
      .post('/wordle/check')
      .send({ word: 'hi' })
      .expect(400);
    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      path: '/wordle/check',
    });
    const body = response.body as { timestamp?: unknown; message?: unknown };
    expect(typeof body.timestamp).toBe('string');
    expect(Array.isArray(body.message)).toBe(true);
    expect(response.body).not.toHaveProperty('data');
  });

  it('웹 오류를 HTTP로 받고 이벤트 ID와 API 요청 ID를 로그에 연결한다', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const eventId = 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594';
    const requestId = 'b5fa93a9-5f91-44f0-9f6e-02e4360a1594';

    const response = await request(httpServer)
      .post('/client-errors')
      .set('Origin', 'https://vscoke.icecoke.kr')
      .set('X-Request-Id', requestId)
      .send({
        eventId,
        source: 'browser',
        kind: 'runtime',
        path: '/ko-KR/game/wordle',
        errorName: 'TypeError',
        message: 'Unexpected failure',
      })
      .expect(202);

    expect(response.headers['x-request-id']).toBe(requestId);
    expect(errorSpy.mock.calls[0]?.[0]).toContain(eventId);
    expect(errorSpy.mock.calls[0]?.[0]).toContain(requestId);
    errorSpy.mockRestore();
  });

  it('/api-json (GET) exposes deploy-critical API paths without cache', async () => {
    const response = await request(httpServer).get('/api-json').expect(200);
    const body = response.body as OpenApiDocument;

    expect(response.header['cache-control']).toContain('no-store');
    expect(body.info?.title).toBe('VSCoke API');
    expect(Object.keys(body.paths ?? {}).sort()).toEqual(
      expect.arrayContaining(requiredOpenApiPaths),
    );
  });

  it('/game/ranking (GET) serializes only the public ranking projection', async () => {
    gameService.getRanking.mockResolvedValue([
      {
        id: 'sentinel-history-id',
        score: 100,
        rank: 1,
        gameType: 'SKY_DROP',
        playTime: 30,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        userId: 'sentinel-user-id',
        user: {
          id: 'sentinel-user-id',
          displayName: 'Gil Dong',
          email: 'sentinel@example.com',
          accessToken: 'sentinel-access-token',
        },
      },
    ]);

    const response = await request(httpServer)
      .get('/game/ranking?gameType=SKY_DROP')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: [
        {
          score: 100,
          rank: 1,
          createdAt: '2026-07-11T00:00:00.000Z',
          user: { displayName: 'Gil Dong' },
        },
      ],
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /email|accessToken|sentinel/,
    );
  });
});
