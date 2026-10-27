import type { EntityManager, Repository } from 'typeorm';
import { ResumeVectorIndexerService } from './resume-vector-indexer.service';
import { ResumeSourceItemChunker } from './resume-source-item-chunker';
import { ResumeSourceItem } from '../entities/resume-source-item.entity';
import { ResumeVectorChunk } from '../entities/resume-vector-chunk.entity';
import { getResumeRagConfig } from '../resume-rag.config';

const createHarness = () => {
  const source = Object.assign(new ResumeSourceItem(), {
    id: 'source',
    sourceType: 'app_resume',
    itemType: 'public_resume_detail',
    sourcePath: 'public.mdx',
    sourceKey: 'project',
    title: '프로젝트',
    bodyText: '공개 프로젝트 근거',
    locale: null,
    status: 'active',
    visibility: 'public',
    vectorize: true,
    contentHash: 'source-hash',
    metadata: {},
  });
  const chunker = new ResumeSourceItemChunker();
  const chunks = chunker.chunk({
    sourceItemId: source.id,
    bodyText: source.bodyText,
    metadata: {},
  });
  let findOptions: unknown;
  const sources = {
    find: jest.fn((options: unknown) => {
      findOptions = options;
      return Promise.resolve([source]);
    }),
    findOne: jest.fn().mockResolvedValue(source),
    query: jest.fn().mockResolvedValue([{ id: source.id }]),
  };
  const vectors = {
    find: jest.fn().mockResolvedValue([]),
    query: jest.fn().mockResolvedValue([]),
    softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    save: jest.fn().mockResolvedValue([]),
  };
  const manager = {
    query: jest.fn().mockResolvedValue([{ id: source.id }]),
    getRepository: (entity: unknown) =>
      entity === ResumeSourceItem ? sources : vectors,
  };
  const transaction = jest.fn(
    (operation: (manager: EntityManager) => Promise<unknown>) =>
      operation(manager as unknown as EntityManager),
  );
  const embedding = {
    provider: 'openai-compatible',
    model: 'test',
    dimensions: 2,
    vector: [1, 0],
  };
  const embed = jest.fn().mockResolvedValue(embedding);
  const config = getResumeRagConfig({
    RAG_EMBEDDING_PROVIDER: 'openai-compatible',
    RAG_EMBEDDING_MODEL: 'test',
    RAG_EMBEDDING_DIMENSIONS: '2',
  });
  return {
    sources,
    vectors,
    source,
    chunks,
    transaction,
    manager,
    embed,
    getFindOptions: () => findOptions,
    service: new ResumeVectorIndexerService(
      sources as unknown as Repository<ResumeSourceItem>,
      {
        ...vectors,
        manager: { transaction },
      } as unknown as Repository<ResumeVectorChunk>,
      chunker,
      { embed },
      config,
    ),
  };
};

describe('ResumeVectorIndexerService', () => {
  it('공개 활성 자료만 읽고, 모든 임베딩이 준비된 뒤 청크를 교체한다', async () => {
    const { service, sources, vectors, embed, getFindOptions } =
      createHarness();
    expect(await service.indexAll()).toEqual({
      indexed: 1,
      skipped: 0,
      published: 1,
      sources: 1,
    });
    expect(sources.find).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(getFindOptions())).toContain('app_resume');
    expect(embed).toHaveBeenCalledWith('공개 프로젝트 근거', 'passage');
    expect(vectors.query).toHaveBeenCalledWith(
      expect.stringContaining('source."sourceType" = ANY($1)'),
      [['app_resume', 'career_data']],
    );
    expect(vectors.softDelete).toHaveBeenCalledTimes(1);
    expect(vectors.save).toHaveBeenCalledWith([
      expect.objectContaining({ embedding: [1, 0], visibility: 'public' }),
    ]);
  });
  it('임베딩 중 현재 버전이 바뀌면 이전 source의 청크를 게시하지 않는다', async () => {
    const { service, source, sources, vectors, manager } = createHarness();
    source.sourceType = 'career_data';
    source.itemType = 'resume_version';
    source.isCurrent = true;
    sources.query.mockResolvedValue([{ id: source.id }]);
    manager.query.mockResolvedValue([]);
    expect(await service.indexAll()).toEqual({
      indexed: 1,
      skipped: 0,
      published: 0,
      sources: 0,
    });
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(1795000000004)',
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'r.current_version_id = source."resumeVersionId"',
      ),
      [source.id],
    );
    expect(vectors.save).not.toHaveBeenCalled();
  });

  it('현재 공통 상세 tombstone이 있으면 legacy section을 임베딩하지 않는다', async () => {
    const { service, source, sources, embed } = createHarness();
    source.sourceKey = 'app:resume-detail:project#역할';
    sources.query.mockResolvedValue([]);
    expect(await service.indexAll()).toEqual({
      indexed: 0,
      skipped: 0,
      published: 0,
      sources: 0,
    });
    expect(sources.query).toHaveBeenCalledWith(
      expect.stringContaining("|| '#')"),
      [source.id],
    );
    expect(embed).not.toHaveBeenCalled();
  });

  it('변경되지 않은 청크는 임베딩을 재사용한다', async () => {
    const { service, vectors, chunks, embed } = createHarness();
    vectors.find.mockResolvedValue([
      { chunkIndex: 0, contentHash: chunks[0].contentHash, embedding: [1, 0] },
    ]);
    expect(await service.indexAll()).toEqual({
      indexed: 0,
      skipped: 1,
      published: 1,
      sources: 1,
    });
    expect(embed).not.toHaveBeenCalled();
    expect(vectors.save).toHaveBeenCalledTimes(1);
  });
  it('임베딩 생성 실패 시 기존 프로필 청크를 삭제하지 않는다', async () => {
    const { service, vectors, embed, transaction } = createHarness();
    embed.mockRejectedValue(new Error('embedding failure'));
    await expect(service.indexAll()).rejects.toThrow('embedding failure');
    expect(vectors.softDelete).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('허용되지 않은 원본 타입으로 전환되면 준비한 청크를 게시하지 않는다', async () => {
    const { service, source, sources, vectors } = createHarness();
    sources.findOne.mockResolvedValue({
      ...source,
      sourceType: 'resume_workspace',
    });
    expect(await service.indexAll()).toEqual({
      indexed: 1,
      skipped: 0,
      published: 0,
      sources: 0,
    });
    expect(vectors.softDelete).not.toHaveBeenCalled();
    expect(vectors.save).not.toHaveBeenCalled();
  });

  it('임베딩 중 원본이 논리삭제되면 벡터를 저장하지 않는다', async () => {
    const { service, source, sources, vectors } = createHarness();
    sources.findOne.mockResolvedValue({ ...source, deletedAt: new Date() });
    expect(await service.indexAll()).toMatchObject({
      published: 0,
      sources: 0,
    });
    expect(vectors.softDelete).not.toHaveBeenCalled();
    expect(vectors.save).not.toHaveBeenCalled();
    expect(vectors.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'UPDATE resume_vector_chunks chunk SET deleted_at',
      ),
      expect.any(Array),
    );
  });

  it('임베딩 중 비공개로 전환된 원본은 게시하지 않는다', async () => {
    const { service, source, sources, vectors } = createHarness();
    sources.findOne.mockResolvedValue({ ...source, visibility: 'private' });
    expect(await service.indexAll()).toEqual({
      indexed: 1,
      skipped: 0,
      published: 0,
      sources: 0,
    });
    expect(vectors.softDelete).not.toHaveBeenCalled();
    expect(vectors.save).not.toHaveBeenCalled();
  });
});
