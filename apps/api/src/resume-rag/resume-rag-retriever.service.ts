import { Inject, Injectable } from '@nestjs/common';
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
  constructor(
    private readonly dataSource: DataSource,
    @Inject(RESUME_RAG_CONFIG)
    private readonly config: ResumeRagConfig,
    private readonly keywordService: ResumeRagKeywordService,
  ) {}

  async retrieve(
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
        FROM resume_source_items
        WHERE "status" = 'active'
          AND "vectorize" = TRUE
          AND "visibility" = ANY($1)
          AND (
            $2::varchar IS NULL
            OR "locale" IS NULL OR "locale" = $2
            OR split_part("locale", '-', 1) = split_part($2, '-', 1)
          )
        ORDER BY "updatedAt" DESC
      `,
      [this.config.allowedVisibilities, request.locale || null],
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
}
