import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';
import { EspressoHistoryController } from './../src/espresso-history/espresso-history.controller';
import { EspressoHistoryService } from './../src/espresso-history/espresso-history.service';
import { GoogleAuthGuard } from './../src/auth/google-auth.guard';
import { GameController } from './../src/game/game.controller';
import { GameService } from './../src/game/game.service';
import { MainChatController } from './../src/main-chat/main-chat.controller';
import { MainChatService } from './../src/main-chat/main-chat.service';
import { RecipeController } from './../src/recipe/recipe.controller';
import { RecipeService } from './../src/recipe/recipe.service';
import { ResumeRagController } from './../src/resume-rag/resume-rag.controller';
import { ResumeRagService } from './../src/resume-rag/resume-rag.service';
import { WordleController } from './../src/wordle/wordle.controller';
import { WordleService } from './../src/wordle/wordle.service';
import { setupApiDocumentation } from './../src/api-documentation';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';

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
  '/main-chat',
  '/recipes',
  '/recipes/{id}',
  '/resume-rag/chat',
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
      controllers: [
        AppController,
        EspressoHistoryController,
        GameController,
        MainChatController,
        RecipeController,
        ResumeRagController,
        WordleController,
      ],
      providers: [
        AppService,
        {
          provide: EspressoHistoryService,
          useValue: {},
        },
        {
          provide: GameService,
          useValue: gameService,
        },
        {
          provide: MainChatService,
          useValue: {},
        },
        {
          provide: RecipeService,
          useValue: {},
        },
        {
          provide: ResumeRagService,
          useValue: {},
        },
        {
          provide: WordleService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor());
    setupApiDocumentation(app);
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
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
