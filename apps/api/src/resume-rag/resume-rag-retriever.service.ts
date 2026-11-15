import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  assertPublicResume,
  careerSourceCondition,
  legacyDetailCondition,
} from './resume-source-eligibility';
import type { EmbeddingProvider } from './ai/embedding-provider';
import {
  RESUME_RAG_EMBEDDING_PROVIDER,
  assertEmbeddingResultMatches,
} from './ai/embedding-provider';
import {
  RESUME_RAG_RETRIEVED_CHUNK_MAX_CHARS,
  requireEmbeddingModelConfig,
} from './resume-rag.config';
import { getResumeChunkConfigHash } from './indexing/resume-index-profile';
import {
  RESUME_CHUNKER_VERSION,
  ResumeSourceItemChunker,
} from './indexing/resume-source-item-chunker';
import { DataSource } from 'typeorm';
import { RESUME_RAG_CONFIG, type ResumeRagConfig } from './resume-rag.config';
import { ResumeRagKeywordService } from './resume-rag-keyword.service';
import {
  createResumeRagQueryTokens,
  normalizeResumeRagSearchText,
} from './resume-rag-keyword-gate';
import { chatDefinitions, type ChatChannel } from './chat-definition';

export type ResumeRagRetrieveRequest = {
  channel: ChatChannel;
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

// 영문·숫자 토큰은 단어 앞부분부터 일치해야 한다. `you`가 `layout`에, `art`가 `start`에
// 걸리는 부분 문자열 잡음을 막는다. 한글·일본어는 조사·복합어 때문에 부분 일치를 유지한다.
const isAsciiToken = (token: string): boolean => /^[a-z0-9]+$/.test(token);

const matchesSearchToken = (paddedText: string, token: string): boolean =>
  paddedText.includes(isAsciiToken(token) ? ` ${token}` : token);

const scoreRow = (
  row: ResumeSourceItemRow,
  tokens: string[],
  queryTokens: string[],
): number => {
  if (tokens.length === 0) return 0;

  const title = ` ${normalizeResumeRagSearchText(row.title)}`;
  const searchableText = ` ${normalizeResumeRagSearchText(
    `${row.title} ${row.bodyText} ${row.sourceKey}`,
  )}`;
  const matchedTokens = tokens.filter((token) =>
    matchesSearchToken(searchableText, token),
  );
  const titleMatches = matchedTokens.filter((token) =>
    matchesSearchToken(title, token),
  ).length;
  const directMatches = queryTokens.filter((token) =>
    matchesSearchToken(searchableText, token),
  );
  const directScore =
    queryTokens.length > 0 ? directMatches.length / queryTokens.length : 0;
  const baseScore = Math.max(directScore, matchedTokens.length / tokens.length);
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

// 벡터 검색은 절대 점수 기준 없이 코사인 순위 상위 후보만 고른다. 로컬 E5 점수는 0.75~0.90에
// 몰려 있어 교차 언어 정답과 무관한 질문을 한 기준값으로 가를 수 없다. 후보는 RRF 결합과
// 원문별 상한을 거친 뒤 topK개로 줄어든다.
const RESUME_VECTOR_CANDIDATE_MULTIPLIER = 3;

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

  async assertSelection(request: {
    locale: string;
    resumeKey?: string;
  }): Promise<void> {
    await assertPublicResume(
      (sql, parameters) => this.dataSource.query(sql, parameters),
      request.resumeKey ?? 'pe',
      request.locale,
    );
  }

  // career_data 원문(불렛·사실·상세)은 번역본 없이 한 언어로만 발행하는 원본이므로 요청 언어로 거르지 않는다.
  // 언어별 사본이 있는 app_resume 자료만 요청 언어로 거르고, 답변 언어는 생성 프롬프트가 맞춘다.
  // 검색은 질문을 거르지 않고 순위만 매긴다. 답할 수 있는지는 답변 모델이 판단한다.
  async retrieve(
    request: ResumeRagRetrieveRequest,
  ): Promise<RetrievedResumeChunk[]> {
    const queryTokens = createResumeRagQueryTokens(request.question);
    // 별칭 관문은 검색 여부를 정하지 않는다. 일치한 별칭 묶음의 확장어만 키워드 점수에 더한다.
    const aliasTokens = await this.keywordService.createSearchTokens(
      request.question,
    );
    const tokens = [...new Set([...queryTokens, ...aliasTokens])];

    const mode = this.config.retrievalMode ?? 'keyword';
    if (mode === 'keyword')
      return this.retrieveKeywords(request, tokens, queryTokens);
    if (mode === 'vector')
      return (await this.retrieveVectors(request)).slice(0, this.config.topK);

    const [keywords, vectors] = await Promise.all([
      this.retrieveKeywords(request, tokens, queryTokens),
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
    tokens: string[],
    queryTokens: string[],
  ): Promise<RetrievedResumeChunk[]> {
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
            AND ("sourceType" <> 'career_data' OR "isCurrent" = TRUE)
          ORDER BY "sourceType", "sourceKey", "updatedAt" DESC, "id" DESC
        ) AS current_items
        WHERE deleted_at IS NULL AND "status" = 'active'
          AND "itemType" = ANY($4)
          AND ${careerSourceCondition('current_items')}
          AND ${legacyDetailCondition('current_items')}
          AND "vectorize" = TRUE
          AND "visibility" = 'public'
          AND "visibility" = ANY($1)
          AND (
            "sourceType" = 'career_data'
            OR $2::varchar IS NULL
            OR "locale" IS NULL OR "locale" = $2
            OR split_part("locale", '-', 1) = split_part($2, '-', 1)
          )
        ORDER BY "updatedAt" DESC
      `,
      [
        this.config.allowedVisibilities,
        request.locale || null,
        this.allowedSourceTypes(request.channel),
        chatDefinitions[request.channel].itemTypes,
      ],
    );

    if (!Array.isArray(rows)) return [];

    return rows
      .map(toSourceItemRow)
      .filter((row): row is ResumeSourceItemRow => row !== null)
      .flatMap((row) => {
        const chunkSize = Math.min(
          this.config.chunkSize,
          RESUME_RAG_RETRIEVED_CHUNK_MAX_CHARS,
        );
        const chunks = new ResumeSourceItemChunker().chunk(
          {
            sourceItemId: row.id,
            bodyText: row.bodyText,
            metadata: row.metadata,
          },
          {
            chunkSize,
            chunkOverlap: Math.min(this.config.chunkOverlap, chunkSize - 1),
          },
        );
        return chunks.map((chunk, index) => ({
          ...row,
          id: chunks.length === 1 ? row.id : `${row.id}:${index}`,
          bodyText: chunk.content,
          metadata: chunk.citationMetadata,
        }));
      })
      .map(
        (row): ScoredResumeSourceItem => ({
          ...row,
          score: scoreRow(row, tokens, queryTokens),
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
            AND ("sourceType" <> 'career_data' OR "isCurrent" = TRUE)
        ORDER BY "sourceType", "sourceKey", "updatedAt" DESC, "id" DESC
      ), eligible AS MATERIALIZED (
        SELECT chunk.*, source.title AS "sourceTitle", source.metadata AS "sourceMetadata"
        FROM resume_vector_chunks chunk
        INNER JOIN current_items source ON source.id = chunk."sourceItemId"
        WHERE source.deleted_at IS NULL AND chunk.deleted_at IS NULL
          AND source.status = 'active' AND source.vectorize = TRUE
          AND source."itemType" = ANY($11)
          AND ${careerSourceCondition('source')}
          AND ${legacyDetailCondition('source')}
          AND source.visibility = 'public' AND source.visibility = ANY($1)
          AND chunk.status = 'active' AND chunk.visibility = 'public'
          AND (source."sourceType" = 'career_data' OR $3::varchar IS NULL
            OR source.locale IS NULL OR source.locale = $3
            OR split_part(source.locale, '-', 1) = split_part($3, '-', 1))
          AND chunk."embeddingProvider" = $4 AND chunk."embeddingModel" = $5
          AND chunk."embeddingDimensions" = $6 AND vector_dims(chunk.embedding) = $6
          AND chunk."chunkerVersion" = $7 AND chunk."chunkConfigHash" = $8
      )
      SELECT id, content, "sourceTitle" AS title, "sourcePath", "sourceKey",
        "sourceMetadata" AS "citationMetadata", 1 - (embedding <=> $9::vector) AS similarity
      FROM eligible
      ORDER BY embedding <=> $9::vector, id
      LIMIT $10`,
      [
        this.config.allowedVisibilities,
        this.allowedSourceTypes(request.channel),
        request.locale || null,
        profile.embeddingProvider,
        profile.embeddingModel,
        profile.embeddingDimensions,
        RESUME_CHUNKER_VERSION,
        getResumeChunkConfigHash(this.config),
        JSON.stringify(embedding.vector),
        this.config.topK * RESUME_VECTOR_CANDIDATE_MULTIPLIER,
        chatDefinitions[request.channel].itemTypes,
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

  private allowedSourceTypes(channel: ChatChannel): string[] {
    return this.config.allowedSourceTypes.filter((sourceType) =>
      chatDefinitions[channel].sourceTypes.includes(sourceType),
    );
  }
}

// 한 원문이 결과를 독점하지 않게 하되, 긴 원문의 여러 관련 청크는 함께 전달한다.
const RESUME_MERGE_MAX_CHUNKS_PER_SOURCE = 3;

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
      // 키워드 청크와 벡터 청크는 ID 체계가 달라 원문 key와 본문으로 같은 청크를 식별한다.
      const chunkKey = `${chunk.sourceKey}\n${chunk.content}`;
      if (seen.has(chunkKey)) return;
      seen.add(chunkKey);
      const existing = scores.get(chunkKey);
      scores.set(chunkKey, {
        chunk: existing?.chunk ?? chunk,
        rank: (existing?.rank ?? 0) + 1 / (60 + index + 1),
      });
    });
  }
  const perSource = new Map<string, number>();
  return [...scores.values()]
    .sort((a, b) => b.rank - a.rank)
    .filter(({ chunk }) => {
      const count = perSource.get(chunk.sourceKey) ?? 0;
      if (count >= RESUME_MERGE_MAX_CHUNKS_PER_SOURCE) return false;
      perSource.set(chunk.sourceKey, count + 1);
      return true;
    })
    .slice(0, topK)
    .map(({ chunk }) => chunk);
};
