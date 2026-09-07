import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmbeddingProvider } from './ai/embedding-provider';
import {
  RESUME_RAG_EMBEDDING_PROVIDER,
  assertEmbeddingResultMatches,
} from './ai/embedding-provider';
import { requireEmbeddingModelConfig } from './resume-rag.config';
import { getResumeChunkConfigHash } from './indexing/resume-index-profile';
import { RESUME_CHUNKER_VERSION } from './indexing/resume-source-item-chunker';
import { DataSource } from 'typeorm';
import { RESUME_RAG_CONFIG, type ResumeRagConfig } from './resume-rag.config';
import { ResumeRagKeywordService } from './resume-rag-keyword.service';
import { normalizeResumeRagSearchText } from './resume-rag-keyword-gate';

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

type ResumeSourceItemRow = {
  id: string;
  title: string;
  bodyText: string;
  sourcePath: string;
  sourceKey: string;
  metadata: Record<string, unknown>;
};

type ScoredResumeSourceItem = ResumeSourceItemRow & {
  score: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isResumeSourceItemRow = (
  value: unknown,
): value is ResumeSourceItemRow => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.bodyText === 'string' &&
    typeof value.sourcePath === 'string' &&
    typeof value.sourceKey === 'string'
  );
};

const toSourceItemRow = (value: unknown): ResumeSourceItemRow | null => {
  if (!isResumeSourceItemRow(value)) return null;

  return {
    id: value.id,
    title: value.title,
    bodyText: value.bodyText,
    sourcePath: value.sourcePath,
    sourceKey: value.sourceKey,
    metadata: isRecord(value.metadata) ? value.metadata : {},
  };
};

const scoreRow = (row: ResumeSourceItemRow, tokens: string[]): number => {
  if (tokens.length === 0) return 0;

  const title = normalizeResumeRagSearchText(row.title);
  const searchableText = normalizeResumeRagSearchText(
    `${row.title} ${row.bodyText} ${row.sourceKey}`,
  );
  const matchedTokens = tokens.filter((token) =>
    searchableText.includes(token),
  );
  const titleMatches = matchedTokens.filter((token) =>
    title.includes(token),
  ).length;
  const baseScore = matchedTokens.length / tokens.length;
  const titleBoost = titleMatches > 0 ? 0.1 : 0;

  return Math.min(1, baseScore + titleBoost);
};

const toRetrievedChunk = (
  row: ScoredResumeSourceItem,
): RetrievedResumeChunk => ({
  id: row.id,
  content: row.bodyText,
  title: row.title,
  sourcePath: row.sourcePath,
  sourceKey: row.sourceKey,
  citationMetadata: row.metadata,
  similarity: Number(row.score.toFixed(4)),
});

@Injectable()
export class ResumeRagRetrieverService {
  private readonly logger = new Logger(ResumeRagRetrieverService.name);
  constructor(
    private readonly dataSource: DataSource,
    @Inject(RESUME_RAG_CONFIG)
    private readonly config: ResumeRagConfig,
    private readonly keywordService: ResumeRagKeywordService,
    @Inject(RESUME_RAG_EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  async retrieve(
    request: ResumeRagRetrieveRequest,
  ): Promise<RetrievedResumeChunk[]> {
    const mode = this.config.retrievalMode ?? 'keyword';
    if (mode === 'keyword') return this.retrieveKeywords(request);
    if (mode === 'vector')
      return (await this.retrieveVectors(request)).slice(0, this.config.topK);

    const [keywords, vectors] = await Promise.all([
      this.retrieveKeywords(request),
      this.retrieveVectors(request).catch(() => {
        this.logger.warn(
          'Resume vector search unavailable; using keyword retrieval',
        );
        return [] as RetrievedResumeChunk[];
      }),
    ]);
    return mergeResumeSearchResults(vectors, keywords, this.config.topK);
  }

  private async retrieveKeywords(
    request: ResumeRagRetrieveRequest,
  ): Promise<RetrievedResumeChunk[]> {
    const tokens = await this.keywordService.createSearchTokens(
      request.question,
    );
    if (tokens.length === 0) return [];

    const rows: unknown = await this.dataSource.query(
      `
        SELECT
          "id",
          "title",
          "bodyText",
          "sourcePath",
          "sourceKey",
          "metadata"
        FROM (
          SELECT DISTINCT ON ("sourceType", "sourceKey") *
          FROM resume_source_items
          WHERE "status" <> 'superseded'
            AND "sourceType" = ANY($3)
          ORDER BY "sourceType", "sourceKey", "updatedAt" DESC, "id" DESC
        ) AS current_items
        WHERE "status" = 'active'
          AND "vectorize" = TRUE
          AND "visibility" = 'public'
          AND "visibility" = ANY($1)
          AND (
            $2::varchar IS NULL
            OR "locale" IS NULL OR "locale" = $2
            OR split_part("locale", '-', 1) = split_part($2, '-', 1)
          )
        ORDER BY "updatedAt" DESC
      `,
      [
        this.config.allowedVisibilities,
        request.locale || null,
        this.config.allowedSourceTypes,
      ],
    );

    if (!Array.isArray(rows)) return [];

    return rows
      .map(toSourceItemRow)
      .filter((row): row is ResumeSourceItemRow => row !== null)
      .map(
        (row): ScoredResumeSourceItem => ({
          ...row,
          score: scoreRow(row, tokens),
        }),
      )
      .filter((row) => row.score >= this.config.minSimilarity)
      .sort((left, right) => right.score - left.score)
      .slice(0, this.config.topK)
      .map(toRetrievedChunk);
  }

  private async retrieveVectors(
    request: ResumeRagRetrieveRequest,
  ): Promise<RetrievedResumeChunk[]> {
    const profile = requireEmbeddingModelConfig(this.config);
    const embedding = await this.embeddingProvider.embed(request.question);
    assertEmbeddingResultMatches(embedding, {
      provider: profile.embeddingProvider,
      model: profile.embeddingModel,
      dimensions: profile.embeddingDimensions,
    });
    const rows: unknown = await this.dataSource.query(
      `WITH current_items AS MATERIALIZED (
        SELECT DISTINCT ON ("sourceType", "sourceKey") *
        FROM resume_source_items
          WHERE "status" <> 'superseded' AND "sourceType" = ANY($2)
        ORDER BY "sourceType", "sourceKey", "updatedAt" DESC, "id" DESC
      ), eligible AS MATERIALIZED (
        SELECT chunk.*, source.title AS "sourceTitle", source.metadata AS "sourceMetadata"
        FROM resume_vector_chunks chunk
        INNER JOIN current_items source ON source.id = chunk."sourceItemId"
        WHERE source.status = 'active' AND source.vectorize = TRUE
          AND source.visibility = 'public' AND source.visibility = ANY($1)
          AND chunk.status = 'active' AND chunk.visibility = 'public'
          AND ($3::varchar IS NULL OR source.locale IS NULL OR source.locale = $3
            OR split_part(source.locale, '-', 1) = split_part($3, '-', 1))
          AND chunk."embeddingProvider" = $4 AND chunk."embeddingModel" = $5
          AND chunk."embeddingDimensions" = $6 AND vector_dims(chunk.embedding) = $6
          AND chunk."chunkerVersion" = $7 AND chunk."chunkConfigHash" = $8
      )
      SELECT id, content, "sourceTitle" AS title, "sourcePath", "sourceKey",
        "sourceMetadata" AS "citationMetadata", 1 - (embedding <=> $9::vector) AS similarity
      FROM eligible
      WHERE 1 - (embedding <=> $9::vector) >= $10
      ORDER BY embedding <=> $9::vector, id
      LIMIT $11`,
      [
        this.config.allowedVisibilities,
        this.config.allowedSourceTypes,
        request.locale || null,
        profile.embeddingProvider,
        profile.embeddingModel,
        profile.embeddingDimensions,
        RESUME_CHUNKER_VERSION,
        getResumeChunkConfigHash(this.config),
        JSON.stringify(embedding.vector),
        this.config.vectorMinSimilarity ?? 0.3,
        this.config.topK * 3,
      ],
    );
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(
        (row): row is RetrievedResumeChunk =>
          isRecord(row) &&
          typeof row.id === 'string' &&
          typeof row.content === 'string' &&
          typeof row.title === 'string' &&
          typeof row.sourcePath === 'string' &&
          typeof row.sourceKey === 'string' &&
          isRecord(row.citationMetadata) &&
          Number.isFinite(Number(row.similarity)),
      )
      .map((row) => ({ ...row, similarity: Number(row.similarity) }));
  }
}

export const mergeResumeSearchResults = (
  vectors: RetrievedResumeChunk[],
  keywords: RetrievedResumeChunk[],
  topK: number,
): RetrievedResumeChunk[] => {
  const scores = new Map<
    string,
    { chunk: RetrievedResumeChunk; rank: number }
  >();
  for (const results of [vectors, keywords]) {
    const seen = new Set<string>();
    results.forEach((chunk, index) => {
      if (seen.has(chunk.sourceKey)) return;
      seen.add(chunk.sourceKey);
      const existing = scores.get(chunk.sourceKey);
      scores.set(chunk.sourceKey, {
        chunk: existing?.chunk ?? chunk,
        rank: (existing?.rank ?? 0) + 1 / (60 + index + 1),
      });
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, topK)
    .map(({ chunk }) => chunk);
};
