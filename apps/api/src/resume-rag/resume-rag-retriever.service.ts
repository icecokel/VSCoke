import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RESUME_RAG_CONFIG, type ResumeRagConfig } from './resume-rag.config';
import { RESUME_RAG_KEYWORD_GROUPS } from './resume-rag-keyword-gate';

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

const SEARCH_TOKEN_EXPANSIONS_BY_KEYWORD_GROUP: Record<
  string,
  readonly string[]
> = {
  oprimed: [
    'oprimed',
    'optivis',
    '오프리메드',
    '오프리',
    '오프티비스',
    '의료',
    '임상',
  ],
  'healthcare-domain': [
    '의료',
    '임상',
    '환자',
    '질병',
    '약물',
    '검사',
    'healthcare',
    'clinical',
    'patient',
  ],
  frontend: [
    '프론트엔드',
    'frontend',
    'front end',
    'react',
    'next.js',
    'nextjs',
    'next',
    'typescript',
    '상태관리',
    'ui',
  ],
  delivery: [
    'ci/cd',
    'cicd',
    'ci',
    'cd',
    '배포',
    '검증',
    '빌드',
    '테스트',
    'playwright',
    'docker',
    'github actions',
    'github',
    'actions',
    'workflow',
    'workflows',
    'runner',
  ],
  'career-intent': [
    '이력',
    '경력',
    '커리어',
    '업무',
    '프로젝트',
    '경험',
    '강점',
    '성과',
    '기여',
    'resume',
    'career',
    'experience',
    'strength',
    'project',
    'impact',
  ],
};

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
    .replace(/([a-z0-9])(\p{Script=Hangul})/gu, '$1 $2')
    .replace(/(\p{Script=Hangul})([a-z0-9])/gu, '$1 $2')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const compactText = (text: string): string =>
  normalizeText(text).replaceAll(' ', '');

const addToken = (tokens: Set<string>, rawToken: string): void => {
  const token = stripKoreanParticle(rawToken);
  if (!token || token.length < 2 || STOP_WORDS.has(token)) return;
  tokens.add(token);
};

const addTokensFromText = (tokens: Set<string>, text: string): void => {
  for (const rawToken of normalizeText(text).split(/\s+/)) {
    addToken(tokens, rawToken);
  }
};

const keywordAliasMatches = (question: string, alias: string): boolean => {
  const normalizedQuestion = normalizeText(question);
  const normalizedAlias = normalizeText(alias);
  if (!normalizedAlias) return false;

  return (
    normalizedQuestion.includes(normalizedAlias) ||
    compactText(question).includes(compactText(alias))
  );
};

const tokenize = (text: string): string[] => {
  const uniqueTokens = new Set<string>();

  for (const rawToken of normalizeText(text).split(/\s+/)) {
    addToken(uniqueTokens, rawToken);
  }

  for (const group of RESUME_RAG_KEYWORD_GROUPS) {
    const matched = group.aliases.some((alias) =>
      keywordAliasMatches(text, alias),
    );
    if (!matched) continue;

    const expansions =
      SEARCH_TOKEN_EXPANSIONS_BY_KEYWORD_GROUP[group.id] ?? group.aliases;
    for (const expansion of expansions) {
      addTokensFromText(uniqueTokens, expansion);
    }
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
