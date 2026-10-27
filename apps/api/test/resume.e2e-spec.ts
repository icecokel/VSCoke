import type { Server } from 'node:http';
import {
  NotFoundException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { ResumeController } from '../src/resume/resume.controller';
import { ResumeService } from '../src/resume/resume.service';
import {
  resumeDetailSnapshot,
  resumeDocumentSnapshot,
} from '../src/migrations/data/resume-content-snapshot';

describe('공개 이력서 HTTP 계약', () => {
  let app: INestApplication<Server>;
  const service = {
    getDocument: jest.fn(),
    getDetails: jest.fn(),
    getDetail: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ResumeController],
      providers: [{ provide: ResumeService, useValue: service }],
    }).compile();
    app = module.createNestApplication<INestApplication<Server>>({
      logger: false,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  beforeEach(() => jest.resetAllMocks());
  afterAll(async () => app.close());

  it.each(resumeDocumentSnapshot)(
    '$locale 본문과 성공 wrapper를 반환한다',
    async (document) => {
      service.getDocument.mockResolvedValue(document);
      const response = await request(app.getHttpServer())
        .get(`/resume?locale=${document.locale}`)
        .expect(200);
      expect(response.body).toEqual({ success: true, data: document });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(service.getDocument).toHaveBeenCalledWith(document.locale);
    },
  );

  it('언어를 생략하면 한국어를 조회한다', async () => {
    service.getDocument.mockResolvedValue(resumeDocumentSnapshot[0]);
    await request(app.getHttpServer()).get('/resume').expect(200);
    expect(service.getDocument).toHaveBeenCalledWith('ko-KR');
  });

  it.each([
    'locale=en',
    'locale=',
    'locale=ko-KR&locale=en-US',
    'locale[code]=ko-KR',
  ])('잘못된 언어 쿼리를 조회 전에 거부한다: %s', async (query) => {
    await request(app.getHttpServer()).get(`/resume?${query}`).expect(400);
    expect(service.getDocument).not.toHaveBeenCalled();
  });

  it.each([
    'Uppercase',
    'bad_slug',
    'bad--slug',
    '-bad',
    'a'.repeat(161),
    "x' OR 1=1",
  ])('잘못된 slug를 조회 전에 거부한다: %s', async (slug) => {
    await request(app.getHttpServer())
      .get(`/resume/details/${encodeURIComponent(slug)}`)
      .expect(400);
    expect(service.getDetail).not.toHaveBeenCalled();
  });

  it('목록과 상세 경로를 구분하고 본문은 상세에만 반환한다', async () => {
    const detail = resumeDetailSnapshot[0];
    const summary = {
      slug: detail.slug,
      title: detail.title,
      startDate: detail.startDate,
      endDate: detail.endDate,
    };
    service.getDetails.mockResolvedValue([summary]);
    service.getDetail.mockResolvedValue(detail);
    const list = await request(app.getHttpServer())
      .get('/resume/details')
      .expect(200);
    expect(list.body).toEqual({ success: true, data: [summary] });
    const response = await request(app.getHttpServer())
      .get(`/resume/details/${detail.slug}`)
      .expect(200);
    expect(response.body).toEqual({ success: true, data: detail });
  });

  it('없는 문서와 상세는 404이며 쓰기 endpoint를 제공하지 않는다', async () => {
    service.getDocument.mockRejectedValue(new NotFoundException());
    service.getDetail.mockRejectedValue(new NotFoundException());
    await request(app.getHttpServer()).get('/resume').expect(404);
    await request(app.getHttpServer())
      .get('/resume/details/missing')
      .expect(404);
    await request(app.getHttpServer())
      .post('/resume')
      .send({ title: '수정' })
      .expect(404);
  });

  it('DB 오류를 성공 본문으로 바꾸지 않는다', async () => {
    service.getDocument.mockRejectedValue(new Error('database unavailable'));
    service.getDetails.mockRejectedValue(new Error('database unavailable'));
    service.getDetail.mockRejectedValue(new Error('database unavailable'));
    await request(app.getHttpServer()).get('/resume').expect(500);
    await request(app.getHttpServer()).get('/resume/details').expect(500);
    await request(app.getHttpServer())
      .get('/resume/details/a-project')
      .expect(500);
  });
});
