import { createHash } from 'node:crypto';
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
import {
  RESUME_RAG_CONFIG,
  type ResumeRagConfig,
  requireEmbeddingModelConfig,
} from '../resume-rag.config';

type IndexSummary = {
  indexed: number;
  skipped: number;
};

const hashConfig = (
  config: Pick<ResumeRagConfig, 'chunkSize' | 'chunkOverlap'>,
) => createHash('sha256').update(JSON.stringify(config)).digest('hex');

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
    const chunkConfigHash = hashConfig(this.config);
    const sourceItems = await this.sourceItemRepository.find({
      where: {
        vectorize: true,
        status: In(['active']),
      },
      order: { updatedAt: 'ASC' },
    });
    const summary: IndexSummary = { indexed: 0, skipped: 0 };

    for (const sourceItem of sourceItems) {
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

      if (chunks.length === 0) {
        summary.skipped += 1;
        continue;
      }

      for (const chunk of chunks) {
        const embedding = await this.embeddingProvider.embed(chunk.content);
        assertEmbeddingResultMatches(embedding, {
          provider: embeddingConfig.embeddingProvider,
          model: embeddingConfig.embeddingModel,
          dimensions: embeddingConfig.embeddingDimensions,
        });
        await this.vectorChunkRepository.upsert(
          {
            sourceItemId: sourceItem.id,
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
            citationMetadata: chunk.citationMetadata as never,
            embeddingProvider: embeddingConfig.embeddingProvider,
            embeddingModel: embeddingConfig.embeddingModel,
            embeddingDimensions: embeddingConfig.embeddingDimensions,
            embedding: embedding.vector,
            chunkerVersion: RESUME_CHUNKER_VERSION,
            chunkConfigHash,
            indexedAt: new Date(),
          },
          [
            'sourceItemId',
            'chunkIndex',
            'embeddingProvider',
            'embeddingModel',
            'embeddingDimensions',
            'chunkerVersion',
            'chunkConfigHash',
          ],
        );
        summary.indexed += 1;
      }

      await this.vectorChunkRepository
        .createQueryBuilder()
        .delete()
        .from(ResumeVectorChunk)
        .where('"sourceItemId" = :sourceItemId', {
          sourceItemId: sourceItem.id,
        })
        .andWhere('"embeddingProvider" = :embeddingProvider', {
          embeddingProvider: embeddingConfig.embeddingProvider,
        })
        .andWhere('"embeddingModel" = :embeddingModel', {
          embeddingModel: embeddingConfig.embeddingModel,
        })
        .andWhere('"embeddingDimensions" = :embeddingDimensions', {
          embeddingDimensions: embeddingConfig.embeddingDimensions,
        })
        .andWhere('"chunkerVersion" = :chunkerVersion', {
          chunkerVersion: RESUME_CHUNKER_VERSION,
        })
        .andWhere('"chunkConfigHash" = :chunkConfigHash', { chunkConfigHash })
        .andWhere('"chunkIndex" >= :chunkCount', { chunkCount: chunks.length })
        .execute();
    }

    return summary;
  }
}
