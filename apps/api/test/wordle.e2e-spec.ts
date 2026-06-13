import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
  let service: ReturnType<typeof mockWordleService>;

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
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/wordle/check (POST) - valid word', () => {
    service.checkWordExists.mockResolvedValueOnce(true);
    return request(app.getHttpServer())
      .post('/wordle/check')
      .send({ word: 'apple' })
      .expect(201)
      .expect((res) => {
        if (res.body.exists !== true)
          throw new Error('Expected exists to be true');
      });
  });

  it('/wordle/check (POST) - invalid word (not in db)', () => {
    service.checkWordExists.mockResolvedValueOnce(false);
    return request(app.getHttpServer())
      .post('/wordle/check')
      .send({ word: 'korea' })
      .expect(201)
      .expect((res) => {
        if (res.body.exists !== false)
          throw new Error('Expected exists to be false');
      });
  });

  it('/wordle/check (POST) - bad request (too short)', async () => {
    const response = await request(app.getHttpServer())
      .post('/wordle/check')
      .send({ word: 'hi' })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['단어는 반드시 5글자여야 합니다.']),
    );
  });

  it('/wordle/check (POST) - bad request (too long)', async () => {
    const response = await request(app.getHttpServer())
      .post('/wordle/check')
      .send({ word: 'banana' })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['단어는 반드시 5글자여야 합니다.']),
    );
  });

  it('/wordle/check (POST) - bad request (non-English)', async () => {
    const response = await request(app.getHttpServer())
      .post('/wordle/check')
      .send({ word: '한글테스트' }) // 5 chars
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining(['단어는 영문자로만 구성되어야 합니다.']),
    );
  });
});
