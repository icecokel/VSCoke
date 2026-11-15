import { getResumeChunkConfigHash } from './indexing/resume-index-profile';
import { getResumeRagConfig } from './resume-rag.config';
import {
  findResumeRagReadinessProblems,
  inspectResumeRagReadiness,
  usesResumeVectorRetrieval,
} from './resume-rag-readiness';

const embeddingEnv = {
  RAG_EMBEDDING_PROVIDER: 'local-e5-q8',
  RAG_EMBEDDING_MODEL: 'Xenova/multilingual-e5-small@rev',
  RAG_EMBEDDING_DIMENSIONS: '384',
};

const createQuery = (sourceItems: number, chunks: number) =>
  jest.fn((sql: string) =>
    Promise.resolve(
      sql.includes('resume_vector_chunks')
        ? [{ chunks, indexedSourceItems: chunks > 0 ? 1 : 0 }]
        : [{ sourceItems }],
    ),
  );

describe('Resume RAG readiness', () => {
  it.each([
    [{ RAG_RETRIEVAL_MODE: 'keyword', ...embeddingEnv }, false],
    [{ RAG_RETRIEVAL_MODE: 'hybrid' }, false],
    [{ RAG_RETRIEVAL_MODE: 'hybrid', ...embeddingEnv }, true],
    [{ RAG_RETRIEVAL_MODE: 'vector' }, true],
  ])('decides vector checks like the retriever: %j', (env, expected) => {
    expect(usesResumeVectorRetrieval(getResumeRagConfig(env))).toBe(expected);
  });

  it('counts channel-scoped public items and current-profile vectors', async () => {
    const config = getResumeRagConfig(embeddingEnv);
    const query = createQuery(4, 9);

    const report = await inspectResumeRagReadiness(query, config);

    expect(report.map(({ channel }) => channel)).toEqual(['main', 'resume']);
    expect(report[1]).toEqual({
      channel: 'resume',
      sourceTypes: ['career_data'],
      sourceItems: 4,
      vectors: {
        embeddingProvider: 'local-e5-q8',
        embeddingModel: 'Xenova/multilingual-e5-small@rev',
        embeddingDimensions: 384,
        chunkerVersion: 'resume-source-item-chunker-v1',
        chunkConfigHash: getResumeChunkConfigHash(config),
        chunks: 9,
        indexedSourceItems: 1,
      },
    });
    const vectorCall = query.mock.calls.find(([sql]) =>
      sql.includes('resume_vector_chunks'),
    ) as unknown as [string, unknown[]];
    expect(vectorCall[0]).toContain('vector_dims(chunk.embedding) = $6');
    expect(vectorCall[1].slice(3)).toEqual([
      'local-e5-q8',
      'Xenova/multilingual-e5-small@rev',
      384,
      'resume-source-item-chunker-v1',
      getResumeChunkConfigHash(config),
    ]);
    expect(findResumeRagReadinessProblems(report)).toEqual([]);
  });

  it('skips vector counts when vectors are not searched', async () => {
    const query = createQuery(2, 0);

    const report = await inspectResumeRagReadiness(
      query,
      getResumeRagConfig({ RAG_RETRIEVAL_MODE: 'keyword' }),
    );

    expect(report.every(({ vectors }) => vectors === null)).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
    expect(findResumeRagReadinessProblems(report)).toEqual([]);
  });

  it('reports actionable problems for empty sources and vectors', async () => {
    const report = await inspectResumeRagReadiness(
      createQuery(0, 0),
      getResumeRagConfig(embeddingEnv),
    );

    const problems = findResumeRagReadinessProblems(report);
    expect(problems).toHaveLength(4);
    expect(problems[2]).toMatch(/resume 채널의 검색 가능한 공개 원문이 0건/);
    expect(problems[3]).toMatch(/resume:index/);
    expect(problems[3]).toMatch(/RAG_RETRIEVAL_MODE=keyword/);
  });

  it('requires embedding settings in vector-only mode', async () => {
    await expect(
      inspectResumeRagReadiness(
        createQuery(1, 1),
        getResumeRagConfig({ RAG_RETRIEVAL_MODE: 'vector' }),
      ),
    ).rejects.toThrow('RAG_EMBEDDING_PROVIDER');
  });
});
