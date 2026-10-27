import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestDataSourceOptions } from '../src/test-data-source';
import { CreateResumeRagTables1760000000000 } from '../src/migrations/1760000000000-create-resume-rag-tables';
import { CreateResumeChatConversations1795000000000 } from '../src/migrations/1795000000000-create-resume-chat-conversations';
import { CreateSharedCareerData1795000000004 } from '../src/migrations/1795000000004-create-shared-career-data';
import { AddResumeSoftDelete1795000000005 } from '../src/migrations/1795000000005-add-resume-soft-delete';
import { CreateResumeRagKeywords1793836800000 } from '../src/migrations/1793836800000-create-resume-rag-keywords';
import { CreateResumeRagChatLogs1794873600000 } from '../src/migrations/1794873600000-create-resume-rag-chat-logs';
import { CareerDataService } from '../src/career-data/career-data.service';
import {
  CareerDataUpsertDto,
  ResumeDetailSaveDto,
  ResumeVersionSaveDto,
} from '../src/career-data/career-data.dto';
import { ResumeService } from '../src/resume/resume.service';
import {
  careerSourceCondition,
  legacyDetailCondition,
} from '../src/resume-rag/resume-source-eligibility';
import { createLegacyResumeTables } from './support/synthetic-resume-migration';

const schemaName = `resume_${randomUUID().replaceAll('-', '')}_test`;
const content = {
  name: 'Synthetic Person',
  title: 'Synthetic Resume',
  contact: { email: 'test@example.test', phone: '' },
  introduction: ['Synthetic'],
  totalExperience: '1 year',
  lastUpdated: '2026.10',
  careers: [],
  education: [],
  skills: [],
  certifications: [],
  links: [],
  personalProjects: [],
};
const version = (key: string, overrides: Partial<ResumeVersionSaveDto> = {}) =>
  plainToInstance(ResumeVersionSaveDto, {
    key,
    kind: 'base',
    track: 'product-engineer',
    locale: 'ko-KR',
    visibility: 'public',
    expectedRevision: 0,
    expectedCurrentVersionId: null,
    versionName: 'v1',
    content,
    dependencies: [],
    ...overrides,
  });

describe('공통 경력 PostgreSQL 원자적 저장', () => {
  let db: DataSource;
  let writer: CareerDataService;
  let reader: ResumeService;
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
      for (const locale of ['ko-KR', 'en-US', 'ja-JP']) {
        await runner.query(
          'INSERT INTO resume_documents(locale,content) VALUES($1,$2::jsonb)',
          [locale, JSON.stringify(content)],
        );
      }
      await runner.query(
        "INSERT INTO resume_details(slug,title,content) VALUES('synthetic-legacy-detail','Synthetic legacy detail','# Synthetic legacy detail')",
      );
      await new CreateSharedCareerData1795000000004().up(runner);
      await new CreateResumeRagKeywords1793836800000().up(runner);
      await new CreateResumeRagChatLogs1794873600000().up(runner);
      await new AddResumeSoftDelete1795000000005().up(runner);
    } finally {
      await runner.release();
    }
    writer = new CareerDataService(db);
    reader = new ResumeService(db);
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await db.destroy();
    }
  });
  const key = () => `test-${randomUUID()}`;
  const core = async () => {
    const experienceId = randomUUID(),
      factId = randomUUID(),
      bulletId = randomUUID(),
      keywordId = randomUUID();
    const batch = plainToInstance(CareerDataUpsertDto, {
      experiences: [
        {
          id: experienceId,
          expectedRevision: 0,
          company: 'Synthetic Co',
          title: 'Internal project',
          publicTitle: 'Public project',
        },
      ],
      facts: [
        {
          id: factId,
          experienceId,
          expectedRevision: 0,
          kind: 'result',
          content: 'Synthetic fact',
          verificationStatus: 'confirmed',
          visibility: 'public',
          evidence: [
            {
              kind: 'document',
              locator: 'private/internal.md',
              as_of: '2026-10-01',
              line: 12,
            },
          ],
        },
      ],
      keywords: [
        {
          id: keywordId,
          expectedRevision: 0,
          key: `tech-${randomUUID()}`,
          label: 'Synthetic technology',
          kind: 'technology',
          aliases: [],
        },
      ],
      bullets: [
        {
          id: bulletId,
          experienceId,
          expectedRevision: 0,
          text: 'Synthetic bullet',
          status: 'ready',
          visibility: 'public',
          facts: [{ factId, factRevision: 1 }],
          keywordIds: [keywordId],
          sourceRefs: [
            { path: 'private/internal.md', line: 12, hash: 'original' },
          ],
          reviewNote: 'internal note',
        },
      ],
    });
    await writer.upsertData(batch);
    return { experienceId, factId, bulletId, keywordId, batch };
  };
  it('legacy 본문을 PE로 재해석하지 않고 공유 표는 비어 있으며 상세는 private', async () => {
    await expect(reader.getDocument('ko-KR')).rejects.toThrow(
      NotFoundException,
    );
    expect(await reader.getDetails()).toEqual([]);
    expect((await writer.getData()).facts).toEqual([]);
    expect(
      await db.query('SELECT count(*)::int AS count FROM resume_documents'),
    ).toEqual([{ count: 3 }]);
  });
  it('UUIDv5 보존과 관계 revision, null 유일성·복합 FK·불변 버전을 강제한다', async () => {
    const { bulletId, experienceId, factId } = await core();
    const saved = await writer.saveVersion(
      version(key(), {
        dependencies: [{ kind: 'bullet', id: bulletId, revision: 1 }],
      }),
    );
    const deps = await db.query<{ id: string; source_snapshot: unknown }[]>(
      'SELECT * FROM resume_content_dependencies WHERE resume_version_id=$1',
      [saved.versionId],
    );
    expect(deps).toHaveLength(4);
    await expect(
      db.query('UPDATE resume_versions SET version_name=$1 WHERE id=$2', [
        'bad',
        saved.versionId,
      ]),
    ).rejects.toThrow('immutable');
    await expect(
      db.query(
        'UPDATE resume_content_dependencies SET source_revision=2 WHERE id=$1',
        [deps[0].id],
      ),
    ).rejects.toThrow('immutable');
    await expect(
      db.query(
        'INSERT INTO resume_content_dependencies(resume_version_id,experience_id,source_revision,source_snapshot) VALUES($1,$2,1,$3)',
        [saved.versionId, experienceId, {}],
      ),
    ).rejects.toThrow('duplicate');
    await expect(
      db.query(
        'INSERT INTO career_bullet_facts(bullet_id,fact_id,experience_id,fact_revision) VALUES($1,$2,$3,1)',
        [bulletId, factId, randomUUID()],
      ),
    ).rejects.toThrow();
    const uuid5 = '5bb2635b-3510-51a8-8ded-0b9d3bbb3c76';
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [
          {
            id: uuid5,
            expectedRevision: 0,
            company: 'Synthetic',
            title: 'Title',
          },
        ],
        facts: [],
        bullets: [],
        keywords: [],
      }),
    );
    expect(
      await db.query('SELECT id FROM career_experiences WHERE id=$1', [uuid5]),
    ).toEqual([{ id: uuid5 }]);
  });
  it('불렛 관계 실패와 배치 CAS 충돌은 원본 변경까지 rollback한다', async () => {
    const { batch, experienceId } = await core();
    const before = await db.query<unknown[]>(
      'SELECT * FROM career_experiences WHERE id=$1',
      [experienceId],
    );
    await expect(
      writer.upsertData(
        plainToInstance(CareerDataUpsertDto, {
          experiences: [
            {
              ...batch.experiences[0],
              expectedRevision: 1,
              title: 'Should roll back',
            },
          ],
          facts: [],
          keywords: [],
          bullets: [
            {
              ...batch.bullets[0],
              expectedRevision: 1,
              facts: [{ factId: randomUUID(), factRevision: 1 }],
            },
          ],
        }),
      ),
    ).rejects.toThrow(ConflictException);
    expect(
      await db.query('SELECT * FROM career_experiences WHERE id=$1', [
        experienceId,
      ]),
    ).toEqual(before);
    await expect(writer.upsertData(batch)).rejects.toThrow(ConflictException);
  });
  it('문서별 독립 버전, CAS, 같은 버전 재시도와 과거 재시도에서 current를 유지한다', async () => {
    const pe = key(),
      fe = key();
    const firstPayload = version(pe);
    const first = await writer.saveVersion(firstPayload);
    expect((await writer.saveVersion(firstPayload)).versionId).toBe(
      first.versionId,
    );
    const other = await writer.saveVersion(
      version(fe, {
        kind: 'targeted',
        targetKey: 'synthetic-target',
        parentVersionId: first.versionId,
      }),
    );
    const second = await writer.saveVersion(
      version(pe, {
        expectedRevision: 1,
        expectedCurrentVersionId: first.versionId,
        versionName: 'v2',
        parentVersionId: first.versionId,
        content: { ...content, title: 'Next' },
      }),
    );
    expect((await writer.saveVersion(firstPayload)).currentVersionId).toBe(
      second.versionId,
    );
    expect((await reader.getDocument('ko-KR', fe)).versionId).toBe(
      other.versionId,
    );
    expect((await reader.getDocument('ko-KR', pe)).title).toBe('Next');
    await expect(
      writer.saveVersion(version(pe, { versionName: 'v3' })),
    ).rejects.toThrow(ConflictException);
    await expect(
      writer.saveVersion(
        version(pe, { content: { ...content, title: 'Changed' } }),
      ),
    ).rejects.toThrow(ConflictException);
    await expect(reader.getDocument('en-US', pe)).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      db.query('UPDATE resumes SET current_version_id=$1 WHERE id=$2', [
        other.versionId,
        first.documentId,
      ]),
    ).rejects.toThrow();
  });
  it('동시 CAS 저장은 하나만 성공하며 실패한 버전이 남지 않는다', async () => {
    const name = key();
    const initial = await writer.saveVersion(version(name));
    const results = await Promise.allSettled(
      ['v2', 'v3'].map((versionName) =>
        writer.saveVersion(
          version(name, {
            versionName,
            expectedRevision: 1,
            expectedCurrentVersionId: initial.versionId,
          }),
        ),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await db.query(
        'SELECT count(*)::int AS count FROM resume_versions WHERE resume_id=$1',
        [initial.documentId],
      ),
    ).toEqual([{ count: 2 }]);
  });
  it('일반 원본 수정은 완성 문구·snapshot을 유지하고 명시적 철회는 문서/상세/RAG를 차단한다', async () => {
    const { batch, bulletId, factId } = await core();
    const name = key();
    const slug = key();
    const saved = await writer.saveVersion(
      version(name, {
        dependencies: [{ kind: 'bullet', id: bulletId, revision: 1 }],
        sourceRef: { path: 'private/source' },
      }),
    );
    await writer.saveDetail(
      slug,
      plainToInstance(ResumeDetailSaveDto, {
        expectedRevision: 0,
        title: 'Synthetic detail',
        content: '# Synthetic',
        visibility: 'public',
        dependencies: [{ kind: 'fact', id: factId, revision: 1 }],
      }),
    );
    const published = await writer.publishFact(factId, 1);
    const response = await reader.getDocument('ko-KR', name);
    expect(JSON.stringify(response)).not.toContain('private/source');
    expect(JSON.stringify(response)).not.toContain('internal note');
    const source = await db.query<{ metadata: unknown; bodyText: string }[]>(
      'SELECT metadata,"bodyText" FROM resume_source_items WHERE id=$1',
      [published.sourceItemId],
    );
    expect(JSON.stringify(source)).not.toContain('private/internal.md');
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [],
        keywords: [],
        bullets: [],
        facts: [
          {
            ...batch.facts[0],
            expectedRevision: 1,
            content: 'Changed candidate',
          },
        ],
      }),
    );
    expect((await reader.getDocument('ko-KR', name)).versionId).toBe(
      saved.versionId,
    );
    expect(
      await db.query('SELECT status FROM career_bullets WHERE id=$1', [
        bulletId,
      ]),
    ).toEqual([{ status: 'needs_review' }]);
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [],
        keywords: [],
        bullets: [],
        facts: [
          { ...batch.facts[0], expectedRevision: 2, visibility: 'private' },
        ],
      }),
    );
    await expect(reader.getDocument('ko-KR', name)).rejects.toThrow(
      NotFoundException,
    );
    await expect(reader.getDetail(slug)).rejects.toThrow(NotFoundException);
    expect(
      await db.query(
        `SELECT status,vectorize FROM resume_source_items WHERE "resumeId"=$1 OR id=$2`,
        [saved.documentId, published.sourceItemId],
      ),
    ).toEqual(
      expect.arrayContaining([{ status: 'inactive', vectorize: false }]),
    );
  });
  it('비공개 ready 후보와 문서는 저장하되 공개 승격에 snapshot 공개 조건을 강제한다', async () => {
    const id = randomUUID(),
      factId = randomUUID(),
      bulletId = randomUUID();
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [
          {
            id,
            expectedRevision: 0,
            company: 'Synthetic',
            title: 'Private title',
          },
        ],
        facts: [
          {
            id: factId,
            experienceId: id,
            expectedRevision: 0,
            kind: 'action',
            content: 'Private',
            verificationStatus: 'confirmed',
            evidence: [
              { kind: 'document', locator: 'private', as_of: '2026-10-01' },
            ],
          },
        ],
        bullets: [
          {
            id: bulletId,
            experienceId: id,
            expectedRevision: 0,
            text: 'Private',
            status: 'ready',
            facts: [{ factId, factRevision: 1 }],
            keywordIds: [],
          },
        ],
        keywords: [],
      }),
    );
    const name = key();
    const saved = await writer.saveVersion(
      version(name, {
        visibility: 'private',
        dependencies: [{ kind: 'bullet', id: bulletId, revision: 1 }],
      }),
    );
    await expect(reader.getDocument('ko-KR', name)).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      writer.setVisibility(saved.documentId, {
        expectedRevision: 1,
        visibility: 'public',
      }),
    ).rejects.toThrow(ConflictException);
    await expect(writer.publishFact(factId, 1)).rejects.toThrow(
      ConflictException,
    );
  });
  it('독립 사실은 측정 조건·표현 한계까지 4000자를 넘으면 부분 발행하지 않는다', async () => {
    const { batch, factId } = await core();
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [],
        bullets: [],
        keywords: [],
        facts: [
          {
            ...batch.facts[0],
            expectedRevision: 1,
            content: 'x'.repeat(3900),
            claimBoundary: 'boundary'.repeat(100),
          },
        ],
      }),
    );
    await expect(writer.publishFact(factId, 2)).rejects.toThrow('4000');
    expect(
      await db.query(
        `SELECT count(*)::int AS count FROM resume_source_items WHERE "sourceKey"=$1`,
        [`career-fact/${factId}/ko-KR`],
      ),
    ).toEqual([{ count: 0 }]);
  });
  it('사전 적재는 legacy source/vector를 보존하고 새 reader만 대응 상세 family를 제외한다', async () => {
    const slug = key();
    const fixture = [
      {
        type: 'app_resume',
        key: `app:resume-detail:${slug}`,
        status: 'active',
        vectorize: true,
      },
      {
        type: 'app_resume',
        key: `app:resume-detail:${slug}#section`,
        status: 'active',
        vectorize: true,
      },
      {
        type: 'app_resume',
        key: `app:resume-detail:${slug}-other`,
        status: 'active',
        vectorize: true,
      },
      {
        type: 'resume_workspace',
        key: `legacy-${slug}`,
        status: 'inactive',
        vectorize: false,
      },
    ];
    const sourceIds: string[] = [];
    for (const entry of fixture) {
      const [source] = await db.query<{ id: string }[]>(
        `INSERT INTO resume_source_items("sourceType","itemType","sourcePath","sourceKey",title,"bodyText",locale,status,visibility,vectorize,"contentHash",metadata) VALUES($1,'public_resume_detail','synthetic',$2,'Synthetic legacy','Synthetic legacy','ko-KR',$3,'public',$4,$5,'{}'::jsonb) RETURNING id`,
        [entry.type, entry.key, entry.status, entry.vectorize, randomUUID()],
      );
      sourceIds.push(source.id);
      await db.query(
        `INSERT INTO resume_vector_chunks("sourceItemId","chunkIndex",content,"contentHash","sourceType","itemType",title,locale,"sourcePath","sourceKey",visibility,status,"citationMetadata","embeddingProvider","embeddingModel","embeddingDimensions",embedding,"chunkerVersion","chunkConfigHash","indexedAt") VALUES($1,0,'Synthetic legacy',$2,$3,'public_resume_detail','Synthetic legacy','ko-KR','synthetic',$4,'public','active','{}'::jsonb,'synthetic','synthetic',2,'[1,0]'::vector,'synthetic','synthetic',now())`,
        [source.id, randomUUID(), entry.type, entry.key],
      );
    }
    const sourceBefore = await db.query<unknown[]>(
      'SELECT * FROM resume_source_items WHERE id=ANY($1::uuid[]) ORDER BY id',
      [sourceIds],
    );
    const vectorBefore = await db.query<unknown[]>(
      'SELECT * FROM resume_vector_chunks WHERE "sourceItemId"=ANY($1::uuid[]) ORDER BY id',
      [sourceIds],
    );
    const { batch, bulletId, factId } = await core();
    const saved = await writer.saveVersion(
      version(key(), {
        dependencies: [{ kind: 'bullet', id: bulletId, revision: 1 }],
      }),
    );
    await writer.publishFact(factId, 1);
    await writer.saveDetail(
      slug,
      plainToInstance(ResumeDetailSaveDto, {
        expectedRevision: 0,
        title: 'Synthetic canonical',
        content: '# Synthetic canonical',
        visibility: 'public',
        dependencies: [{ kind: 'fact', id: factId, revision: 1 }],
      }),
    );
    for (const locale of ['en-US', 'ja-JP']) {
      expect(
        await db.query(
          `SELECT source.locale FROM resume_source_items source WHERE source."sourceType"='career_data' AND source."sourceKey"=$1 AND source.status='active' AND ${careerSourceCondition('source')} AND (source.locale IS NULL OR source.locale=$2)`,
          [`resume-detail/${slug}`, locale],
        ),
      ).toEqual([{ locale: null }]);
    }
    const eligible = () =>
      db.query<{ id: string }[]>(
        `SELECT source.id FROM resume_source_items source WHERE source.id=ANY($1::uuid[]) AND ${legacyDetailCondition('source')} ORDER BY source.id`,
        [sourceIds],
      );
    expect((await eligible()).map((row) => row.id)).toEqual(
      [sourceIds[2], sourceIds[3]].sort(),
    );
    await writer.upsertData(
      plainToInstance(CareerDataUpsertDto, {
        experiences: [],
        keywords: [],
        bullets: [],
        facts: [
          { ...batch.facts[0], expectedRevision: 1, visibility: 'private' },
        ],
      }),
    );
    await writer.setVisibility(saved.documentId, {
      expectedRevision: 1,
      visibility: 'private',
    });
    await writer.saveDetail(
      slug,
      plainToInstance(ResumeDetailSaveDto, {
        expectedRevision: 1,
        title: 'Synthetic canonical',
        content: '# Synthetic canonical',
        visibility: 'private',
        dependencies: [],
      }),
    );
    expect((await eligible()).map((row) => row.id)).toEqual(
      [sourceIds[2], sourceIds[3]].sort(),
    );
    expect(
      await db.query<unknown[]>(
        'SELECT * FROM resume_source_items WHERE id=ANY($1::uuid[]) ORDER BY id',
        [sourceIds],
      ),
    ).toEqual(sourceBefore);
    expect(
      await db.query<unknown[]>(
        'SELECT * FROM resume_vector_chunks WHERE "sourceItemId"=ANY($1::uuid[]) ORDER BY id',
        [sourceIds],
      ),
    ).toEqual(vectorBefore);
    expect(
      await db.query(
        `SELECT status,vectorize FROM resume_source_items WHERE "sourceType"='career_data' AND "sourceKey"=$1 AND "isCurrent"`,
        [`resume-detail/${slug}`],
      ),
    ).toEqual([{ status: 'inactive', vectorize: false }]);
  });

  it('문서 공개 철회와 재공개, detail CAS, preview의 상세 순서·누락 오류를 유지한다', async () => {
    const slug = key();
    await writer.saveDetail(
      slug,
      plainToInstance(ResumeDetailSaveDto, {
        expectedRevision: 0,
        title: 'Synthetic detail',
        content: '# Synthetic',
        visibility: 'public',
        dependencies: [],
      }),
    );
    const name = key();
    const saved = await writer.saveVersion(
      version(name, {
        content: {
          ...content,
          careers: [
            {
              id: 'c',
              company: 'Synthetic',
              period: '2026',
              employmentType: 'Full time',
              role: 'Engineer',
              projects: [
                { id: 'p', title: 'Project', fileRef: slug, descriptions: [] },
              ],
            },
          ],
        },
      }),
    );
    expect(
      (await reader.getPreview('ko-KR', name)).details.map((row) => row.slug),
    ).toEqual([slug]);
    await writer.setVisibility(saved.documentId, {
      expectedRevision: 1,
      visibility: 'private',
    });
    await expect(reader.getDocument('ko-KR', name)).rejects.toThrow(
      NotFoundException,
    );
    await writer.setVisibility(saved.documentId, {
      expectedRevision: 2,
      visibility: 'public',
    });
    expect((await reader.getDocument('ko-KR', name)).versionId).toBe(
      saved.versionId,
    );
    expect(
      await db.query(
        `SELECT status FROM resume_source_items WHERE "resumeId"=$1 AND "isCurrent"`,
        [saved.documentId],
      ),
    ).toEqual([{ status: 'active' }]);
    await writer.saveDetail(
      slug,
      plainToInstance(ResumeDetailSaveDto, {
        expectedRevision: 1,
        title: 'Synthetic detail',
        content: '# Synthetic',
        visibility: 'private',
        dependencies: [],
      }),
    );
    await expect(reader.getPreview('ko-KR', name)).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(
      writer.saveDetail(
        slug,
        plainToInstance(ResumeDetailSaveDto, {
          expectedRevision: 1,
          title: 'Stale',
          content: '',
          dependencies: [],
        }),
      ),
    ).rejects.toThrow(ConflictException);
  });
  it('관계 전체 교체는 행을 보존하고 명시한 활성 원본만 재선택한다', async () => {
    const { bulletId, factId, keywordId, batch } = await core();
    const update = (
      revision: number,
      facts = batch.bullets[0].facts,
      keywordIds = batch.bullets[0].keywordIds,
    ) =>
      plainToInstance(CareerDataUpsertDto, {
        experiences: [],
        facts: [],
        keywords: [],
        bullets: [
          {
            ...batch.bullets[0],
            expectedRevision: revision,
            status: 'draft',
            facts,
            keywordIds,
          },
        ],
      });
    await writer.upsertData(update(1, [], []));
    expect(
      await db.query(
        'SELECT deleted_at IS NOT NULL AS deleted FROM career_bullet_facts WHERE bullet_id=$1',
        [bulletId],
      ),
    ).toEqual([{ deleted: true }]);
    expect(
      (await writer.getData()).bulletFacts.some(
        (row) => row.bullet_id === bulletId,
      ),
    ).toBe(false);
    await writer.upsertData(update(2));
    expect(
      await db.query(
        'SELECT deleted_at FROM career_bullet_facts WHERE bullet_id=$1',
        [bulletId],
      ),
    ).toEqual([{ deleted_at: null }]);
    await writer.deleteCareer('keyword', keywordId, 1);
    await expect(writer.upsertData(update(3))).rejects.toThrow(
      ConflictException,
    );
    expect(
      await db.query('SELECT revision FROM career_bullets WHERE id=$1', [
        bulletId,
      ]),
    ).toEqual([{ revision: 4 }]);
    expect(
      await db.query(
        'SELECT fact_id FROM career_bullet_facts WHERE bullet_id=$1 AND deleted_at IS NULL',
        [bulletId],
      ),
    ).toEqual([{ fact_id: factId }]);
  });

  it('keyword 삭제는 역사적 문서를 유지하며 fact 삭제는 후보 재검토·문서 차단·CAS를 적용한다', async () => {
    const { factId, bulletId, keywordId, batch } = await core();
    const name = key();
    const saved = await writer.saveVersion(
      version(name, {
        dependencies: [{ kind: 'bullet', id: bulletId, revision: 1 }],
      }),
    );
    await expect(writer.deleteCareer('fact', factId, 99)).rejects.toThrow(
      ConflictException,
    );
    await writer.deleteCareer('keyword', keywordId, 1);
    expect((await reader.getDocument('ko-KR', name)).versionId).toBe(
      saved.versionId,
    );
    const deleted = await writer.deleteCareer('fact', factId, 1);
    expect(await writer.deleteCareer('fact', factId, 1)).toEqual(deleted);
    await expect(reader.getDocument('ko-KR', name)).rejects.toThrow(
      NotFoundException,
    );
    expect(
      await db.query('SELECT status,revision FROM career_bullets WHERE id=$1', [
        bulletId,
      ]),
    ).toEqual([{ status: 'needs_review', revision: 3 }]);
    expect(
      (await writer.getData()).facts.some((row) => row.id === factId),
    ).toBe(false);
    expect(
      (await writer.getData(true)).facts.find((row) => row.id === factId)
        ?.deleted_at,
    ).toBeTruthy();
    expect(
      await db.query(
        'SELECT deleted_at IS NOT NULL AS deleted FROM resume_source_items WHERE "resumeId"=$1',
        [saved.documentId],
      ),
    ).toEqual([{ deleted: true }]);
    await expect(
      writer.upsertData(
        plainToInstance(CareerDataUpsertDto, {
          experiences: [],
          bullets: [],
          keywords: [],
          facts: [{ ...batch.facts[0], expectedRevision: deleted.revision }],
        }),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it.each(['draft', 'needs_review'] as const)(
    '%s 비공개 후보도 keyword·fact 관계 삭제마다 revision을 올리고 stale 저장을 거부한다',
    async (status) => {
      const { bulletId, factId, keywordId, batch } = await core();
      const unrelated = await core();
      const update = (expectedRevision: number, hasLinks = true) =>
        plainToInstance(CareerDataUpsertDto, {
          experiences: [],
          facts: [],
          keywords: [],
          bullets: [
            {
              ...batch.bullets[0],
              status,
              visibility: 'private',
              expectedRevision,
              facts: hasLinks ? batch.bullets[0].facts : [],
              keywordIds: hasLinks ? [keywordId] : [],
            },
          ],
        });
      await writer.upsertData(update(1));
      await writer.deleteCareer('keyword', keywordId, 1);
      expect(
        await db.query(
          'SELECT status,revision FROM career_bullets WHERE id=$1',
          [bulletId],
        ),
      ).toEqual([{ status, revision: 3 }]);
      await expect(writer.upsertData(update(2, false))).rejects.toThrow(
        ConflictException,
      );
      await writer.deleteCareer('fact', factId, 1);
      expect(
        await db.query(
          'SELECT status,revision FROM career_bullets WHERE id=$1',
          [bulletId],
        ),
      ).toEqual([{ status, revision: 4 }]);
      await expect(writer.upsertData(update(3, false))).rejects.toThrow(
        ConflictException,
      );
      await writer.deleteCareer('keyword', keywordId, 1);
      await writer.deleteCareer('fact', factId, 1);
      expect(
        await db.query('SELECT revision FROM career_bullets WHERE id=$1', [
          bulletId,
        ]),
      ).toEqual([{ revision: 4 }]);
      expect(
        await db.query(
          'SELECT status,revision FROM career_bullets WHERE id=$1',
          [unrelated.bulletId],
        ),
      ).toEqual([{ status: 'ready', revision: 1 }]);
    },
  );

  it('experience 삭제는 소속 후보·관계만 cascade하고 공유 keyword와 다른 경험은 보존한다', async () => {
    const removed = await core();
    const other = await core();
    await writer.deleteCareer('experience', removed.experienceId, 1);
    for (const [table, id] of [
      ['career_facts', removed.factId],
      ['career_bullets', removed.bulletId],
    ])
      expect(
        await db.query(
          `SELECT revision,deleted_at IS NOT NULL AS deleted FROM ${table} WHERE id=$1`,
          [id],
        ),
      ).toEqual([{ revision: 2, deleted: true }]);
    expect(
      await db.query('SELECT deleted_at FROM career_keywords WHERE id=$1', [
        removed.keywordId,
      ]),
    ).toEqual([{ deleted_at: null }]);
    expect(
      await db.query('SELECT deleted_at FROM career_experiences WHERE id=$1', [
        other.experienceId,
      ]),
    ).toEqual([{ deleted_at: null }]);
    await expect(
      writer.upsertData(
        plainToInstance(CareerDataUpsertDto, {
          experiences: [],
          bullets: [],
          keywords: [],
          facts: [
            {
              ...other.batch.facts[0],
              id: randomUUID(),
              experienceId: removed.experienceId,
              expectedRevision: 0,
            },
          ],
        }),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('현재 버전 삭제는 포인터를 비우며 새 버전만 허용하고 분기 문서는 유지한다', async () => {
    const name = key();
    const first = await writer.saveVersion(version(name));
    const branch = await writer.saveVersion(
      version(key(), { parentVersionId: first.versionId }),
    );
    await expect(writer.deleteVersion(first.versionId, 99)).rejects.toThrow(
      ConflictException,
    );
    const removed = await writer.deleteVersion(first.versionId, 1);
    expect(removed.revision).toBe(2);
    expect(await writer.deleteVersion(first.versionId, 1)).toEqual(removed);
    await expect(reader.getDocument('ko-KR', name)).rejects.toThrow(
      NotFoundException,
    );
    await expect(writer.saveVersion(version(name))).rejects.toThrow(
      ConflictException,
    );
    await expect(
      writer.saveVersion(version(key(), { parentVersionId: first.versionId })),
    ).rejects.toThrow(ConflictException);
    const next = await writer.saveVersion(
      version(name, {
        expectedRevision: 2,
        expectedCurrentVersionId: null,
        versionName: 'v2',
      }),
    );
    expect((await reader.getDocument('ko-KR', name)).versionId).toBe(
      next.versionId,
    );
    expect(
      await db.query('SELECT deleted_at FROM resumes WHERE id=$1', [
        branch.documentId,
      ]),
    ).toEqual([{ deleted_at: null }]);
    expect(
      await db.query(
        'SELECT "isCurrent",deleted_at IS NOT NULL AS deleted FROM resume_source_items WHERE "resumeVersionId"=$1',
        [first.versionId],
      ),
    ).toEqual([{ isCurrent: false, deleted: true }]);
    await writer.deleteResume(next.documentId, next.revision);
    expect(
      (await writer.listResumes()).some((row) => row.id === next.documentId),
    ).toBe(false);
    expect(
      (await writer.listResumes(true)).find((row) => row.id === next.documentId)
        ?.deletedAt,
    ).toBeTruthy();
    await expect(
      writer.saveVersion(
        version(name, { expectedRevision: 4, versionName: 'v3' }),
      ),
    ).rejects.toThrow(ConflictException);
    await expect(
      writer.setVisibility(next.documentId, {
        expectedRevision: 4,
        visibility: 'public',
      }),
    ).rejects.toThrow(NotFoundException);
    const runner = db.createQueryRunner();
    try {
      await expect(
        new AddResumeSoftDelete1795000000005().down(runner),
      ).rejects.toThrow('tombstones');
    } finally {
      await runner.release();
    }
  });

  it('과거 버전만 삭제해도 현재 버전과 frozen 본문·의존성은 보존한다', async () => {
    const { factId } = await core();
    const name = key();
    const first = await writer.saveVersion(
      version(name, {
        dependencies: [{ kind: 'fact', id: factId, revision: 1 }],
      }),
    );
    const next = await writer.saveVersion(
      version(name, {
        expectedRevision: 1,
        expectedCurrentVersionId: first.versionId,
        versionName: 'v2',
      }),
    );
    const before = await db.query<unknown[]>(
      'SELECT content,source_ref,parent_version_id FROM resume_versions WHERE id=$1',
      [first.versionId],
    );
    await writer.deleteVersion(first.versionId, 2);
    expect((await reader.getDocument('ko-KR', name)).versionId).toBe(
      next.versionId,
    );
    expect(
      await db.query(
        'SELECT content,source_ref,parent_version_id FROM resume_versions WHERE id=$1',
        [first.versionId],
      ),
    ).toEqual(before);
    await expect(
      db.query("UPDATE resume_versions SET content='{}'::jsonb WHERE id=$1", [
        first.versionId,
      ]),
    ).rejects.toThrow('immutable');
    await expect(
      db.query('DELETE FROM resume_versions WHERE id=$1', [first.versionId]),
    ).rejects.toThrow('immutable');
    await expect(
      db.query(
        'UPDATE resume_content_dependencies SET source_revision=2 WHERE resume_version_id=$1',
        [first.versionId],
      ),
    ).rejects.toThrow('immutable');
  });

  it('삭제 dependency는 차단을 없애지 못하고 상세 삭제는 본문과 이력을 보존한다', async () => {
    const { factId } = await core();
    const name = key();
    const saved = await writer.saveVersion(
      version(name, {
        dependencies: [{ kind: 'fact', id: factId, revision: 1 }],
      }),
    );
    await db.query(
      'UPDATE resume_content_dependencies SET deleted_at=now() WHERE resume_version_id=$1 AND fact_id=$2',
      [saved.versionId, factId],
    );
    await expect(reader.getDocument('ko-KR', name)).rejects.toThrow(
      NotFoundException,
    );
    const slug = key();
    const input = plainToInstance(ResumeDetailSaveDto, {
      expectedRevision: 0,
      title: 'Delete detail',
      content: '# Kept body',
      visibility: 'public',
      dependencies: [{ kind: 'fact', id: factId, revision: 1 }],
    });
    await writer.saveDetail(slug, input);
    await expect(writer.deleteDetail(slug, 99)).rejects.toThrow(
      ConflictException,
    );
    const deleted = await writer.deleteDetail(slug, 1);
    expect(await writer.deleteDetail(slug, 1)).toEqual(deleted);
    await expect(reader.getDetail(slug)).rejects.toThrow(NotFoundException);
    expect(
      await db.query('SELECT content FROM resume_details WHERE slug=$1', [
        slug,
      ]),
    ).toEqual([{ content: '# Kept body' }]);
    await expect(
      writer.saveDetail(slug, { ...input, expectedRevision: 2 }),
    ).rejects.toThrow(ConflictException);
  });
});
