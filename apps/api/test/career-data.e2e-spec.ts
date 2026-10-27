import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import {
  CareerDataController,
  ResumeManagementController,
} from '../src/career-data/career-data.controller';
import { CareerDataGuard } from '../src/career-data/career-data.guard';
import { CareerDataService } from '../src/career-data/career-data.service';

const content = {
  name: 'Synthetic',
  title: 'Test',
  contact: { email: 'test@example.test', phone: '' },
  introduction: [],
  totalExperience: '',
  lastUpdated: '2026.10',
  careers: [],
  education: [],
  skills: [],
  certifications: [],
  links: [],
  personalProjects: [],
};
const version = {
  key: 'pe',
  kind: 'base',
  track: 'product-engineer',
  locale: 'ko-KR',
  expectedRevision: 0,
  expectedCurrentVersionId: null,
  versionName: 'v1',
  content,
  dependencies: [],
};
describe('경력 관리 HTTP trust boundary', () => {
  let app: INestApplication<Server>;
  const originalKey = process.env.CAREER_DATA_WRITE_KEY;
  const token = 'synthetic-write-key-'.repeat(3);
  const service = {
    upsertData: jest.fn(),
    saveVersion: jest.fn(),
    getData: jest.fn(),
    listResumes: jest.fn(),
    deleteCareer: jest.fn(),
    deleteResume: jest.fn(),
    deleteVersion: jest.fn(),
    deleteDetail: jest.fn(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CareerDataController, ResumeManagementController],
      providers: [
        CareerDataGuard,
        { provide: CareerDataService, useValue: service },
      ],
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
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.CAREER_DATA_WRITE_KEY = token;
  });
  afterAll(async () => {
    await app.close();
    if (originalKey === undefined) delete process.env.CAREER_DATA_WRITE_KEY;
    else process.env.CAREER_DATA_WRITE_KEY = originalKey;
  });
  it('미설정과 잘못된 bearer는 service 실행 전에 거부한다', async () => {
    delete process.env.CAREER_DATA_WRITE_KEY;
    await request(app.getHttpServer()).get('/career-data').expect(503);
    process.env.CAREER_DATA_WRITE_KEY = token;
    await request(app.getHttpServer())
      .get('/career-data')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    expect(service.getData).not.toHaveBeenCalled();
  });
  it.each([null, 3, 'bad', [], {}])(
    '잘못된 원본 배열 원소 %j는 500 없이 400',
    async (element: unknown) => {
      await request(app.getHttpServer())
        .put('/career-data')
        .set('Authorization', `Bearer ${token}`)
        .send({ experiences: [element], facts: [], bullets: [], keywords: [] })
        .expect(400);
      expect(service.upsertData).not.toHaveBeenCalled();
    },
  );
  it.each([null, 3, 'bad', [], {}])(
    '잘못된 dependency 배열 원소 %j는 500 없이 400',
    async (element: unknown) => {
      await request(app.getHttpServer())
        .post('/resume-management/versions')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...version, dependencies: [element] })
        .expect(400);
      expect(service.saveVersion).not.toHaveBeenCalled();
    },
  );
  it.each([
    [],
    { ...content, contact: [] },
    { ...content, careers: [[]] },
    { ...content, contact: { ...content.contact, secret: 'internal' } },
  ])('잘못된 content 객체는 거부한다', async (invalid: unknown) => {
    await request(app.getHttpServer())
      .post('/resume-management/versions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...version, content: invalid })
      .expect(400);
    expect(service.saveVersion).not.toHaveBeenCalled();
  });
  it('일반 Google 토큰 대신 관리 Bearer로만 쓰고 기본 private을 전달한다', async () => {
    service.saveVersion.mockResolvedValue({ versionId: 'synthetic' });
    const response = await request(app.getHttpServer())
      .post('/resume-management/versions')
      .set('Authorization', `Bearer ${token}`)
      .send(version)
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.saveVersion).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'private' }),
    );
  });
  it('관리 조회는 includeDeleted의 명시적 boolean만 허용한다', async () => {
    for (const [path, handler] of [
      ['/career-data', service.getData],
      ['/resume-management/resumes', service.listResumes],
    ] as const) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(handler).toHaveBeenLastCalledWith(false);
      await request(app.getHttpServer())
        .get(`${path}?includeDeleted=true`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(handler).toHaveBeenLastCalledWith(true);
      for (const invalid of ['1', 'TRUE', '', 'yes'])
        await request(app.getHttpServer())
          .get(`${path}?includeDeleted=${invalid}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
    }
  });
  it.each([
    '/career-data/fact/5bb2635b-3510-51a8-8ded-0b9d3bbb3c76',
    '/resume-management/resumes/5bb2635b-3510-51a8-8ded-0b9d3bbb3c76',
    '/resume-management/versions/5bb2635b-3510-51a8-8ded-0b9d3bbb3c76',
    '/resume-management/details/synthetic-detail',
  ])('DELETE %s는 인증과 revision DTO를 검사한다', async (path) => {
    await request(app.getHttpServer())
      .delete(path)
      .send({ expectedRevision: 1 })
      .expect(401);
    await request(app.getHttpServer())
      .delete(path)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .delete(path)
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision: 1, restore: true })
      .expect(400);
    const response = await request(app.getHttpServer())
      .delete(path)
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision: 1 })
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('원본 kind와 UUID 경계는 임의 SQL 식별자를 허용하지 않는다', async () => {
    await request(app.getHttpServer())
      .delete('/career-data/resumes/5bb2635b-3510-51a8-8ded-0b9d3bbb3c76')
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision: 1 })
      .expect(400);
    await request(app.getHttpServer())
      .delete('/career-data/fact/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision: 1 })
      .expect(400);
    expect(service.deleteCareer).not.toHaveBeenCalled();
  });
});
