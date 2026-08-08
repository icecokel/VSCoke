import {
  INestApplication,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { MainChatController } from '../src/main-chat/main-chat.controller';
import { MainChatRateLimitGuard } from '../src/main-chat/main-chat-rate-limit.guard';
import { MainChatService } from '../src/main-chat/main-chat.service';
import { ResumeRagOriginGuard } from '../src/resume-rag/resume-rag-origin.guard';
import { ResumeRagService } from '../src/resume-rag/resume-rag.service';

const publicOrigin = 'http://localhost:3000';

const groundedResponse = {
  answer: '근거 기반 답변',
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

describe('MainChatController (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let answer: jest.Mock;

  beforeEach(async () => {
    answer = jest.fn().mockResolvedValue(groundedResponse);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MainChatController],
      providers: [
        MainChatService,
        MainChatRateLimitGuard,
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

  it.each([
    ['프로젝트', 'Oprimed 프로젝트에서 어떤 역할을 맡았나요?'],
    ['이력서', '프론트엔드 경력과 강점을 알려주세요.'],
  ])('공개 origin에서 인증 없이 %s 질문을 처리한다', async (_, question) => {
    const response = await request(httpServer)
      .post('/main-chat')
      .set('Origin', publicOrigin)
      .send({ question, locale: 'ko-KR' })
      .expect(200);
    const body = response.body as SuccessResponse;

    expect(body).toEqual({ success: true, data: groundedResponse });
    expect(answer).toHaveBeenCalledWith(
      { question, locale: 'ko-KR' },
      { recordQuestion: false },
    );
  });

  it('허용하지 않은 origin을 403으로 차단한다', async () => {
    const response = await request(httpServer)
      .post('/main-chat')
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
      .post('/main-chat')
      .set('Origin', publicOrigin)
      .send({ question: 'a', locale: 'fr-FR' })
      .expect(400);
    const body = response.body as ErrorResponse;

    expect(body).toEqual(
      expect.objectContaining({ success: false, statusCode: 400 }),
    );
    expect(answer).not.toHaveBeenCalled();
  });

  it('30회까지 제한 헤더를 갱신하고 31번째 요청을 429로 차단한다', async () => {
    let lastAllowedResponse: request.Response | undefined;

    for (let count = 1; count <= 30; count += 1) {
      lastAllowedResponse = await request(httpServer)
        .post('/main-chat')
        .set('Origin', publicOrigin)
        .send({ question: `프로젝트 질문 ${count}`, locale: 'ko-KR' })
        .expect(200)
        .expect('X-RateLimit-Limit', '30')
        .expect('X-RateLimit-Remaining', String(30 - count));
    }

    expect(lastAllowedResponse?.headers['x-ratelimit-reset']).toMatch(/^\d+$/);

    const blockedResponse = await request(httpServer)
      .post('/main-chat')
      .set('Origin', publicOrigin)
      .send({ question: '한도를 넘긴 프로젝트 질문', locale: 'ko-KR' })
      .expect(429)
      .expect('X-RateLimit-Limit', '30')
      .expect('X-RateLimit-Remaining', '0');
    const body = blockedResponse.body as ErrorResponse;

    expect(body).toEqual(
      expect.objectContaining({ success: false, statusCode: 429 }),
    );
    expect(answer).toHaveBeenCalledTimes(30);
  });

  it('간단한 인사는 근거 답변 공급자를 호출하지 않고 처리한다', async () => {
    const response = await request(httpServer)
      .post('/main-chat')
      .set('Origin', publicOrigin)
      .send({ question: '안녕하세요!', locale: 'ko-KR' })
      .expect(200);
    const body = response.body as SuccessResponse;

    expect(body.data).toEqual(
      expect.objectContaining({ grounded: false, sources: [] }),
    );
    expect(body.data?.answer).toContain('대표 프로젝트');
    expect(answer).not.toHaveBeenCalled();
  });

  it('검색 또는 답변 생성 공급자 실패를 503으로 반환한다', async () => {
    answer.mockRejectedValueOnce(
      new ServiceUnavailableException('provider unavailable'),
    );

    const response = await request(httpServer)
      .post('/main-chat')
      .set('Origin', publicOrigin)
      .send({
        question: '프로젝트에서 맡은 역할을 알려주세요.',
        locale: 'ko-KR',
      })
      .expect(503);
    const body = response.body as ErrorResponse;

    expect(body).toEqual(
      expect.objectContaining({ success: false, statusCode: 503 }),
    );
  });
});
