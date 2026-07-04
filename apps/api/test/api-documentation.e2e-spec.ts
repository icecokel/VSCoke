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
import { RecipeController } from './../src/recipe/recipe.controller';
import { RecipeService } from './../src/recipe/recipe.service';
import { WordleController } from './../src/wordle/wordle.controller';
import { WordleService } from './../src/wordle/wordle.service';
import { setupApiDocumentation } from './../src/api-documentation';

type OpenApiDocument = {
  info?: {
    title?: string;
  };
  paths?: Record<string, unknown>;
};

const requiredOpenApiPaths = [
  '/',
  '/espresso-history/beans',
  '/espresso-history/beans/{id}',
  '/game/ranking',
  '/game/result',
  '/game/result/{id}',
  '/recipes',
  '/recipes/{id}',
  '/wordle/check',
  '/wordle/word',
];

describe('API documentation (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AppController,
        EspressoHistoryController,
        GameController,
        RecipeController,
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
          useValue: {},
        },
        {
          provide: RecipeService,
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
});
