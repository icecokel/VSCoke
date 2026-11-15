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
  CareerCurationDto,
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
  describe('분류 메타데이터 입력', () => {
    const bullet = {
      id: '5bb2635b-3510-51a8-8ded-0b9d3bbb3c76',
      expectedCurationRevision: 0,
      tracks: ['pe', 'fe'],
      tier: 'representative',
      variantGroup: 'oprimed-pre-push-gate',
      aiInvolvement: 'directed',
      curationNote: '대표 항목 근거',
    };
    const fact = {
      id: '6bb2635b-3510-51a8-8ded-0b9d3bbb3c76',
      expectedCurationRevision: 3,
      evidenceLevel: 'source_verified',
    };
    const validateCuration = (value: unknown) =>
      validate(plainToInstance(CareerCurationDto, value), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
    it('계약의 값 집합과 명시적 null을 수용한다', async () => {
      expect(
        await validateCuration({ bullets: [bullet], facts: [fact] }),
      ).toEqual([]);
      expect(
        await validateCuration({
          bullets: [
            {
              ...bullet,
              tracks: [],
              tier: null,
              variantGroup: null,
              aiInvolvement: null,
              curationNote: null,
            },
          ],
          facts: [{ ...fact, evidenceLevel: null }],
        }),
      ).toEqual([]);
      expect(await validateCuration({ bullets: [], facts: [] })).toEqual([]);
    });
    it.each([
      ['알 수 없는 트랙', { tracks: ['be'] }],
      ['중복 트랙', { tracks: ['fe', 'fe'] }],
      ['트랙 배열 아님', { tracks: 'fe' }],
      ['잘못된 등급', { tier: 'top' }],
      ['대문자 변형 키', { variantGroup: 'Oprimed' }],
      ['81자 변형 키', { variantGroup: 'a'.repeat(81) }],
      ['잘못된 AI 관여', { aiInvolvement: 'partial' }],
      ['공백 메모', { curationNote: '  ' }],
      ['2001자 메모', { curationNote: 'a'.repeat(2001) }],
      ['음수 revision', { expectedCurationRevision: -1 }],
      ['생략한 등급', { tier: undefined }],
      ['내용 status 동봉', { status: 'ready' }],
      ['내용 revision 동봉', { expectedRevision: 1 }],
    ])('불렛 %s는 거부한다', async (_name, patch) => {
      expect(
        await validateCuration({
          bullets: [{ ...bullet, ...patch }],
          facts: [],
        }),
      ).not.toEqual([]);
    });
    it('사실의 잘못된 근거 수준, 생략, 내용 필드와 중복 ID를 거부한다', async () => {
      for (const facts of [
        [{ ...fact, evidenceLevel: 'inference' }],
        [{ ...fact, evidenceLevel: undefined }],
        [{ ...fact, content: 'changed' }],
        [fact, fact],
      ])
        expect(await validateCuration({ bullets: [], facts })).not.toEqual([]);
      expect(
        await validateCuration({ bullets: [bullet, bullet], facts: [] }),
      ).not.toEqual([]);
      expect(await validateCuration({ bullets: [bullet] })).not.toEqual([]);
    });
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
