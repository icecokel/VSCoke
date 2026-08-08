import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ResumeRagController } from '../src/resume-rag/resume-rag.controller';
import { ResumeRagOriginGuard } from '../src/resume-rag/resume-rag-origin.guard';
import { ResumeRagRateLimitGuard } from '../src/resume-rag/resume-rag-rate-limit.guard';
import { ResumeRagService } from '../src/resume-rag/resume-rag.service';

const publicOrigin = 'http://localhost:3000';

const groundedResponse = {
  answer: '이력 근거 기반 답변',
  grounded: true,
  sources: [],
};

type SuccessResponse = {
  success?: boolean;
  data?: typeof groundedResponse;
};

type ErrorResponse = {
  success?: boolean;
  statusCode?: number;
};

describe('ResumeRagController (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let answer: jest.Mock;

  beforeEach(async () => {
    answer = jest.fn().mockResolvedValue(groundedResponse);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ResumeRagController],
      providers: [
        ResumeRagRateLimitGuard,
        ResumeRagOriginGuard,
        {
          provide: ResumeRagService,
          useValue: { answer },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('공개 origin에서 인증 없이 이력 질문을 처리한다', async () => {
    const response = await request(httpServer)
      .post('/resume-rag/chat')
      .set('Origin', publicOrigin)
      .send({ question: '프론트엔드 경력을 알려주세요.', locale: 'ko-KR' })
      .expect(201)
      .expect('X-RateLimit-Limit', '20')
      .expect('X-RateLimit-Remaining', '19');
    const body = response.body as SuccessResponse;

    expect(body).toEqual({ success: true, data: groundedResponse });
    expect(answer).toHaveBeenCalledWith({
      question: '프론트엔드 경력을 알려주세요.',
      locale: 'ko-KR',
    });
  });

  it('허용하지 않은 origin을 403으로 차단한다', async () => {
    const response = await request(httpServer)
      .post('/resume-rag/chat')
      .set('Origin', 'https://example.com')
      .send({ question: '프로젝트 질문', locale: 'ko-KR' })
      .expect(403);
    const body = response.body as ErrorResponse;

    expect(body).toEqual(
      expect.objectContaining({ success: false, statusCode: 403 }),
    );
    expect(answer).not.toHaveBeenCalled();
  });

  it('잘못된 질문과 locale을 400으로 거부한다', async () => {
    const response = await request(httpServer)
      .post('/resume-rag/chat')
      .set('Origin', publicOrigin)
      .send({ question: 'a', locale: 'fr-FR' })
      .expect(400);
    const body = response.body as ErrorResponse;

    expect(body).toEqual(
      expect.objectContaining({ success: false, statusCode: 400 }),
    );
    expect(answer).not.toHaveBeenCalled();
  });

  it('20회까지 제한 헤더를 갱신하고 21번째 요청을 429로 차단한다', async () => {
    let lastAllowedResponse: request.Response | undefined;

    for (let count = 1; count <= 20; count += 1) {
      lastAllowedResponse = await request(httpServer)
        .post('/resume-rag/chat')
        .set('Origin', publicOrigin)
        .send({ question: `이력 질문 ${count}`, locale: 'ko-KR' })
        .expect(201)
        .expect('X-RateLimit-Limit', '20')
        .expect('X-RateLimit-Remaining', String(20 - count));
    }

    expect(lastAllowedResponse?.headers['x-ratelimit-reset']).toMatch(/^\d+$/);

    const blockedResponse = await request(httpServer)
      .post('/resume-rag/chat')
      .set('Origin', publicOrigin)
      .send({ question: '한도를 넘긴 이력 질문', locale: 'ko-KR' })
      .expect(429)
      .expect('X-RateLimit-Limit', '20')
      .expect('X-RateLimit-Remaining', '0');
    const body = blockedResponse.body as ErrorResponse;

    expect(body).toEqual(
      expect.objectContaining({ success: false, statusCode: 429 }),
    );
    expect(answer).toHaveBeenCalledTimes(20);
  });
});
