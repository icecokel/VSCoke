import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { EmbeddingProvider } from '../ai/embedding-provider';
import {
  RESUME_RAG_EMBEDDING_PROVIDER,
  assertEmbeddingResultMatches,
} from '../ai/embedding-provider';
import { ResumeSourceItem } from '../entities/resume-source-item.entity';
import { ResumeVectorChunk } from '../entities/resume-vector-chunk.entity';
import {
  RESUME_CHUNKER_VERSION,
  ResumeSourceItemChunker,
} from './resume-source-item-chunker';
import { getResumeChunkConfigHash } from './resume-index-profile';
import {
  RESUME_RAG_CONFIG,
  type ResumeRagConfig,
  requireEmbeddingModelConfig,
} from '../resume-rag.config';

type IndexSummary = {
  indexed: number;
  skipped: number;
  published: number;
  sources: number;
};

@Injectable()
export class ResumeVectorIndexerService {
  constructor(
    @InjectRepository(ResumeSourceItem)
    private readonly sourceItemRepository: Repository<ResumeSourceItem>,
    @InjectRepository(ResumeVectorChunk)
    private readonly vectorChunkRepository: Repository<ResumeVectorChunk>,
    private readonly chunker: ResumeSourceItemChunker,
    @Inject(RESUME_RAG_EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
    @Inject(RESUME_RAG_CONFIG)
    private readonly config: ResumeRagConfig,
  ) {}

  async indexAll(): Promise<IndexSummary> {
    const embeddingConfig = requireEmbeddingModelConfig(this.config);
    const profile = {
      ...embeddingConfig,
      chunkerVersion: RESUME_CHUNKER_VERSION,
      chunkConfigHash: getResumeChunkConfigHash(this.config),
    };
    const expected = {
      provider: profile.embeddingProvider,
      model: profile.embeddingModel,
      dimensions: profile.embeddingDimensions,
    };
    // 검색 필터뿐 아니라 외부 임베딩으로 전송하는 입력도 공개 자료로 제한한다.
    const sourceItems = await this.sourceItemRepository.find({
      where: {
        vectorize: true,
        status: 'active',
        visibility: 'public',
        sourceType: In(this.config.allowedSourceTypes),
      },
      order: { updatedAt: 'ASC' },
    });
    const summary: IndexSummary = {
      indexed: 0,
      skipped: 0,
      published: 0,
      sources: 0,
    };

    await this.vectorChunkRepository.query(
      `DELETE FROM resume_vector_chunks chunk
      WHERE NOT EXISTS (
        SELECT 1 FROM resume_source_items source
        WHERE source.id = chunk."sourceItemId" AND source.status = 'active'
          AND source.visibility = 'public' AND source.vectorize = TRUE
          AND source."sourceType" = ANY($1)
      )`,
      [this.config.allowedSourceTypes],
    );

    for (const sourceItem of sourceItems) {
      const where = { sourceItemId: sourceItem.id, ...profile };
      const previous = await this.vectorChunkRepository.find({ where });
      const byIndex = new Map(
        previous.map((chunk) => [chunk.chunkIndex, chunk]),
      );
      const chunks = this.chunker.chunk(
        {
          sourceItemId: sourceItem.id,
          bodyText: sourceItem.bodyText,
          metadata: sourceItem.metadata,
        },
        {
          chunkSize: this.config.chunkSize,
          chunkOverlap: this.config.chunkOverlap,
        },
      );
      const prepared: ResumeVectorChunk[] = [];

      for (const chunk of chunks) {
        const existing = byIndex.get(chunk.chunkIndex);
        let vector: number[];
        if (existing?.contentHash === chunk.contentHash) {
          vector = existing.embedding;
          assertEmbeddingResultMatches({ ...expected, vector }, expected);
          summary.skipped += 1;
        } else {
          const embedding = await this.embeddingProvider.embed(
            chunk.content,
            'passage',
          );
          assertEmbeddingResultMatches(embedding, expected);
          vector = embedding.vector;
          summary.indexed += 1;
        }
        const entity = new ResumeVectorChunk();
        Object.assign(entity, {
          ...where,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          contentHash: chunk.contentHash,
          sourceType: sourceItem.sourceType,
          itemType: sourceItem.itemType,
          title: sourceItem.title,
          locale: sourceItem.locale,
          sourcePath: sourceItem.sourcePath,
          sourceKey: sourceItem.sourceKey,
          visibility: sourceItem.visibility,
          status: sourceItem.status,
          citationMetadata: chunk.citationMetadata,
          embedding: vector,
          indexedAt: new Date(),
        });
        prepared.push(entity);
      }

      // API 호출 동안 DB 잠금을 유지하지 않고, 전 청크 준비가 끝난 뒤 원자적으로 교체한다.
      const wasPublished = await this.vectorChunkRepository.manager.transaction(
        async (manager) => {
          const current = await manager
            .getRepository(ResumeSourceItem)
            .findOne({
              where: { id: sourceItem.id },
              lock: { mode: 'pessimistic_read' },
            });
          if (
            !current ||
            current.status !== 'active' ||
            current.visibility !== 'public' ||
            !current.vectorize ||
            !this.config.allowedSourceTypes.includes(current.sourceType) ||
            current.contentHash !== sourceItem.contentHash
          )
            return false;
          const repository = manager.getRepository(ResumeVectorChunk);
          await repository.delete(where);
          if (prepared.length > 0) await repository.save(prepared);
          return true;
        },
      );
      if (wasPublished && prepared.length > 0) {
        summary.published += prepared.length;
        summary.sources += 1;
      }
    }
    return summary;
  }
}
