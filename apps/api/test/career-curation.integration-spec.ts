import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestDataSourceOptions } from '../src/test-data-source';
import { CreateResumeRagTables1760000000000 } from '../src/migrations/1760000000000-create-resume-rag-tables';
import { CreateResumeRagKeywords1793836800000 } from '../src/migrations/1793836800000-create-resume-rag-keywords';
import { CreateResumeRagChatLogs1794873600000 } from '../src/migrations/1794873600000-create-resume-rag-chat-logs';
import { CreateResumeChatConversations1795000000000 } from '../src/migrations/1795000000000-create-resume-chat-conversations';
import { CreateSharedCareerData1795000000004 } from '../src/migrations/1795000000004-create-shared-career-data';
import { AddResumeSoftDelete1795000000005 } from '../src/migrations/1795000000005-add-resume-soft-delete';
import { AddCareerCuration1795000000006 } from '../src/migrations/1795000000006-add-career-curation';
import { CareerDataService } from '../src/career-data/career-data.service';
import {
  CareerCurationDto,
  CareerDataUpsertDto,
  ResumeVersionSaveDto,
} from '../src/career-data/career-data.dto';
import { ResumeService } from '../src/resume/resume.service';
import { careerSourceCondition } from '../src/resume-rag/resume-source-eligibility';
import { createLegacyResumeTables } from './support/synthetic-resume-migration';

const schemaName = `curation_${randomUUID().replaceAll('-', '')}_test`;
const curationColumns = new Set([
  'tracks',
  'tier',
  'variant_group',
  'ai_involvement',
  'curation_note',
  'curation_revision',
  'curated_at',
  'evidence_level',
]);
const withoutCuration = (rows: Record<string, unknown>[]) =>
  rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).filter(([column]) => !curationColumns.has(column)),
    ),
  );
const content = {
  name: 'Synthetic Person',
  title: 'Synthetic Resume',
  contact: { email: 'test@example.test', phone: '' },
  introduction: ['Synthetic'],
  totalExperience: '1 year',
  lastUpdated: '2026.11',
  careers: [],
  education: [],
  skills: [],
  certifications: [],
  links: [],
  personalProjects: [],
};

describe('경력 분류 메타데이터 PostgreSQL 저장', () => {
  let db: DataSource;
  let writer: CareerDataService;
  let reader: ResumeService;
  const migration = new AddCareerCuration1795000000006();
  const runMigration = async (direction: 'up' | 'down') => {
    const runner = db.createQueryRunner();
    try {
      await migration[direction](runner);
    } finally {
      await runner.release();
    }
  };
  const seed = async () => {
    const ids = {
      experience: randomUUID(),
      facts: [randomUUID(), randomUUID()],
      bullets: [randomUUID(), randomUUID()],
      keywords: [randomUUID(), randomUUID()],
    };
    const batch = plainToInstance(CareerDataUpsertDto, {
      experiences: [
        {
          id: ids.experience,
          expectedRevision: 0,
          company: 'Synthetic Co',
          title: 'Internal project',
          publicTitle: 'Public project',
        },
      ],
      facts: ids.facts.map((id, index) => ({
        id,
        experienceId: ids.experience,
        expectedRevision: 0,
        kind: 'action',
        content: `Synthetic fact ${index}`,
        verificationStatus: 'confirmed',
        visibility: 'public',
        evidence: [
          { kind: 'code', locator: 'private/source.ts', as_of: '2026-11-01' },
        ],
      })),
      keywords: ids.keywords.map((id, index) => ({
        id,
        expectedRevision: 0,
        key: `kw-${randomUUID()}`,
        label: `Synthetic keyword ${index}`,
        kind: 'technology',
        aliases: [],
      })),
      bullets: ids.bullets.map((id, index) => ({
        id,
        experienceId: ids.experience,
        expectedRevision: 0,
        text: `Synthetic bullet ${index}`,
        focus: 'focus',
        status: 'ready',
        visibility: 'public',
        facts: [{ factId: ids.facts[index], factRevision: 1 }],
        keywordIds: [ids.keywords[0]],
        sourceRefs: [{ path: 'private/source.ts' }],
        reviewNote: 'internal note',
      })),
    });
    await writer.upsertData(batch);
    return { ids, batch };
  };
  const tableState = async () => ({
    experiences: await db.query<Record<string, unknown>[]>(
      'SELECT * FROM career_experiences ORDER BY id',
    ),
    facts: await db.query<Record<string, unknown>[]>(
      'SELECT * FROM career_facts ORDER BY id',
    ),
    bullets: await db.query<Record<string, unknown>[]>(
      'SELECT * FROM career_bullets ORDER BY id',
    ),
    bulletFacts: await db.query<Record<string, unknown>[]>(
      'SELECT * FROM career_bullet_facts ORDER BY bullet_id,fact_id',
    ),
    bulletKeywords: await db.query<Record<string, unknown>[]>(
      'SELECT * FROM career_bullet_keywords ORDER BY bullet_id,keyword_id',
    ),
    keywords: await db.query<Record<string, unknown>[]>(
      'SELECT * FROM career_keywords ORDER BY id',
    ),
    sources: await db.query<Record<string, unknown>[]>(
      'SELECT * FROM resume_source_items ORDER BY id',
    ),
    dependencies: await db.query<Record<string, unknown>[]>(
      'SELECT * FROM resume_content_dependencies ORDER BY id',
    ),
    resumes: await db.query<Record<string, unknown>[]>(
      'SELECT * FROM resumes ORDER BY id',
    ),
    eligibleSources: await db.query<Record<string, unknown>[]>(
      `SELECT s.id FROM resume_source_items s WHERE ${careerSourceCondition('s')} ORDER BY s.id`,
    ),
  });
  const contentState = async () => {
    const state = await tableState();
    return {
      ...state,
      facts: withoutCuration(state.facts),
      bullets: withoutCuration(state.bullets),
    };
  };
  const curation = (value: unknown) =>
    plainToInstance(CareerCurationDto, value);
  const bulletCuration = (id: string, expectedCurationRevision = 0) => ({
    id,
    expectedCurationRevision,
    tracks: ['pe', 'fe'],
    tier: 'representative',
    variantGroup: 'synthetic-group',
    aiInvolvement: 'directed',
    curationNote: '대표 항목',
  });
  let preexisting: Awaited<ReturnType<typeof seed>>;
  let beforeMigration: Awaited<ReturnType<typeof tableState>>;

  beforeAll(async () => {
    db = new DataSource({
      ...createTestDataSourceOptions(),
      type: 'postgres',
      schema: schemaName,
      entities: [],
      migrations: [],
      extra: { options: `-c search_path=${schemaName},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schemaName}"`);
    const runner = db.createQueryRunner();
    try {
      await new CreateResumeRagTables1760000000000().up(runner);
      await new CreateResumeChatConversations1795000000000().up(runner);
      await createLegacyResumeTables(runner);
      await new CreateSharedCareerData1795000000004().up(runner);
      await new CreateResumeRagKeywords1793836800000().up(runner);
      await new CreateResumeRagChatLogs1794873600000().up(runner);
      await new AddResumeSoftDelete1795000000005().up(runner);
    } finally {
      await runner.release();
    }
    writer = new CareerDataService(db);
    reader = new ResumeService(db);
    // 분류 컬럼이 생기기 전의 운영 행을 재현한다.
    preexisting = await seed();
    beforeMigration = await tableState();
    await runMigration('up');
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await db.destroy();
    }
  });

  it('migration은 기존 행의 값을 유지하고 분류 컬럼을 미분류 기본값으로 채운다', async () => {
    const after = await tableState();
    expect(withoutCuration(after.bullets)).toEqual(beforeMigration.bullets);
    expect(withoutCuration(after.facts)).toEqual(beforeMigration.facts);
    expect({ ...after, bullets: [], facts: [] }).toEqual({
      ...beforeMigration,
      bullets: [],
      facts: [],
    });
    expect(after.eligibleSources.length).toBeGreaterThan(0);
    for (const bullet of after.bullets)
      expect(bullet).toMatchObject({
        tracks: [],
        tier: null,
        variant_group: null,
        ai_involvement: null,
        curation_note: null,
        curation_revision: 0,
        curated_at: null,
      });
    for (const fact of after.facts)
      expect(fact).toMatchObject({
        evidence_level: null,
        curation_revision: 0,
        curated_at: null,
      });
    const snapshot = await writer.getData();
    expect(snapshot.bullets[0]).toHaveProperty('variant_group', null);
    expect(snapshot.facts[0]).toHaveProperty('evidence_level', null);
  });

  it.each([
    ["tracks='{be}'", 'career_bullets'],
    ["tracks='{pe,fe}'", 'career_bullets'],
    ["tracks='{fe,fe}'", 'career_bullets'],
    ["tracks='{NULL}'", 'career_bullets'],
    ["tier='top'", 'career_bullets'],
    ["variant_group='Bad_Group'", 'career_bullets'],
    [`variant_group='${'a'.repeat(81)}'`, 'career_bullets'],
    ["ai_involvement='partial'", 'career_bullets'],
    ["curation_note=' '", 'career_bullets'],
    [`curation_note='${'a'.repeat(2001)}'`, 'career_bullets'],
    ['curation_revision=-1', 'career_bullets'],
    ["evidence_level='inference'", 'career_facts'],
    ['curation_revision=-1', 'career_facts'],
  ])('CHECK 제약은 %s를 거부한다', async (assignment, table) => {
    const id =
      table === 'career_bullets'
        ? preexisting.ids.bullets[0]
        : preexisting.ids.facts[0];
    await expect(
      db.query(`UPDATE ${table} SET ${assignment} WHERE id=$1`, [id]),
    ).rejects.toThrow('check constraint');
  });

  it('분류 PATCH는 내용 revision·status·updated_at·사실 연결·공개 출력을 바꾸지 않는다', async () => {
    const { ids } = preexisting;
    const resumeKey = `curation-${randomUUID()}`;
    await writer.saveVersion(
      plainToInstance(ResumeVersionSaveDto, {
        key: resumeKey,
        kind: 'base',
        track: 'product-engineer',
        locale: 'ko-KR',
        visibility: 'public',
        expectedRevision: 0,
        expectedCurrentVersionId: null,
        versionName: 'v1',
        content,
        dependencies: [{ kind: 'bullet', id: ids.bullets[0], revision: 1 }],
      }),
    );
    await writer.publishFact(ids.facts[0], 1);
    const before = await contentState();
    const publicResume = await reader.getDocument('ko-KR', resumeKey);

    const result = await writer.curateData(
      curation({
        bullets: ids.bullets.map((id) => bulletCuration(id)),
        facts: [
          {
            id: ids.facts[0],
            expectedCurationRevision: 0,
            evidenceLevel: 'source_verified',
          },
        ],
      }),
    );

    expect(result.bullets.map((row) => row.curationRevision)).toEqual([1, 1]);
    expect(result.facts).toEqual([
      expect.objectContaining({ id: ids.facts[0], curationRevision: 1 }),
    ]);
    expect(await contentState()).toEqual(before);
    expect(await reader.getDocument('ko-KR', resumeKey)).toEqual(publicResume);
    const [bullet] = await db.query<Record<string, unknown>[]>(
      'SELECT * FROM career_bullets WHERE id=$1',
      [ids.bullets[0]],
    );
    expect(bullet).toMatchObject({
      tracks: ['fe', 'pe'],
      tier: 'representative',
      variant_group: 'synthetic-group',
      ai_involvement: 'directed',
      curation_note: '대표 항목',
      curation_revision: 1,
      status: 'ready',
      revision: 1,
    });
    expect(bullet.curated_at).toBeInstanceOf(Date);
    const snapshot = await writer.getData();
    expect(snapshot.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ids.facts[0],
          evidence_level: 'source_verified',
          curation_revision: 1,
        }),
      ]),
    );
  });

  it('하나라도 오래된 curation_revision이면 앞선 행까지 전체를 되돌린다', async () => {
    const { ids } = await seed();
    const before = await tableState();
    await expect(
      writer.curateData(
        curation({
          bullets: [
            bulletCuration(ids.bullets[0]),
            bulletCuration(ids.bullets[1], 1),
          ],
          facts: [
            {
              id: ids.facts[0],
              expectedCurationRevision: 0,
              evidenceLevel: 'user_statement',
            },
          ],
        }),
      ),
    ).rejects.toThrow(ConflictException);
    expect(await tableState()).toEqual(before);
    await expect(
      writer.curateData(
        curation({
          bullets: [bulletCuration(ids.bullets[0])],
          facts: [
            {
              id: ids.facts[0],
              expectedCurationRevision: 2,
              evidenceLevel: 'user_statement',
            },
          ],
        }),
      ),
    ).rejects.toThrow('curation_revision 불일치');
    expect(await tableState()).toEqual(before);
  });

  it('삭제·없는 원본과 DB 제약 위반도 전체를 되돌린다', async () => {
    const { ids } = await seed();
    await writer.deleteCareer('bullet', ids.bullets[1], 1);
    const before = await tableState();
    for (const bullets of [
      [bulletCuration(ids.bullets[0]), bulletCuration(ids.bullets[1])],
      [bulletCuration(ids.bullets[0]), bulletCuration(randomUUID())],
    ])
      await expect(
        writer.curateData(curation({ bullets, facts: [] })),
      ).rejects.toThrow(ConflictException);
    // DTO를 우회한 값도 DB CHECK가 400으로 막고 앞선 행까지 되돌린다.
    for (const tracks of [['xx'], ['fe', 'fe']])
      await expect(
        writer.curateData(
          curation({
            bullets: [
              bulletCuration(ids.bullets[0]),
              { ...bulletCuration(preexisting.ids.bullets[1], 1), tracks },
            ],
            facts: [],
          }),
        ),
      ).rejects.toThrow(BadRequestException);
    await expect(
      writer.curateData(
        curation({
          bullets: [],
          facts: [
            {
              id: ids.facts[0],
              expectedCurationRevision: 0,
              evidenceLevel: 'source_verified',
            },
            {
              id: ids.facts[1],
              expectedCurationRevision: 0,
              evidenceLevel: 'guess',
            },
          ],
        }),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(await tableState()).toEqual(before);
  });

  it('기존 PUT 수정은 분류 값을 보존하고 분류 revision은 내용 revision과 독립적이다', async () => {
    const { ids, batch } = await seed();
    await writer.curateData(
      curation({ bullets: [bulletCuration(ids.bullets[0])], facts: [] }),
    );
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [],
        facts: [],
        keywords: [],
        bullets: [
          { ...batch.bullets[0], expectedRevision: 1, text: 'Changed text' },
        ],
      }),
    );
    const [bullet] = await db.query<Record<string, unknown>[]>(
      'SELECT * FROM career_bullets WHERE id=$1',
      [ids.bullets[0]],
    );
    expect(bullet).toMatchObject({
      revision: 2,
      curation_revision: 1,
      tier: 'representative',
      variant_group: 'synthetic-group',
    });
    await writer.curateData(
      curation({
        bullets: [{ ...bulletCuration(ids.bullets[0], 1), tier: null }],
        facts: [],
      }),
    );
    expect(
      await db.query(
        'SELECT revision,curation_revision,tier FROM career_bullets WHERE id=$1',
        [ids.bullets[0]],
      ),
    ).toEqual([{ revision: 2, curation_revision: 2, tier: null }]);
  });

  it('경험 기간·제품만 PUT하면 경험 revision만 오르고 사실·불렛·공개 원문은 유지된다', async () => {
    const { ids, batch } = await seed();
    const before = await tableState();
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [
          {
            ...batch.experiences[0],
            expectedRevision: 1,
            project: 'Synthetic product',
            periodStart: '2024-01',
            periodEnd: '2024-06',
          },
        ],
        facts: [],
        bullets: [],
        keywords: [],
      }),
    );
    const after = await tableState();
    expect({ ...after, experiences: [] }).toEqual({
      ...before,
      experiences: [],
    });
    expect(
      after.experiences.find((row) => row.id === ids.experience),
    ).toMatchObject({
      revision: 2,
      project: 'Synthetic product',
      period_start: '2024-01',
      period_end: '2024-06',
      public_title: 'Public project',
    });
  });

  it('키워드 별칭 PUT은 불렛과 공개 원문을 바꾸지 않는다', async () => {
    const { ids, batch } = await seed();
    const before = await tableState();
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [],
        facts: [],
        bullets: [],
        keywords: [
          { ...batch.keywords[0], expectedRevision: 1, aliases: ['alias'] },
        ],
      }),
    );
    const after = await tableState();
    expect({ ...after, keywords: [] }).toEqual({ ...before, keywords: [] });
    expect(
      after.keywords.find((row) => row.id === ids.keywords[0]),
    ).toMatchObject({ revision: 2, aliases: ['alias'] });
  });

  it('불렛 keywordIds PUT은 status를 유지하지만 내용 revision과 공개 불렛 RAG 원문을 바꾼다', async () => {
    const { ids, batch } = await seed();
    const before = await tableState();
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [],
        facts: [],
        keywords: [],
        bullets: [
          {
            ...batch.bullets[0],
            expectedRevision: 1,
            keywordIds: ids.keywords,
          },
        ],
      }),
    );
    const after = await tableState();
    const changed = after.bullets.find((row) => row.id === ids.bullets[0]);
    expect(changed).toMatchObject({ status: 'ready', revision: 2 });
    expect(after.bullets.find((row) => row.id === ids.bullets[1])).toEqual(
      before.bullets.find((row) => row.id === ids.bullets[1]),
    );
    expect(after.bulletFacts).toEqual(before.bulletFacts);
    const sources = await db.query<{ isCurrent: boolean; bodyText: string }[]>(
      `SELECT "isCurrent","bodyText" FROM resume_source_items WHERE "sourceKey"=$1 ORDER BY "createdAt"`,
      [`career-bullet/${ids.bullets[0]}/ko-KR`],
    );
    expect(sources.map((source) => source.isCurrent)).toEqual([false, true]);
    expect(sources[1].bodyText).toContain('Synthetic keyword 1');
  });

  it('down은 분류 컬럼만 제거하고 다시 적용할 수 있다', async () => {
    const before = await contentState();
    await runMigration('down');
    const [{ count }] = await db.query<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema=$1 AND column_name = ANY($2)`,
      [schemaName, [...curationColumns]],
    );
    expect(count).toBe(0);
    const reverted = await tableState();
    expect(reverted).toEqual(before);
    await runMigration('up');
    expect(await contentState()).toEqual(before);
  });
});
