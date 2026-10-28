import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import type {
  CareerDataSnapshotDto,
  CareerDataUpsertDto,
  CareerDependencyDto,
  CareerIdentityDto,
  CareerDeleteResultDto,
  ManagedResumeDto,
  ResumeDetailSaveDto,
  ResumeSaveResultDto,
  ResumeVersionSaveDto,
  ResumeVisibilityDto,
} from './career-data.dto';
import {
  publicBulletCondition,
  publicDependencyCondition,
} from './career-data-publication';

type Row = Record<string, unknown> & {
  id: string;
  revision: number;
  deleted_at: string | null;
};
type Dependency = CareerDependencyDto & { snapshot: Row };
type ResumeRow = {
  id: string;
  key: string;
  locale: string;
  kind: string;
  track: string;
  target_key: string | null;
  visibility: string;
  revision: number;
  current_version_id: string | null;
  deleted_at: string | null;
};
type VersionRow = {
  id: string;
  version_name: string;
  content_hash: string;
  payload_hash: string;
  deleted_at: string | null;
};
const tables = {
  experience: 'career_experiences',
  fact: 'career_facts',
  bullet: 'career_bullets',
  keyword: 'career_keywords',
} as const;
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  return JSON.stringify(value);
};
export const careerContentHash = (value: unknown): string =>
  createHash('sha256').update(canonicalJson(value)).digest('hex');

@Injectable()
export class CareerDataService {
  constructor(private readonly dataSource: DataSource) {}

  private async write<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(1795000000004)');
        return work(manager);
      });
    } catch (error) {
      const code =
        error instanceof Error && 'driverError' in error
          ? (error.driverError as { code?: string }).code
          : undefined;
      if (code === '23505' || code === '23503')
        throw new ConflictException('중복 값 또는 원본 연결을 확인하세요.');
      if (code === '23514' || code === '22001')
        throw new BadRequestException('저장 제약을 만족하지 않습니다.');
      throw error;
    }
  }

  private async readSnapshot(
    manager: EntityManager,
    includeDeleted = false,
  ): Promise<CareerDataSnapshotDto> {
    const activeParents: Record<string, string> = {
      career_facts:
        ' AND EXISTS(SELECT 1 FROM career_experiences e WHERE e.id=career_facts.experience_id AND e.deleted_at IS NULL)',
      career_bullets:
        ' AND EXISTS(SELECT 1 FROM career_experiences e WHERE e.id=career_bullets.experience_id AND e.deleted_at IS NULL)',
      career_bullet_facts:
        ' AND EXISTS(SELECT 1 FROM career_bullets b JOIN career_experiences e ON e.id=b.experience_id JOIN career_facts f ON f.id=career_bullet_facts.fact_id WHERE b.id=career_bullet_facts.bullet_id AND b.deleted_at IS NULL AND e.deleted_at IS NULL AND f.deleted_at IS NULL)',
      career_bullet_keywords:
        ' AND EXISTS(SELECT 1 FROM career_bullets b JOIN career_experiences e ON e.id=b.experience_id JOIN career_keywords k ON k.id=career_bullet_keywords.keyword_id WHERE b.id=career_bullet_keywords.bullet_id AND b.deleted_at IS NULL AND e.deleted_at IS NULL AND k.deleted_at IS NULL)',
    };
    const read = (table: string): Promise<Record<string, unknown>[]> =>
      manager.query(
        `SELECT * FROM ${table} ${includeDeleted ? '' : `WHERE deleted_at IS NULL${activeParents[table] ?? ''}`} ORDER BY ${table === 'career_bullet_facts' || table === 'career_bullet_keywords' ? 'bullet_id' : 'id'}`,
      );
    return {
      experiences: await read('career_experiences'),
      facts: await read('career_facts'),
      bullets: await read('career_bullets'),
      bulletFacts: await read('career_bullet_facts'),
      keywords: await read('career_keywords'),
      bulletKeywords: await read('career_bullet_keywords'),
    };
  }

  getData(includeDeleted = false): Promise<CareerDataSnapshotDto> {
    return this.dataSource.transaction('REPEATABLE READ', (manager) =>
      this.readSnapshot(manager, includeDeleted),
    );
  }

  private async requireActive(
    manager: EntityManager,
    table: string,
    id: string,
  ): Promise<void> {
    const [row] = await manager.query<{ id: string }[]>(
      `SELECT id FROM ${table} WHERE id=$1 AND deleted_at IS NULL`,
      [id],
    );
    if (!row) throw new ConflictException('삭제됐거나 없는 원본입니다.');
  }

  deleteCareer(
    kind: CareerDependencyDto['kind'],
    id: string,
    expectedRevision: number,
  ): Promise<CareerDeleteResultDto> {
    return this.write(async (manager) => {
      const table = tables[kind];
      const [row] = await manager.query<Row[]>(
        `SELECT * FROM ${table} WHERE id=$1`,
        [id],
      );
      if (!row) throw new NotFoundException('원본이 없습니다.');
      if (row.deleted_at)
        return { id, revision: row.revision, deletedAt: row.deleted_at };
      if (row.revision !== expectedRevision)
        throw new ConflictException('원본 revision 불일치');
      if (kind === 'fact' || kind === 'keyword')
        await manager.query(
          `UPDATE career_bullets b SET status=CASE WHEN $2='fact' AND b.status='ready' THEN 'needs_review' ELSE b.status END,revision=revision+1,updated_at=now() WHERE b.deleted_at IS NULL AND EXISTS(SELECT 1 FROM ${kind === 'fact' ? 'career_bullet_facts' : 'career_bullet_keywords'} link WHERE link.bullet_id=b.id AND link.${kind}_id=$1 AND link.deleted_at IS NULL)`,
          [id, kind],
        );
      if (kind === 'experience') {
        for (const child of ['career_facts', 'career_bullets'])
          await manager.query(
            `UPDATE ${child} SET deleted_at=now(),revision=revision+1,updated_at=now() WHERE experience_id=$1 AND deleted_at IS NULL`,
            [id],
          );
      }
      if (kind === 'experience' || kind === 'fact' || kind === 'bullet')
        await manager.query(
          `UPDATE career_bullet_facts SET deleted_at=COALESCE(deleted_at,now()) WHERE ${kind === 'experience' ? 'experience_id' : kind === 'fact' ? 'fact_id' : 'bullet_id'}=$1`,
          [id],
        );
      if (kind === 'experience' || kind === 'bullet' || kind === 'keyword')
        await manager.query(
          `UPDATE career_bullet_keywords SET deleted_at=COALESCE(deleted_at,now()) WHERE ${kind === 'experience' ? 'bullet_id IN (SELECT id FROM career_bullets WHERE experience_id=$1)' : kind === 'bullet' ? 'bullet_id=$1' : 'keyword_id=$1'}`,
          [id],
        );
      const [result] = await manager.query<CareerDeleteResultDto[]>(
        `WITH changed AS (UPDATE ${table} SET deleted_at=now(),revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$2 RETURNING id,revision,deleted_at AS "deletedAt") SELECT * FROM changed`,
        [id, expectedRevision],
      );
      if (!result) throw new ConflictException('원본 revision 불일치');
      await this.syncBulletSources(manager);
      await this.withdrawSources(manager);
      return result;
    });
  }

  deleteResume(
    id: string,
    expectedRevision: number,
  ): Promise<CareerDeleteResultDto> {
    return this.write(async (manager) => {
      const [row] = await manager.query<ResumeRow[]>(
        'SELECT * FROM resumes WHERE id=$1',
        [id],
      );
      if (!row) throw new NotFoundException('문서가 없습니다.');
      if (row.deleted_at)
        return { id, revision: row.revision, deletedAt: row.deleted_at };
      if (row.revision !== expectedRevision)
        throw new ConflictException('문서 revision 불일치');
      await manager.query(
        'UPDATE resume_versions SET deleted_at=COALESCE(deleted_at,now()) WHERE resume_id=$1',
        [id],
      );
      await manager.query(
        'UPDATE resume_content_dependencies SET deleted_at=COALESCE(deleted_at,now()) WHERE resume_version_id IN (SELECT id FROM resume_versions WHERE resume_id=$1)',
        [id],
      );
      const [result] = await manager.query<CareerDeleteResultDto[]>(
        'WITH changed AS (UPDATE resumes SET deleted_at=now(),revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$2 RETURNING id,revision,deleted_at AS "deletedAt") SELECT * FROM changed',
        [id, expectedRevision],
      );
      if (!result) throw new ConflictException('문서 revision 불일치');
      await this.withdrawSources(manager);
      return result;
    });
  }

  deleteVersion(
    id: string,
    expectedRevision: number,
  ): Promise<CareerDeleteResultDto> {
    return this.write(async (manager) => {
      const [version] = await manager.query<
        (VersionRow & { resume_id: string })[]
      >('SELECT * FROM resume_versions WHERE id=$1', [id]);
      if (!version) throw new NotFoundException('버전이 없습니다.');
      const [resume] = await manager.query<ResumeRow[]>(
        'SELECT * FROM resumes WHERE id=$1',
        [version.resume_id],
      );
      if (version.deleted_at)
        return { id, revision: resume.revision, deletedAt: version.deleted_at };
      if (resume.deleted_at) throw new NotFoundException('문서가 없습니다.');
      if (resume.revision !== expectedRevision)
        throw new ConflictException('문서 revision 불일치');
      const [deleted] = await manager.query<{ deleted_at: string }[]>(
        'WITH changed AS (UPDATE resume_versions SET deleted_at=now() WHERE id=$1 RETURNING deleted_at) SELECT * FROM changed',
        [id],
      );
      await manager.query(
        'UPDATE resume_content_dependencies SET deleted_at=COALESCE(deleted_at,now()) WHERE resume_version_id=$1',
        [id],
      );
      const [changed] = await manager.query<{ revision: number }[]>(
        `WITH changed AS (UPDATE resumes SET current_version_id=CASE WHEN current_version_id=$2 THEN NULL ELSE current_version_id END, current_version_changed_at=CASE WHEN current_version_id=$2 THEN now() ELSE current_version_changed_at END,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$3 RETURNING revision) SELECT * FROM changed`,
        [resume.id, id, expectedRevision],
      );
      if (!changed) throw new ConflictException('문서 revision 불일치');
      await this.withdrawSources(manager);
      return { id, revision: changed.revision, deletedAt: deleted.deleted_at };
    });
  }

  deleteDetail(
    slug: string,
    expectedRevision: number,
  ): Promise<CareerDeleteResultDto> {
    return this.write(async (manager) => {
      const [row] = await manager.query<
        { revision: number; deleted_at: string | null }[]
      >('SELECT revision,deleted_at FROM resume_details WHERE slug=$1', [slug]);
      if (!row) throw new NotFoundException('상세가 없습니다.');
      if (row.deleted_at)
        return { id: slug, revision: row.revision, deletedAt: row.deleted_at };
      if (row.revision !== expectedRevision)
        throw new ConflictException('상세 revision 불일치');
      await manager.query(
        'UPDATE resume_content_dependencies SET deleted_at=COALESCE(deleted_at,now()) WHERE detail_slug=$1',
        [slug],
      );
      const [result] = await manager.query<CareerDeleteResultDto[]>(
        'WITH changed AS (UPDATE resume_details SET deleted_at=now(),revision=revision+1,updated_at=now() WHERE slug=$1 AND revision=$2 RETURNING slug AS id,revision,deleted_at AS "deletedAt") SELECT * FROM changed',
        [slug, expectedRevision],
      );
      if (!result) throw new ConflictException('상세 revision 불일치');
      await this.withdrawSources(manager);
      return result;
    });
  }

  private async upsert(
    manager: EntityManager,
    table: string,
    input: CareerIdentityDto,
    values: Record<string, unknown>,
  ): Promise<void> {
    const [existing] = await manager.query<Row[]>(
      `SELECT * FROM ${table} WHERE id=$1`,
      [input.id],
    );
    if (existing?.deleted_at)
      throw new ConflictException('삭제된 원본은 다시 저장할 수 없습니다.');
    if ((existing?.revision ?? 0) !== input.expectedRevision)
      throw new ConflictException(`${table}: revision 불일치`);
    const entries = Object.entries(values);
    if (existing) {
      const changed = await manager.query<{ id: string }[]>(
        `WITH changed AS (UPDATE ${table} SET ${entries.map(([key], index) => `${key}=$${index + 2}`).join(',')},revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$${entries.length + 2} RETURNING id) SELECT * FROM changed`,
        [
          input.id,
          ...entries.map(([, value]) => value),
          input.expectedRevision,
        ],
      );
      if (!changed.length)
        throw new ConflictException(`${table}: revision 불일치`);
    } else {
      await manager.query(
        `INSERT INTO ${table}(id,${entries.map(([key]) => key).join(',')}) VALUES ($1,${entries.map((_, index) => `$${index + 2}`).join(',')})`,
        [input.id, ...entries.map(([, value]) => value)],
      );
    }
  }

  upsertData(input: CareerDataUpsertDto): Promise<CareerDataSnapshotDto> {
    return this.write(async (manager) => {
      for (const row of input.experiences) {
        if (row.periodStart && row.periodEnd && row.periodStart > row.periodEnd)
          throw new BadRequestException('경험 종료월이 시작월보다 빠릅니다.');
        await this.upsert(manager, tables.experience, row, {
          company: row.company,
          title: row.title,
          project: row.project,
          public_title: row.publicTitle,
          period_start: row.periodStart,
          period_end: row.periodEnd,
        });
      }
      for (const row of input.facts) {
        if (row.verificationStatus === 'confirmed' && !row.evidence.length)
          throw new BadRequestException('확인된 사실에는 출처가 필요합니다.');
        await this.requireActive(manager, tables.experience, row.experienceId);
        await this.upsert(manager, tables.fact, row, {
          experience_id: row.experienceId,
          kind: row.kind,
          content: row.content,
          verification_status: row.verificationStatus,
          evidence: JSON.stringify(row.evidence),
          metric: row.metric === null ? null : JSON.stringify(row.metric),
          claim_boundary: row.claimBoundary,
          visibility: row.visibility,
        });
      }
      for (const row of input.keywords)
        await this.upsert(manager, tables.keyword, row, {
          key: row.key,
          label: row.label,
          kind: row.kind,
          aliases: row.aliases,
        });
      for (const row of input.bullets) {
        if (row.status === 'ready' && !row.facts.length)
          throw new BadRequestException(
            'ready 불렛에는 사실 연결이 필요합니다.',
          );
        await manager.query(
          'UPDATE career_bullet_facts SET deleted_at=COALESCE(deleted_at,now()) WHERE bullet_id=$1',
          [row.id],
        );
        await manager.query(
          'UPDATE career_bullet_keywords SET deleted_at=COALESCE(deleted_at,now()) WHERE bullet_id=$1',
          [row.id],
        );
        await this.requireActive(manager, tables.experience, row.experienceId);
        await this.upsert(manager, tables.bullet, row, {
          experience_id: row.experienceId,
          text: row.text,
          focus: row.focus,
          status: row.status,
          visibility: row.visibility,
          source_refs: JSON.stringify(row.sourceRefs),
          review_note: row.reviewNote,
        });
        for (const link of row.facts) {
          const [fact] = await manager.query<Row[]>(
            'SELECT * FROM career_facts WHERE id=$1 AND deleted_at IS NULL',
            [link.factId],
          );
          if (
            !fact ||
            fact.experience_id !== row.experienceId ||
            link.factRevision > fact.revision
          )
            throw new ConflictException(
              '불렛의 경험 또는 사실 버전이 일치하지 않습니다.',
            );
          if (
            row.status === 'ready' &&
            (fact.revision !== link.factRevision ||
              (row.visibility === 'public' && fact.visibility !== 'public') ||
              fact.verification_status !== 'confirmed')
          )
            throw new ConflictException(
              'ready 불렛은 현재 확인된 사실을 참조하고 공개 후보는 공개 사실을 참조해야 합니다.',
            );
          await manager.query(
            'INSERT INTO career_bullet_facts(bullet_id,fact_id,experience_id,fact_revision) VALUES ($1,$2,$3,$4) ON CONFLICT(bullet_id,fact_id) DO UPDATE SET experience_id=EXCLUDED.experience_id,fact_revision=EXCLUDED.fact_revision,deleted_at=NULL',
            [row.id, link.factId, row.experienceId, link.factRevision],
          );
        }
        for (const keywordId of row.keywordIds) {
          await this.requireActive(manager, tables.keyword, keywordId);
          await manager.query(
            'INSERT INTO career_bullet_keywords(bullet_id,keyword_id) VALUES ($1,$2) ON CONFLICT(bullet_id,keyword_id) DO UPDATE SET deleted_at=NULL',
            [row.id, keywordId],
          );
        }
        if (row.status === 'ready' && row.visibility === 'public') {
          const [experience] = await manager.query<Row[]>(
            'SELECT * FROM career_experiences WHERE id=$1',
            [row.experienceId],
          );
          if (!experience?.public_title)
            throw new ConflictException(
              'ready 불렛에는 공개 경험 제목이 필요합니다.',
            );
        }
      }
      // 이미 저장한 문구는 유지하고, 현재 후보만 근거 변경을 재검토하도록 표시한다.
      await manager.query(
        `UPDATE career_bullets b SET status='needs_review',revision=revision+1,updated_at=now() WHERE b.deleted_at IS NULL AND b.status='ready' AND EXISTS (SELECT 1 FROM career_bullet_facts bf JOIN career_facts f ON f.id=bf.fact_id WHERE bf.bullet_id=b.id AND bf.deleted_at IS NULL AND f.deleted_at IS NULL AND bf.fact_revision<>f.revision)`,
      );
      await this.syncBulletSources(manager);
      await this.withdrawSources(manager);
      return this.readSnapshot(manager);
    });
  }

  private async dependencies(
    manager: EntityManager,
    inputs: CareerDependencyDto[],
    isPublic: boolean,
  ): Promise<Dependency[]> {
    const result = new Map<string, Dependency>();
    const add = async (
      kind: CareerDependencyDto['kind'],
      id: string,
      revision?: number,
    ): Promise<void> => {
      const key = `${kind}/${id}`;
      const [snapshot] = await manager.query<Row[]>(
        `SELECT * FROM ${tables[kind]} WHERE id=$1 AND deleted_at IS NULL`,
        [id],
      );
      if (!snapshot) throw new ConflictException(`없는 원본: ${key}`);
      if (revision !== undefined && snapshot.revision !== revision)
        throw new ConflictException(`원본 revision 불일치: ${key}`);
      const previous = result.get(key);
      if (previous) {
        if (previous.revision !== snapshot.revision)
          throw new ConflictException('서로 다른 원본 버전입니다.');
        return;
      }
      if (
        isPublic &&
        ((kind === 'experience' && !snapshot.public_title) ||
          (kind === 'fact' &&
            (snapshot.visibility !== 'public' ||
              snapshot.verification_status !== 'confirmed')) ||
          (kind === 'bullet' &&
            (snapshot.visibility !== 'public' || snapshot.status !== 'ready')))
      )
        throw new ConflictException(`공개할 수 없는 원본: ${key}`);
      result.set(key, { kind, id, revision: snapshot.revision, snapshot });
      if (kind === 'fact' || kind === 'bullet')
        await add('experience', String(snapshot.experience_id));
      if (kind === 'bullet') {
        const links = await manager.query<
          { fact_id: string; fact_revision: number }[]
        >(
          'SELECT * FROM career_bullet_facts WHERE bullet_id=$1 AND deleted_at IS NULL ORDER BY fact_id',
          [id],
        );
        if (isPublic && !links.length)
          throw new ConflictException('공개 불렛에 사실 연결이 없습니다.');
        for (const link of links)
          await add('fact', link.fact_id, link.fact_revision);
        const keywords = await manager.query<{ keyword_id: string }[]>(
          'SELECT keyword_id FROM career_bullet_keywords WHERE bullet_id=$1 AND deleted_at IS NULL ORDER BY keyword_id',
          [id],
        );
        for (const link of keywords) await add('keyword', link.keyword_id);
        snapshot.facts = links;
        snapshot.keywordIds = keywords.map((link) => link.keyword_id);
      }
    };
    for (const input of inputs) await add(input.kind, input.id, input.revision);
    return [...result.values()].sort((a, b) =>
      `${a.kind}/${a.id}`.localeCompare(`${b.kind}/${b.id}`),
    );
  }

  private async saveDependencies(
    manager: EntityManager,
    target: {
      versionId?: string;
      slug?: string;
      detailRevision?: number;
      sourceItemId?: string;
    },
    dependencies: Dependency[],
  ): Promise<void> {
    for (const dependency of dependencies) {
      await manager.query(
        `INSERT INTO resume_content_dependencies(resume_version_id,detail_slug,detail_revision,source_item_id,${dependency.kind}_id,source_revision,source_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [
          target.versionId ?? null,
          target.slug ?? null,
          target.detailRevision ?? null,
          target.sourceItemId ?? null,
          dependency.id,
          dependency.revision,
          JSON.stringify(dependency.snapshot),
        ],
      );
    }
  }

  private result(resume: ResumeRow, version: VersionRow): ResumeSaveResultDto {
    return {
      documentId: resume.id,
      key: resume.key,
      locale: resume.locale,
      revision: resume.revision,
      versionId: version.id,
      versionName: version.version_name,
      currentVersionId: resume.current_version_id,
      contentHash: version.content_hash,
    };
  }

  saveVersion(input: ResumeVersionSaveDto): Promise<ResumeSaveResultDto> {
    return this.write(async (manager) => {
      if (
        (input.kind === 'base' && input.targetKey !== null) ||
        (input.kind === 'targeted' && !input.targetKey?.trim())
      )
        throw new BadRequestException('문서 종류와 targetKey가 맞지 않습니다.');
      const payload = { ...input };
      const payloadForHash = {
        key: payload.key,
        kind: payload.kind,
        track: payload.track,
        locale: payload.locale,
        targetKey: payload.targetKey,
        visibility: payload.visibility,
        versionName: payload.versionName,
        parentVersionId: payload.parentVersionId,
        content: payload.content,
        sourceRef: payload.sourceRef,
      };
      const payloadHash = careerContentHash({
        ...payloadForHash,
        dependencies: [...input.dependencies].sort((a, b) =>
          `${a.kind}/${a.id}`.localeCompare(`${b.kind}/${b.id}`),
        ),
      });
      let [resume] = await manager.query<ResumeRow[]>(
        'SELECT * FROM resumes WHERE key=$1 AND locale=$2',
        [input.key, input.locale],
      );
      if (resume?.deleted_at)
        throw new ConflictException('삭제된 문서는 다시 저장할 수 없습니다.');
      if (resume) {
        const [retry] = await manager.query<VersionRow[]>(
          'SELECT * FROM resume_versions WHERE resume_id=$1 AND version_name=$2',
          [resume.id, input.versionName],
        );
        if (retry) {
          if (retry.deleted_at)
            throw new ConflictException(
              '삭제된 버전은 다시 저장할 수 없습니다.',
            );
          if (retry.payload_hash !== payloadHash)
            throw new ConflictException('같은 버전명에 다른 내용이 있습니다.');
          return this.result(resume, retry);
        }
      }
      if (
        (resume?.revision ?? 0) !== input.expectedRevision ||
        (resume?.current_version_id ?? null) !== input.expectedCurrentVersionId
      )
        throw new ConflictException(
          '문서 revision 또는 current version 불일치',
        );
      if (input.parentVersionId) {
        const [parent] = await manager.query<VersionRow[]>(
          'SELECT v.id FROM resume_versions v JOIN resumes r ON r.id=v.resume_id WHERE v.id=$1 AND v.deleted_at IS NULL AND r.deleted_at IS NULL',
          [input.parentVersionId],
        );
        if (!parent) throw new ConflictException('부모 버전이 없습니다.');
      }
      const dependencies = await this.dependencies(
        manager,
        input.dependencies,
        input.visibility === 'public',
      );
      const documentId = resume?.id ?? randomUUID();
      if (!resume) {
        [resume] = await manager.query<ResumeRow[]>(
          `INSERT INTO resumes(id,key,kind,track,locale,target_key,visibility) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [
            documentId,
            input.key,
            input.kind,
            input.track,
            input.locale,
            input.targetKey,
            input.visibility,
          ],
        );
      }
      const contentHash = careerContentHash(input.content);
      const [version] = await manager.query<VersionRow[]>(
        `INSERT INTO resume_versions(resume_id,version_name,parent_version_id,content,content_hash,source_ref,payload_hash) VALUES($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7) RETURNING *`,
        [
          documentId,
          input.versionName,
          input.parentVersionId,
          JSON.stringify(input.content),
          contentHash,
          JSON.stringify(input.sourceRef),
          payloadHash,
        ],
      );
      await this.saveDependencies(
        manager,
        { versionId: version.id },
        dependencies,
      );
      [resume] = await manager.query<ResumeRow[]>(
        `WITH changed AS (UPDATE resumes SET kind=$2,track=$3,target_key=$4,visibility=$5,current_version_id=$6,revision=$7,current_version_changed_at=now(),updated_at=now() WHERE id=$1 AND revision=$8 AND current_version_id IS NOT DISTINCT FROM $9::uuid RETURNING *) SELECT * FROM changed`,
        [
          documentId,
          input.kind,
          input.track,
          input.targetKey,
          input.visibility,
          version.id,
          input.expectedRevision + 1,
          resume.revision,
          input.expectedCurrentVersionId,
        ],
      );
      if (!resume)
        throw new ConflictException(
          '문서 revision 또는 current version 불일치',
        );
      await this.withdrawSources(manager);
      return this.result(resume, version);
    });
  }

  async listResumes(includeDeleted = false): Promise<ManagedResumeDto[]> {
    return this.dataSource.query(
      `SELECT id,key,locale,kind,track,target_key AS "targetKey",visibility,revision,current_version_id AS "currentVersionId",deleted_at AS "deletedAt" FROM resumes ${includeDeleted ? '' : 'WHERE deleted_at IS NULL'} ORDER BY key,locale`,
    );
  }

  setVisibility(
    id: string,
    input: ResumeVisibilityDto,
  ): Promise<ManagedResumeDto> {
    return this.write(async (manager) => {
      const [resume] = await manager.query<ResumeRow[]>(
        'SELECT * FROM resumes WHERE id=$1',
        [id],
      );
      if (!resume || resume.deleted_at)
        throw new NotFoundException('문서가 없습니다.');
      if (resume.revision !== input.expectedRevision)
        throw new ConflictException('문서 revision 불일치');
      if (input.visibility === 'public') {
        const [allowed] = await manager.query<{ id: string }[]>(
          `SELECT id FROM resume_versions v WHERE id=$1 AND v.deleted_at IS NULL AND ${publicDependencyCondition('d.resume_version_id=v.id')}`,
          [resume.current_version_id],
        );
        if (!allowed)
          throw new ConflictException('공개할 현재 버전이 없습니다.');
      }
      const [result] = await manager.query<ManagedResumeDto[]>(
        `WITH changed AS (UPDATE resumes SET visibility=$2,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$3 RETURNING id,key,locale,kind,track,target_key AS "targetKey",visibility,revision,current_version_id AS "currentVersionId",deleted_at AS "deletedAt") SELECT * FROM changed`,
        [id, input.visibility, input.expectedRevision],
      );
      if (!result) throw new ConflictException('문서 revision 불일치');
      if (input.visibility === 'public') {
        const saved = await manager.query<
          {
            experience_id: string | null;
            fact_id: string | null;
            bullet_id: string | null;
            source_snapshot: Row;
          }[]
        >(
          'SELECT experience_id,fact_id,bullet_id,source_snapshot FROM resume_content_dependencies WHERE resume_version_id=$1',
          [resume.current_version_id],
        );
        const hasReviewSnapshot = saved.some(
          ({ experience_id, fact_id, bullet_id, source_snapshot: snapshot }) =>
            (experience_id && !snapshot.public_title) ||
            (fact_id &&
              (snapshot.visibility !== 'public' ||
                snapshot.verification_status !== 'confirmed')) ||
            (bullet_id &&
              (snapshot.visibility !== 'public' ||
                snapshot.status !== 'ready')),
        );
        if (hasReviewSnapshot)
          throw new ConflictException(
            '검토용 비공개 원본 snapshot은 새 공개 버전으로 저장하세요.',
          );
      }
      await this.withdrawSources(manager);
      return result;
    });
  }

  saveDetail(
    slug: string,
    input: ResumeDetailSaveDto,
  ): Promise<{ slug: string; revision: number }> {
    return this.write(async (manager) => {
      const [detail] = await manager.query<
        { revision: number; deleted_at: string | null }[]
      >('SELECT revision,deleted_at FROM resume_details WHERE slug=$1', [slug]);
      if (detail?.deleted_at)
        throw new ConflictException('삭제된 상세는 다시 저장할 수 없습니다.');
      if ((detail?.revision ?? 0) !== input.expectedRevision)
        throw new ConflictException('상세 revision 불일치');
      const dependencies = await this.dependencies(
        manager,
        input.dependencies,
        input.visibility === 'public',
      );
      const revision = input.expectedRevision + 1;
      const changed = await manager.query<{ slug: string }[]>(
        `INSERT INTO resume_details(slug,title,content,start_date,end_date,visibility,revision) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,visibility=EXCLUDED.visibility,revision=EXCLUDED.revision,updated_at=now() WHERE resume_details.revision=$8 RETURNING slug`,
        [
          slug,
          input.title,
          input.content,
          input.startDate,
          input.endDate,
          input.visibility,
          revision,
          input.expectedRevision,
        ],
      );
      if (!changed.length) throw new ConflictException('상세 revision 불일치');
      await this.saveDependencies(
        manager,
        { slug, detailRevision: revision },
        dependencies,
      );
      await this.publishSource(
        manager,
        {
          key: `resume-detail/${slug}`,
          itemType: 'project_detail',
          title: input.title,
          body: input.content,
          locale: null,
          metadata: { slug, revision },
          isPublic: input.visibility === 'public',
        },
        dependencies,
      );
      await this.withdrawSources(manager);
      return { slug, revision };
    });
  }

  publishFact(
    id: string,
    expectedRevision: number,
  ): Promise<{ sourceItemId: string }> {
    return this.write(async (manager) => {
      const dependencies = await this.dependencies(
        manager,
        [{ kind: 'fact', id, revision: expectedRevision }],
        true,
      );
      const fact = dependencies.find(
        (dependency) => dependency.kind === 'fact',
      )!.snapshot;
      const experience = dependencies.find(
        (dependency) => dependency.kind === 'experience',
      )!.snapshot;
      const title = `${String(experience.company)} · ${String(experience.public_title)}`;
      const evidence = fact.evidence as { kind: string; as_of: string }[];
      const body = [
        title,
        String(fact.content),
        `근거 종류와 기록 기준일: ${[...new Set(evidence.map((entry) => `${entry.kind} (${entry.as_of})`))].join(', ')}`,
        ...(fact.metric
          ? [`수치와 측정 조건: ${JSON.stringify(fact.metric)}`]
          : []),
        ...(fact.claim_boundary
          ? [
              `표현 한계: ${typeof fact.claim_boundary === 'string' ? fact.claim_boundary : ''}`,
            ]
          : []),
      ].join('\n\n');
      if (body.length > 4000)
        throw new BadRequestException(
          '공개 사실의 본문·측정 조건·표현 한계는 합계 4000자 이하여야 합니다.',
        );
      return {
        sourceItemId: await this.publishSource(
          manager,
          {
            key: `career-fact/${id}/ko-KR`,
            itemType: 'career_fact',
            title,
            body,
            locale: 'ko-KR',
            metadata: { factId: id, revision: expectedRevision },
            isPublic: true,
          },
          dependencies,
        ),
      };
    });
  }

  private async publishSource(
    manager: EntityManager,
    input: {
      key: string;
      itemType: string;
      title: string;
      body: string;
      locale: string | null;
      metadata: Record<string, unknown>;
      isPublic: boolean;
      contentHash?: string;
    },
    dependencies: Dependency[],
  ): Promise<string> {
    const metadata = {
      ...input.metadata,
      dependencies: dependencies.map(({ kind, id, revision }) => ({
        kind,
        id,
        revision,
      })),
    };
    const hash =
      input.contentHash ??
      careerContentHash({
        body: input.body,
        title: input.title,
        locale: input.locale,
        metadata,
        resumeVersionId: null,
        isPublic: input.isPublic,
      });
    const [existing] = await manager.query<
      { id: string; isCurrent: boolean; deleted_at: string | null }[]
    >(
      `SELECT id,"isCurrent",deleted_at FROM resume_source_items WHERE "sourceType"='career_data' AND "sourceKey"=$1 AND "contentHash"=$2`,
      [input.key, hash],
    );
    if (existing?.deleted_at)
      throw new ConflictException(
        '삭제된 검색 원문은 다시 발행할 수 없습니다.',
      );
    if (!existing?.isCurrent)
      await manager.query(
        `UPDATE resume_source_items SET "isCurrent"=false,status='inactive',vectorize=false,"updatedAt"=now() WHERE "sourceType"='career_data' AND "sourceKey"=$1 AND "isCurrent"`,
        [input.key],
      );
    if (existing) {
      // 같은 원문으로 돌아오면 기존 임베딩을 재사용한다. 공개 조건은 이후 withdrawSources가 다시 검사한다.
      await manager.query(
        `UPDATE resume_source_items SET "isCurrent"=true,status=$2,visibility=$3,vectorize=$4,"updatedAt"=now() WHERE id=$1`,
        [
          existing.id,
          input.isPublic ? 'active' : 'inactive',
          input.isPublic ? 'public' : 'private',
          input.isPublic,
        ],
      );
      if (input.isPublic)
        await manager.query(
          `UPDATE resume_vector_chunks SET status='active' WHERE "sourceItemId"=$1 AND deleted_at IS NULL AND status='inactive'`,
          [existing.id],
        );
      return existing.id;
    }
    const [source] = await manager.query<{ id: string }[]>(
      `INSERT INTO resume_source_items("sourceType","itemType","sourcePath","sourceKey",title,"bodyText",locale,status,visibility,vectorize,"contentHash",metadata,"isCurrent") VALUES('career_data',$1,'career-data',$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,true) RETURNING id`,
      [
        input.itemType,
        input.key,
        input.title.slice(0, 300),
        input.body,
        input.locale,
        input.isPublic ? 'active' : 'inactive',
        input.isPublic ? 'public' : 'private',
        input.isPublic,
        hash,
        JSON.stringify(metadata),
      ],
    );
    await this.saveDependencies(
      manager,
      { sourceItemId: source.id },
      dependencies,
    );
    return source.id;
  }

  // 공개 가능한 현재 불렛을 RAG 원문으로 맞춘다. 원문이 같으면 기존 행과 임베딩을 유지한다.
  private async syncBulletSources(manager: EntityManager): Promise<void> {
    const bullets = await manager.query<
      {
        id: string;
        revision: number;
        text: string;
        company: string;
        public_title: string;
      }[]
    >(
      `SELECT b.id,b.revision,b.text,e.company,e.public_title FROM career_bullets b JOIN career_experiences e ON e.id=b.experience_id WHERE ${publicBulletCondition('b.id')} ORDER BY b.id`,
    );
    if (!bullets.length) return;
    const bulletIds = bullets.map(({ id }) => id);
    const facts = await manager.query<
      {
        bullet_id: string;
        content: string;
        metric: unknown;
        claim_boundary: string | null;
      }[]
    >(
      'SELECT bf.bullet_id,f.content,f.metric,f.claim_boundary FROM career_bullet_facts bf JOIN career_facts f ON f.id=bf.fact_id WHERE bf.bullet_id=ANY($1) AND bf.deleted_at IS NULL ORDER BY bf.bullet_id,f.id',
      [bulletIds],
    );
    const keywords = await manager.query<
      { bullet_id: string; label: string }[]
    >(
      'SELECT bk.bullet_id,k.label FROM career_bullet_keywords bk JOIN career_keywords k ON k.id=bk.keyword_id WHERE bk.bullet_id=ANY($1) AND bk.deleted_at IS NULL AND k.deleted_at IS NULL ORDER BY bk.bullet_id,k.label',
      [bulletIds],
    );
    const sources = await manager.query<
      {
        sourceKey: string;
        contentHash: string;
        isCurrent: boolean;
        status: string;
        deleted_at: string | null;
      }[]
    >(
      `SELECT "sourceKey","contentHash","isCurrent",status,deleted_at FROM resume_source_items WHERE "sourceType"='career_data' AND "itemType"='career_bullet'`,
    );
    const sourceStates = new Map(
      sources.map((source) => [
        `${source.sourceKey}\n${source.contentHash}`,
        source,
      ]),
    );
    for (const bullet of bullets) {
      const key = `career-bullet/${bullet.id}/ko-KR`;
      const title = `${bullet.company} · ${bullet.public_title}`;
      const labels = keywords
        .filter((keyword) => keyword.bullet_id === bullet.id)
        .map((keyword) => keyword.label);
      const body = [
        title,
        bullet.text,
        ...(labels.length ? [`관련 기술·역량: ${labels.join(', ')}`] : []),
        [
          '근거 사실:',
          ...facts
            .filter((fact) => fact.bullet_id === bullet.id)
            .map((fact) =>
              [
                `- ${fact.content}`,
                ...(fact.metric
                  ? [`  수치와 측정 조건: ${JSON.stringify(fact.metric)}`]
                  : []),
                ...(fact.claim_boundary
                  ? [`  표현 한계: ${fact.claim_boundary}`]
                  : []),
              ].join('\n'),
            ),
        ].join('\n'),
      ].join('\n\n');
      const contentHash = careerContentHash({
        itemType: 'career_bullet',
        key,
        title,
        body,
      });
      const state = sourceStates.get(`${key}\n${contentHash}`);
      // 삭제된 원문은 되살리지 않는다. 같은 원문이 이미 활성이라면 다시 쓸 필요가 없다.
      if (state?.deleted_at || (state?.isCurrent && state.status === 'active'))
        continue;
      await this.publishSource(
        manager,
        {
          key,
          itemType: 'career_bullet',
          title,
          body,
          locale: 'ko-KR',
          metadata: { bulletId: bullet.id },
          isPublic: true,
          contentHash,
        },
        await this.dependencies(
          manager,
          [{ kind: 'bullet', id: bullet.id, revision: bullet.revision }],
          true,
        ),
      );
    }
  }

  private async withdrawSources(manager: EntityManager): Promise<void> {
    await manager.query(`UPDATE resume_source_items s SET deleted_at=now(),status='inactive',vectorize=false,"updatedAt"=now() WHERE s."sourceType"='career_data' AND s.deleted_at IS NULL AND (
      EXISTS(SELECT 1 FROM resumes r WHERE r.id=s."resumeId" AND r.deleted_at IS NOT NULL) OR
      EXISTS(SELECT 1 FROM resume_versions v WHERE v.id=s."resumeVersionId" AND v.deleted_at IS NOT NULL) OR
      (s."itemType"='project_detail' AND EXISTS(SELECT 1 FROM resume_details detail WHERE detail.slug=s.metadata->>'slug' AND detail.deleted_at IS NOT NULL)) OR
      EXISTS(SELECT 1 FROM resume_content_dependencies d LEFT JOIN career_experiences e ON e.id=d.experience_id LEFT JOIN career_facts f ON f.id=d.fact_id LEFT JOIN career_bullets b ON b.id=d.bullet_id LEFT JOIN career_experiences fe ON fe.id=f.experience_id LEFT JOIN career_experiences be ON be.id=b.experience_id WHERE d.source_item_id=s.id AND (d.deleted_at IS NOT NULL OR e.deleted_at IS NOT NULL OR f.deleted_at IS NOT NULL OR b.deleted_at IS NOT NULL OR fe.deleted_at IS NOT NULL OR be.deleted_at IS NOT NULL))
    )`);
    await manager.query(
      `UPDATE resume_content_dependencies d SET deleted_at=COALESCE(d.deleted_at,now()) WHERE d.source_item_id IN(SELECT s.id FROM resume_source_items s WHERE s."sourceType"='career_data' AND s.deleted_at IS NOT NULL)`,
    );
    await manager.query(
      `UPDATE resume_vector_chunks c SET deleted_at=COALESCE(c.deleted_at,now()),status='inactive' WHERE EXISTS(SELECT 1 FROM resume_source_items s WHERE s.id=c."sourceItemId" AND s."sourceType"='career_data' AND s.deleted_at IS NOT NULL)`,
    );
    await manager.query(`UPDATE resume_source_items s SET status='inactive',vectorize=false,"updatedAt"=now() WHERE s."sourceType"='career_data' AND s.status='active' AND (
   s.deleted_at IS NOT NULL OR NOT s."isCurrent" OR NOT ${publicDependencyCondition('d.source_item_id=s.id')} OR
   s."itemType"='resume_version' OR
   (s."itemType"='career_bullet' AND NOT ${publicBulletCondition(`(s.metadata->>'bulletId')::uuid`)}) OR
   (s."itemType"='career_fact' AND NOT EXISTS(SELECT 1 FROM resume_content_dependencies d JOIN career_facts f ON f.id=d.fact_id WHERE d.source_item_id=s.id AND d.deleted_at IS NULL AND f.deleted_at IS NULL AND f.revision=d.source_revision AND f.visibility='public' AND f.verification_status='confirmed')) OR
   (s."itemType"='project_detail' AND NOT EXISTS(SELECT 1 FROM resume_details detail WHERE detail.slug=s.metadata->>'slug' AND detail.deleted_at IS NULL AND detail.revision=(s.metadata->>'revision')::int AND detail.visibility='public' AND ${publicDependencyCondition('d.detail_slug=detail.slug AND d.detail_revision=detail.revision')}))
  )`);
    await manager.query(
      `UPDATE resume_vector_chunks c SET status='inactive' WHERE c.status='active' AND EXISTS(SELECT 1 FROM resume_source_items s WHERE s.id=c."sourceItemId" AND s."sourceType"='career_data' AND (s.deleted_at IS NOT NULL OR s.status<>'active' OR NOT s.vectorize OR NOT s."isCurrent"))`,
    );
  }
}
