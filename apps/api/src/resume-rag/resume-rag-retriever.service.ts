import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EmbeddingProvider } from './ai/embedding-provider';
import {
  RESUME_RAG_EMBEDDING_PROVIDER,
  assertEmbeddingResultMatches,
} from './ai/embedding-provider';
import {
  RESUME_RAG_CONFIG,
  type ResumeRagConfig,
  requireEmbeddingModelConfig,
} from './resume-rag.config';

export type ResumeRagRetrieveRequest = {
  question: string;
  locale: string;
};

export type RetrievedResumeChunk = {
  id: string;
  content: string;
  title: string;
  sourcePath: string;
  sourceKey: string;
  citationMetadata: Record<string, unknown>;
  similarity: number;
};

const toPgVector = (vector: number[]): string => `[${vector.join(',')}]`;

const isRetrievedResumeChunk = (
  value: unknown,
): value is RetrievedResumeChunk => {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<RetrievedResumeChunk>;
  return (
    typeof row.id === 'string' &&
    typeof row.content === 'string' &&
    typeof row.title === 'string' &&
    typeof row.sourcePath === 'string' &&
    typeof row.sourceKey === 'string' &&
    typeof row.similarity === 'number' &&
    typeof row.citationMetadata === 'object' &&
    row.citationMetadata !== null
  );
};

@Injectable()
export class ResumeRagRetrieverService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(RESUME_RAG_EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
    @Inject(RESUME_RAG_CONFIG)
    private readonly config: ResumeRagConfig,
  ) {}

  async retrieve(
    request: ResumeRagRetrieveRequest,
  ): Promise<RetrievedResumeChunk[]> {
    const embeddingConfig = requireEmbeddingModelConfig(this.config);
    const embedding = await this.embeddingProvider.embed(request.question);
    assertEmbeddingResultMatches(embedding, {
      provider: embeddingConfig.embeddingProvider,
      model: embeddingConfig.embeddingModel,
      dimensions: embeddingConfig.embeddingDimensions,
    });

    const rows: unknown = await this.dataSource.query(
      `
        SELECT
          "id",
          "content",
          "title",
          "sourcePath",
          "sourceKey",
          "citationMetadata",
          1 - ("embedding" <=> $1::vector) AS "similarity"
        FROM resume_vector_chunks
        WHERE "embeddingProvider" = $2
          AND "embeddingModel" = $3
          AND "embeddingDimensions" = $4
          AND "status" = 'active'
          AND "visibility" = ANY($5)
          AND ($6::varchar IS NULL OR "locale" IS NULL OR "locale" = $6)
          AND 1 - ("embedding" <=> $1::vector) >= $7
        ORDER BY "embedding" <=> $1::vector ASC
        LIMIT $8
      `,
      [
        toPgVector(embedding.vector),
        embeddingConfig.embeddingProvider,
        embeddingConfig.embeddingModel,
        embeddingConfig.embeddingDimensions,
        this.config.allowedVisibilities,
        request.locale || null,
        this.config.minSimilarity,
        this.config.topK,
      ],
    );

    return Array.isArray(rows) ? rows.filter(isRetrievedResumeChunk) : [];
  }
}
