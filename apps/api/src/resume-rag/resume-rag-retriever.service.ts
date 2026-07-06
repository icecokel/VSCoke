import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RESUME_RAG_CONFIG, type ResumeRagConfig } from './resume-rag.config';

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

const KOREAN_PARTICLES = [
  '으로서',
  '으로써',
  '에게서',
  '한테서',
  '에서',
  '에게',
  '한테',
  '까지',
  '부터',
  '처럼',
  '보다',
  '으로',
  '로',
  '와',
  '과',
  '은',
  '는',
  '이',
  '가',
  '을',
  '를',
  '에',
  '의',
  '도',
  '만',
  '야',
];

const STOP_WORDS = new Set([
  '뭐',
  '무엇',
  '뭐야',
  '알려줘',
  '알려',
  '설명',
  '어떤',
  '어느',
  'the',
  'a',
  'an',
  'is',
  'are',
  'what',
  'which',
  'about',
  'tell',
  'me',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const stripKoreanParticle = (token: string): string => {
  for (const particle of KOREAN_PARTICLES) {
    if (token.length > particle.length + 1 && token.endsWith(particle)) {
      return token.slice(0, -particle.length);
    }
  }

  return token;
};

const normalizeText = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const tokenize = (text: string): string[] => {
  const uniqueTokens = new Set<string>();

  for (const rawToken of normalizeText(text).split(/\s+/)) {
    const token = stripKoreanParticle(rawToken);
    if (!token || token.length < 2 || STOP_WORDS.has(token)) continue;
    uniqueTokens.add(token);
  }

  return [...uniqueTokens];
};

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

  const title = normalizeText(row.title);
  const searchableText = normalizeText(
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
  ) {}

  async retrieve(
    request: ResumeRagRetrieveRequest,
  ): Promise<RetrievedResumeChunk[]> {
    const tokens = tokenize(request.question);
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
