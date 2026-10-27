import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestDataSourceOptions } from '../src/test-data-source';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { CreateResumeContent1795000000003 } from '../src/migrations/1795000000003-create-resume-content';
import {
  resumeDetailSnapshot,
  resumeDocumentSnapshot,
} from '../src/migrations/data/resume-content-snapshot';
import { ResumeDocument } from '../src/resume/entities/resume-document.entity';
import { ResumeDetail } from '../src/resume/entities/resume-detail.entity';
import { ResumeController } from '../src/resume/resume.controller';
import { ResumeService } from '../src/resume/resume.service';

const schemaName = `resume_${randomUUID().replaceAll('-', '')}_test`;

describe('이력서 PostgreSQL migration·조회 통합', () => {
  let dataSource: DataSource;
  let app: INestApplication<Server>;
  const migration = new CreateResumeContent1795000000003();
  const migrate = async () => {
    const runner = dataSource.createQueryRunner();
    try {
      await migration.up(runner);
    } finally {
      await runner.release();
    }
  };

  beforeAll(async () => {
    if (!/^resume_[a-f0-9]{32}_test$/.test(schemaName)) {
      throw new Error('Refusing to manage a non-disposable test schema');
    }
    dataSource = new DataSource({
      ...createTestDataSourceOptions(),
      schema: schemaName,
      entities: [ResumeDocument, ResumeDetail],
      migrations: [],
      extra: { options: `-c search_path=${schemaName}` },
    });
    await dataSource.initialize();
    await dataSource.query(`CREATE SCHEMA "${schemaName}"`);
    await migrate();
    const module = await Test.createTestingModule({
      controllers: [ResumeController],
      providers: [
        ResumeService,
        {
          provide: getRepositoryToken(ResumeDocument),
          useValue: dataSource.getRepository(ResumeDocument),
        },
        {
          provide: getRepositoryToken(ResumeDetail),
          useValue: dataSource.getRepository(ResumeDetail),
        },
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
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (!dataSource?.isInitialized) return;
    try {
      await dataSource.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } finally {
      await dataSource.destroy();
    }
  });

  it('migration이 세 언어·모든 상세를 초기 적재하고 HTTP로 그대로 반환한다', async () => {
    expect(await dataSource.getRepository(ResumeDocument).count()).toBe(3);
    expect(await dataSource.getRepository(ResumeDetail).count()).toBe(10);
    for (const document of resumeDocumentSnapshot) {
      const response = await request(app.getHttpServer())
        .get(`/resume?locale=${document.locale}`)
        .expect(200);
      expect(response.body).toEqual({ success: true, data: document });
    }
    for (const detail of resumeDetailSnapshot) {
      const response = await request(app.getHttpServer())
        .get(`/resume/details/${detail.slug}`)
        .expect(200);
      expect(response.body).toEqual({ success: true, data: detail });
    }
    const response = await request(app.getHttpServer())
      .get('/resume/details')
      .expect(200);
    expect(response.body).toEqual({
      success: true,
      data: resumeDetailSnapshot.map(({ slug, title, startDate, endDate }) => ({
        slug,
        title,
        startDate,
        endDate,
      })),
    });
  });

  it('DB 수정은 재시작 없이 반영하고 migration 재실행은 기존 본문을 보존한다', async () => {
    const documents = dataSource.getRepository(ResumeDocument);
    const details = dataSource.getRepository(ResumeDetail);
    const original = await documents.findOneByOrFail({ locale: 'ko-KR' });
    const detail = resumeDetailSnapshot[0];
    try {
      await documents.update('ko-KR', {
        content: { ...original.content, title: 'DB 수정 제목' },
      });
      await details.update(detail.slug, { content: '# DB 수정 상세' });
      await migrate();
      await migrate();
      const documentResponse = await request(app.getHttpServer())
        .get('/resume')
        .expect(200);
      expect(documentResponse.body).toMatchObject({
        success: true,
        data: { title: 'DB 수정 제목' },
      });
      const detailResponse = await request(app.getHttpServer())
        .get(`/resume/details/${detail.slug}`)
        .expect(200);
      expect(detailResponse.body).toMatchObject({
        success: true,
        data: { content: '# DB 수정 상세' },
      });
      expect(await documents.count()).toBe(3);
      expect(await details.count()).toBe(10);
    } finally {
      await documents.save(original);
      await details.update(detail.slug, { content: detail.content });
    }
  });

  it('없는 DB 행은 404이고 날짜 없는 상세는 null 필드를 노출하지 않는다', async () => {
    const details = dataSource.getRepository(ResumeDetail);
    await request(app.getHttpServer())
      .get('/resume/details/missing-project')
      .expect(404);
    await details.insert({
      slug: 'without-dates',
      title: '날짜 없음',
      content: '# 본문',
      startDate: null,
      endDate: null,
    });
    try {
      const response = await request(app.getHttpServer())
        .get('/resume/details/without-dates')
        .expect(200);
      expect(response.body).toEqual({
        success: true,
        data: { slug: 'without-dates', title: '날짜 없음', content: '# 본문' },
      });
    } finally {
      await details.delete('without-dates');
    }
  });
});
