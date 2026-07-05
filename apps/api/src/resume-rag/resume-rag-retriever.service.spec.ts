import { DataSource } from 'typeorm';
import { ResumeRagRetrieverService } from './resume-rag-retriever.service';
import type { EmbeddingProvider } from './ai/embedding-provider';
import type { ResumeRagConfig } from './resume-rag.config';

describe('ResumeRagRetrieverService', () => {
  it('queries vector chunks only and filters by embedding profile', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'chunk-1',
        content: '근거',
        title: 'Source',
        sourcePath: 'docs/source.md',
        sourceKey: 'source#section',
        citationMetadata: { sectionPath: 'A' },
        similarity: 0.91,
      },
    ]);
    const dataSource = { query } as unknown as DataSource;
    const embeddingProvider: EmbeddingProvider = {
      embed: jest.fn().mockResolvedValue({
        provider: 'openai-compatible',
        model: 'embedding-model',
        dimensions: 3,
        vector: [0.1, 0.2, 0.3],
      }),
    };
    const config: ResumeRagConfig = {
      embeddingProvider: 'openai-compatible',
      embeddingModel: 'embedding-model',
      embeddingDimensions: 3,
      topK: 5,
      minSimilarity: 0.8,
      allowedVisibilities: ['public'],
    };

    const service = new ResumeRagRetrieverService(
      dataSource,
      embeddingProvider,
      config,
    );

    const result = await service.retrieve({
      question: '질문',
      locale: 'ko-KR',
    });

    expect(result).toHaveLength(1);
    const calls = query.mock.calls as Array<[string, unknown[]]>;
    const [sql, params] = calls[0];
    expect(sql).toContain('FROM resume_vector_chunks');
    expect(sql).not.toContain('resume_source_items');
    expect(sql).toContain('"embeddingProvider" = $2');
    expect(params).toEqual(
      expect.arrayContaining(['openai-compatible', 'embedding-model', 3]),
    );
  });
});
