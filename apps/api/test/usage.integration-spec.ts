import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { CreateUsageEvents1795000000001 } from '../src/migrations/1795000000001-create-usage-events';
import { createTestDataSourceOptions } from '../src/test-data-source';
import type { UsageEventDto } from '../src/usage/usage.dto';
import { UsageService } from '../src/usage/usage.service';
import { UsageController } from '../src/usage/usage.controller';
import { UsageIngestGuard, UsageReadGuard } from '../src/usage/usage.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const schemaName = `usage_${randomUUID().replaceAll('-', '')}_test`;

const createEvent = (
  overrides: Partial<UsageEventDto> = {},
): UsageEventDto => ({
  eventId: randomUUID(),
  visitorId: randomUUID(),
  sessionId: randomUUID(),
  eventName: 'page_view',
  path: '/ko-KR/game/wordle',
  ...overrides,
});

describe('usage analytics PostgreSQL integration', () => {
  let dataSource: DataSource;
  let service: UsageService;
  let app: INestApplication<Server>;
  const previousReadKey = process.env.USAGE_ANALYTICS_READ_KEY;
  const readKey = 'usage-http-integration-key-at-least-32-characters';

  beforeAll(async () => {
    if (!/^usage_[a-f0-9]{32}_test$/.test(schemaName)) {
      throw new Error('Refusing to manage a non-disposable test schema');
    }
    dataSource = new DataSource({
      ...createTestDataSourceOptions(),
      entities: [],
      migrations: [],
      // 모든 pool 연결을 이 테스트가 소유한 schema로 한정한다.
      extra: { options: `-c search_path=${schemaName}` },
    });
    await dataSource.initialize();
    await dataSource.query(`CREATE SCHEMA "${schemaName}"`);
    const queryRunner = dataSource.createQueryRunner();
    try {
      await new CreateUsageEvents1795000000001().up(queryRunner);
    } finally {
      await queryRunner.release();
    }
    const module = await Test.createTestingModule({
      controllers: [UsageController],
      providers: [
        UsageService,
        UsageIngestGuard,
        UsageReadGuard,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(UsageService);
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

  beforeEach(async () => {
    process.env.USAGE_ANALYTICS_READ_KEY = readKey;
    await dataSource.query('TRUNCATE TABLE "usage_events"');
  });

  afterEach(() => {
    if (previousReadKey === undefined)
      delete process.env.USAGE_ANALYTICS_READ_KEY;
    else process.env.USAGE_ANALYTICS_READ_KEY = previousReadKey;
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

  it('migration installs bounded fields, primary-key deduplication, timestamps and indexes', async () => {
    const indexes = await dataSource.query<Array<{ indexname: string }>>(
      'SELECT indexname FROM pg_indexes WHERE schemaname = $1 ORDER BY indexname',
      [schemaName],
    );
    expect(indexes.map((index) => index.indexname)).toEqual(
      expect.arrayContaining([
        'usage_events_pkey',
        'IDX_usage_events_created_at',
        'IDX_usage_events_event_time',
      ]),
    );
    const columns = await dataSource.query<Array<{ column_name: string }>>(
      'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position',
      [schemaName, 'usage_events'],
    );
    expect(columns.map((column) => column.column_name)).toEqual([
      'eventId',
      'visitorId',
      'sessionId',
      'eventName',
      'path',
      'feature',
      'durationMs',
      'createdAt',
    ]);
    const before = Date.now();
    const event = createEvent({ path: '/ko-KR/share/private-id' });
    await service.record(event);
    await service.record({ ...event, path: '/ja-JP/game/sky-drop' });
    const rows = await dataSource.query<
      Array<{ eventId: string; path: string; createdAt: Date }>
    >('SELECT "eventId", path, "createdAt" FROM usage_events');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      eventId: event.eventId,
      path: '/ko-KR/share/:id',
    });
    expect(rows[0].createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(rows[0].createdAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('uses inclusive/exclusive KST days and range-wide unique visitors instead of adding daily users', async () => {
    const visitorId = randomUUID();
    const firstSessionId = randomUUID();
    const secondSessionId = randomUUID();
    const entries: Array<[UsageEventDto, string]> = [
      [createEvent(), '2026-09-30T14:59:59.999Z'],
      [
        createEvent({ visitorId, sessionId: firstSessionId }),
        '2026-09-30T15:00:00.000Z',
      ],
      [
        createEvent({
          visitorId,
          sessionId: firstSessionId,
          eventName: 'game_started',
          feature: 'wordle',
        }),
        '2026-10-01T14:59:59.999Z',
      ],
      [
        createEvent({ visitorId, sessionId: secondSessionId }),
        '2026-10-01T15:00:00.000Z',
      ],
      [createEvent(), '2026-10-02T15:00:00.000Z'],
    ];
    for (const [event, createdAt] of entries) {
      await service.record(event);
      await dataSource.query(
        'UPDATE usage_events SET "createdAt" = $1 WHERE "eventId" = $2',
        [createdAt, event.eventId],
      );
    }
    const summary = await service.summarize({
      from: '2026-10-01',
      to: '2026-10-03',
    });
    expect(summary).toEqual({
      from: '2026-10-01',
      to: '2026-10-03',
      timezone: 'Asia/Seoul',
      totals: { events: 3, visitors: 1, sessions: 2, pageViews: 2 },
      daily: [
        {
          date: '2026-10-01',
          events: 2,
          visitors: 1,
          sessions: 1,
          pageViews: 1,
        },
        {
          date: '2026-10-02',
          events: 1,
          visitors: 1,
          sessions: 1,
          pageViews: 1,
        },
      ],
      paths: [
        { value: '/ko-KR/game/wordle', events: 3, visitors: 1, sessions: 2 },
      ],
      features: [{ value: 'wordle', events: 1, visitors: 1, sessions: 1 }],
      events: [
        { value: 'page_view', events: 2, visitors: 1, sessions: 2 },
        { value: 'game_started', events: 1, visitors: 1, sessions: 1 },
      ],
    });
    expect(JSON.stringify(summary)).not.toContain(visitorId);
    expect(JSON.stringify(summary)).not.toContain(firstSessionId);
  });

  it('returns zero counts and empty breakdowns for an unused range', async () => {
    expect(
      await service.summarize({ from: '2026-10-01', to: '2026-10-02' }),
    ).toEqual({
      from: '2026-10-01',
      to: '2026-10-02',
      timezone: 'Asia/Seoul',
      totals: { events: 0, visitors: 0, sessions: 0, pageViews: 0 },
      daily: [],
      paths: [],
      features: [],
      events: [],
    });
  });
  it('POST persists a canonical frontend event once and GET returns its wrapped summary', async () => {
    const event = createEvent({ path: '/ko-KR/share/:id' });
    for (let attempt = 0; attempt < 2; attempt++) {
      await request(app.getHttpServer())
        .post('/usage/events')
        .set('Origin', 'https://vscoke.icecoke.kr')
        .send(event)
        .expect(202)
        .expect({ success: true });
    }
    await dataSource.query(
      'UPDATE usage_events SET "createdAt" = $1 WHERE "eventId" = $2',
      ['2026-10-01T15:00:00Z', event.eventId],
    );
    const response = await request(app.getHttpServer())
      .get('/usage/summary?from=2026-10-01&to=2026-10-03')
      .set('Authorization', `Bearer ${readKey}`)
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(response.body).toEqual({
      success: true,
      data: {
        from: '2026-10-01',
        to: '2026-10-03',
        timezone: 'Asia/Seoul',
        totals: { events: 1, visitors: 1, sessions: 1, pageViews: 1 },
        daily: [
          {
            date: '2026-10-02',
            events: 1,
            visitors: 1,
            sessions: 1,
            pageViews: 1,
          },
        ],
        paths: [
          { value: '/ko-KR/share/:id', events: 1, visitors: 1, sessions: 1 },
        ],
        features: [],
        events: [{ value: 'page_view', events: 1, visitors: 1, sessions: 1 }],
      },
    });
  });

  it('POST rejects arbitrary fields, invalid feature pairs and foreign origins without storing them', async () => {
    await request(app.getHttpServer())
      .post('/usage/events')
      .send({ ...createEvent(), question: 'private text' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/usage/events')
      .send(createEvent({ eventName: 'chat_submitted', feature: 'wordle' }))
      .expect(400);
    await request(app.getHttpServer())
      .post('/usage/events')
      .set('Origin', 'https://foreign.example.com')
      .send(createEvent())
      .expect(403);
    const [counts] = await dataSource.query<Array<{ count: string }>>(
      'SELECT count(*) FROM usage_events',
    );
    expect(counts.count).toBe('0');
  });

  it('GET requires the configured read key and fails closed without a valid configuration', async () => {
    const endpoint = '/usage/summary?from=2026-10-01&to=2026-10-03';
    await request(app.getHttpServer()).get(endpoint).expect(401);
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', `Bearer ${'x'.repeat(readKey.length)}`)
      .expect(401);
    delete process.env.USAGE_ANALYTICS_READ_KEY;
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', `Bearer ${readKey}`)
      .expect(503);
  });
});
