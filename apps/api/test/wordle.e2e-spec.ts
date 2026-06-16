import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { WordleController } from './../src/wordle/wordle.controller';
import { WordleService } from './../src/wordle/wordle.service';

const mockWordleService = () => ({
  getRandomWord: jest.fn(),
  getWordCount: jest.fn(),
  checkWordExists: jest.fn((word: string) => word === 'apple'),
});

describe('WordleController (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let service: ReturnType<typeof mockWordleService>;

  type WordleCheckResponse = {
    exists?: boolean;
  };

  type ValidationErrorResponse = {
    message?: string[];
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [WordleController],
      providers: [
        {
          provide: WordleService,
          useFactory: mockWordleService,
        },
      ],
    }).compile();

    service = moduleFixture.get(WordleService);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/wordle/check (POST) - valid word', () => {
    service.checkWordExists.mockResolvedValueOnce(true);
    return request(httpServer)
      .post('/wordle/check')
      .send({ word: 'apple' })
      .expect(201)
      .expect((res) => {
        const body = res.body as WordleCheckResponse;
        if (body.exists !== true) {
          throw new Error('Expected exists to be true');
        }
      });
  });

  it('/wordle/check (POST) - invalid word (not in db)', () => {
    service.checkWordExists.mockResolvedValueOnce(false);
    return request(httpServer)
      .post('/wordle/check')
      .send({ word: 'korea' })
      .expect(201)
      .expect((res) => {
        const body = res.body as WordleCheckResponse;
        if (body.exists !== false)
          throw new Error('Expected exists to be false');
      });
  });

  it('/wordle/check (POST) - bad request (too short)', async () => {
    const response = await request(httpServer)
      .post('/wordle/check')
      .send({ word: 'hi' })
      .expect(400);

    const body = response.body as ValidationErrorResponse;
    expect(body.message).toEqual(
      expect.arrayContaining(['단어는 반드시 5글자여야 합니다.']),
    );
  });

  it('/wordle/check (POST) - bad request (too long)', async () => {
    const response = await request(httpServer)
      .post('/wordle/check')
      .send({ word: 'banana' })
      .expect(400);

    const body = response.body as ValidationErrorResponse;
    expect(body.message).toEqual(
      expect.arrayContaining(['단어는 반드시 5글자여야 합니다.']),
    );
  });

  it('/wordle/check (POST) - bad request (non-English)', async () => {
    const response = await request(httpServer)
      .post('/wordle/check')
      .send({ word: '한글테스트' }) // 5 chars
      .expect(400);

    const body = response.body as ValidationErrorResponse;
    expect(body.message).toEqual(
      expect.arrayContaining(['단어는 영문자로만 구성되어야 합니다.']),
    );
  });
});
