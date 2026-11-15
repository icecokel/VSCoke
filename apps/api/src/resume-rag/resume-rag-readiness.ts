import { chatDefinitions, type ChatChannel } from './chat-definition';
import { getResumeChunkConfigHash } from './indexing/resume-index-profile';
import { RESUME_CHUNKER_VERSION } from './indexing/resume-source-item-chunker';
import {
  type ResumeRagConfig,
  getChatChannelSourceTypes,
  requireEmbeddingModelConfig,
} from './resume-rag.config';
import {
  careerSourceCondition,
  legacyDetailCondition,
} from './resume-source-eligibility';

type Query = (sql: string, parameters: unknown[]) => Promise<unknown>;

export type ResumeRagVectorReadiness = {
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
  chunkerVersion: string;
  chunkConfigHash: string;
  chunks: number;
  indexedSourceItems: number;
};

export type ResumeRagChannelReadiness = {
  channel: ChatChannel;
  sourceTypes: string[];
  sourceItems: number;
  // 벡터를 검색하지 않는 설정이면 null이다.
  vectors: ResumeRagVectorReadiness | null;
};

// 검색기와 같은 판정이다. keyword 모드와 임베딩 공급자 없는 hybrid는 벡터를 쓰지 않는다.
export const usesResumeVectorRetrieval = (
  config: Pick<ResumeRagConfig, 'retrievalMode' | 'embeddingProvider'>,
): boolean => {
  const mode = config.retrievalMode ?? 'keyword';
  if (mode === 'keyword') return false;
  return mode === 'vector' || Boolean(config.embeddingProvider);
};

// 아래 조건은 검색기의 keyword/vector 후보 조건과 같아야 한다. 언어 조건만 제외해
// 채널 전체에서 검색 가능한 공개 원문과 현재 프로필 벡터가 있는지 센다.
const currentItemsSql = `
  SELECT DISTINCT ON ("sourceType", "sourceKey") *
  FROM resume_source_items
  WHERE "status" <> 'superseded' AND "sourceType" = ANY($2)
    AND ("sourceType" <> 'career_data' OR "isCurrent" = TRUE)
  ORDER BY "sourceType", "sourceKey", "updatedAt" DESC, "id" DESC`;

const eligibleSourceSql = (alias: string): string => `
  ${alias}.deleted_at IS NULL AND ${alias}."status" = 'active'
  AND ${alias}."itemType" = ANY($3)
  AND ${careerSourceCondition(alias)}
  AND ${legacyDetailCondition(alias)}
  AND ${alias}."vectorize" = TRUE
  AND ${alias}."visibility" = 'public' AND ${alias}."visibility" = ANY($1)`;

const toCount = (rows: unknown, column: string): number => {
  const row: unknown = Array.isArray(rows) ? rows[0] : undefined;
  const value: unknown =
    row && typeof row === 'object' ? Reflect.get(row, column) : undefined;
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error(`Unexpected Resume RAG readiness count: ${column}`);
  return count;
};

export const inspectResumeRagReadiness = async (
  query: Query,
  config: ResumeRagConfig,
): Promise<ResumeRagChannelReadiness[]> => {
  const isVectorRequired = usesResumeVectorRetrieval(config);
  const profile = isVectorRequired
    ? {
        ...requireEmbeddingModelConfig(config),
        chunkerVersion: RESUME_CHUNKER_VERSION,
        chunkConfigHash: getResumeChunkConfigHash(config),
      }
    : null;
  const channels = Object.keys(chatDefinitions) as ChatChannel[];

  return Promise.all(
    channels.map(async (channel): Promise<ResumeRagChannelReadiness> => {
      const sourceTypes = getChatChannelSourceTypes(config, channel);
      const scope = [
        config.allowedVisibilities,
        sourceTypes,
        chatDefinitions[channel].itemTypes,
      ];
      const sourceItems = toCount(
        await query(
          `SELECT count(*)::int AS "sourceItems"
          FROM (${currentItemsSql}) AS current_items
          WHERE ${eligibleSourceSql('current_items')}`,
          scope,
        ),
        'sourceItems',
      );
      if (!profile) return { channel, sourceTypes, sourceItems, vectors: null };

      const rows = await query(
        `WITH current_items AS MATERIALIZED (${currentItemsSql})
        SELECT count(*)::int AS "chunks",
          count(DISTINCT source.id)::int AS "indexedSourceItems"
        FROM resume_vector_chunks chunk
        INNER JOIN current_items source ON source.id = chunk."sourceItemId"
        WHERE ${eligibleSourceSql('source')}
          AND chunk.deleted_at IS NULL
          AND chunk.status = 'active' AND chunk.visibility = 'public'
          AND chunk."embeddingProvider" = $4 AND chunk."embeddingModel" = $5
          AND chunk."embeddingDimensions" = $6
          AND vector_dims(chunk.embedding) = $6
          AND chunk."chunkerVersion" = $7 AND chunk."chunkConfigHash" = $8`,
        [
          ...scope,
          profile.embeddingProvider,
          profile.embeddingModel,
          profile.embeddingDimensions,
          profile.chunkerVersion,
          profile.chunkConfigHash,
        ],
      );
      return {
        channel,
        sourceTypes,
        sourceItems,
        vectors: {
          ...profile,
          chunks: toCount(rows, 'chunks'),
          indexedSourceItems: toCount(rows, 'indexedSourceItems'),
        },
      };
    }),
  );
};

export const findResumeRagReadinessProblems = (
  report: ResumeRagChannelReadiness[],
): string[] =>
  report.flatMap(({ channel, sourceTypes, sourceItems, vectors }) => {
    const problems: string[] = [];
    if (sourceItems === 0) {
      problems.push(
        `${channel} 채널의 검색 가능한 공개 원문이 0건입니다 (sourceTypes=${sourceTypes.join(',') || '없음'}). ` +
          'resume:import 결과, career_data 공개 발행 상태와 RAG_ALLOWED_SOURCE_TYPES·RAG_ALLOWED_VISIBILITIES를 확인하세요.',
      );
    }
    if (vectors && vectors.chunks === 0) {
      problems.push(
        `${channel} 채널에 현재 임베딩 프로필(${vectors.embeddingProvider}/${vectors.embeddingModel}/${vectors.embeddingDimensions}, ` +
          `chunkConfigHash=${vectors.chunkConfigHash})의 벡터 청크가 0건입니다. ` +
          'resume:index 결과와 RAG_EMBEDDING_*·RAG_CHUNK_SIZE·RAG_CHUNK_OVERLAP가 색인 때와 같은지 확인하세요. ' +
          '벡터 복구 전까지는 검증된 RAG_RETRIEVAL_MODE=keyword로 전환할 수 있습니다.',
      );
    }
    return problems;
  });
