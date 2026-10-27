import type { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { CareerDataGuard } from './career-data.guard';
import {
  CareerDataUpsertDto,
  ResumeVersionSaveDto,
  ResumeDetailSaveDto,
  validEvidence,
  validMetric,
} from './career-data.dto';
import { CareerDataService, careerContentHash } from './career-data.service';
const fixture = {
  key: 'pe',
  kind: 'base',
  track: 'product-engineer',
  locale: 'ko-KR',
  visibility: 'private',
  expectedRevision: 0,
  expectedCurrentVersionId: null,
  versionName: 'v29',
  content: {
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
  },
  dependencies: [],
};
describe('경력 관리 입력과 인증', () => {
  const old = process.env.CAREER_DATA_WRITE_KEY;
  afterEach(() => {
    if (old === undefined) delete process.env.CAREER_DATA_WRITE_KEY;
    else process.env.CAREER_DATA_WRITE_KEY = old;
  });
  const context = (authorization?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization } }),
      }),
    }) as ExecutionContext;
  it('키 미설정과 잘못된 bearer는 fail closed', () => {
    const guard = new CareerDataGuard();
    delete process.env.CAREER_DATA_WRITE_KEY;
    expect(() => guard.canActivate(context())).toThrow(
      ServiceUnavailableException,
    );
    process.env.CAREER_DATA_WRITE_KEY = 'x'.repeat(32);
    expect(() =>
      guard.canActivate(context('Bearer ' + 'y'.repeat(32))),
    ).toThrow(UnauthorizedException);
    expect(guard.canActivate(context('Bearer ' + 'x'.repeat(32)))).toBe(true);
  });
  it('public content 내부 unknown 필드와 누락 nested 객체를 거부한다', async () => {
    const validateInput = (value: unknown) =>
      validate(plainToInstance(ResumeVersionSaveDto, value), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
    expect(await validateInput(fixture)).toEqual([]);
    expect(await validateInput({ ...fixture, content: [] })).not.toEqual([]);
    expect(
      await validateInput({
        ...fixture,
        content: { ...fixture.content, contact: [] },
      }),
    ).not.toEqual([]);
    expect(
      await validateInput({
        ...fixture,
        content: { ...fixture.content, careers: [[]] },
      }),
    ).not.toEqual([]);
    expect(
      await validateInput({
        ...fixture,
        content: {
          ...fixture.content,
          contact: { ...fixture.content.contact, secret: 'internal' },
        },
      }),
    ).not.toEqual([]);
    expect(await validateInput({ ...fixture, content: undefined })).not.toEqual(
      [],
    );
    expect(
      await validateInput({ ...fixture, expectedCurrentVersionId: undefined }),
    ).not.toEqual([]);
  });
  it('UUIDv5 원본과 기본 private을 수용하고 nested 알 수 없는 필드는 거부한다', async () => {
    const value = {
      experiences: [
        {
          id: '5bb2635b-3510-51a8-8ded-0b9d3bbb3c76',
          expectedRevision: 0,
          company: 'Synthetic',
          title: 'Title',
        },
      ],
      facts: [],
      bullets: [],
      keywords: [],
    };
    expect(
      await validate(plainToInstance(CareerDataUpsertDto, value), {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(CareerDataUpsertDto, {
          ...value,
          experiences: [{ ...value.experiences[0], evil: true }],
        }),
        { whitelist: true, forbidNonWhitelisted: true },
      ),
    ).not.toEqual([]);
  });
  it('출처 날짜와 측정 조건의 명시적 null을 검사한다', () => {
    expect(
      validEvidence([
        {
          kind: 'document',
          locator: 'private/path',
          as_of: '2026-02-28',
          line: 3,
        },
      ]),
    ).toBe(true);
    expect(
      validEvidence([
        { kind: 'document', locator: 'private/path', as_of: '2026-02-30' },
      ]),
    ).toBe(false);
    expect(
      validMetric({
        value: 3,
        unit: 'ms',
        measured_by: null,
        environment: null,
        period: null,
        conditions: null,
      }),
    ).toBe(true);
    expect(validMetric({ value: 3, unit: 'ms' })).toBe(false);
  });
  it('공유 상세 RAG 투영은 특정 언어로 한정하지 않는다', async () => {
    const query = jest
      .fn<Promise<Record<string, unknown>[]>, [string, unknown[]?]>()
      .mockImplementation((sql) =>
        Promise.resolve(
          sql.startsWith('INSERT INTO resume_source_items')
            ? [{ id: 'source' }]
            : sql.startsWith('INSERT INTO resume_details')
              ? [{ slug: 'shared-detail' }]
              : [],
        ),
      );
    const db = {
      transaction: (
        work: (manager: { query: typeof query }) => Promise<unknown>,
      ) => work({ query }),
    } as unknown as DataSource;
    await new CareerDataService(db).saveDetail(
      'shared-detail',
      plainToInstance(ResumeDetailSaveDto, {
        expectedRevision: 0,
        title: 'Shared detail',
        content: '# Shared detail',
        visibility: 'public',
        dependencies: [],
      }),
    );
    const insert = query.mock.calls.find(([sql]) =>
      sql.startsWith('INSERT INTO resume_source_items'),
    );
    expect(insert?.[1]?.[0]).toBe('project_detail');
    expect(insert?.[1]?.[4]).toBeNull();
  });
  it('hash는 object 키 순서와 무관하고 본문 변경을 구분한다', () => {
    expect(careerContentHash({ a: 1, b: 2 })).toBe(
      careerContentHash({ b: 2, a: 1 }),
    );
    expect(careerContentHash({ a: 1 })).not.toBe(careerContentHash({ a: 2 }));
  });
});
