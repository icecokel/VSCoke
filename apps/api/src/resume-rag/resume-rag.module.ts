import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  RESUME_RAG_CHAT_PROVIDER,
  type ChatProvider,
} from './ai/chat-provider';
import {
  RESUME_RAG_EMBEDDING_PROVIDER,
  type EmbeddingProvider,
} from './ai/embedding-provider';
import {
  createChatProvider,
  createEmbeddingProvider,
} from './ai/resume-rag-ai-provider.factory';
import { ResumeImportBatch } from './entities/resume-import-batch.entity';
import { ResumeSourceItem } from './entities/resume-source-item.entity';
import { ResumeVectorChunk } from './entities/resume-vector-chunk.entity';
import { ResumeSourceItemImportService } from './import/resume-source-item-import.service';
import { ResumeSourceItemChunker } from './indexing/resume-source-item-chunker';
import { ResumeVectorIndexerService } from './indexing/resume-vector-indexer.service';
import {
  RESUME_RAG_CONFIG,
  type ResumeRagConfig,
  getResumeRagConfig,
} from './resume-rag.config';
import { ResumeRagController } from './resume-rag.controller';
import { ResumeRagOriginGuard } from './resume-rag-origin.guard';
import { ResumeRagRetrieverService } from './resume-rag-retriever.service';
import { ResumeRagService } from './resume-rag.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResumeImportBatch,
      ResumeSourceItem,
      ResumeVectorChunk,
    ]),
  ],
  controllers: [ResumeRagController],
  providers: [
    ResumeRagOriginGuard,
    ResumeSourceItemImportService,
    ResumeSourceItemChunker,
    ResumeVectorIndexerService,
    ResumeRagRetrieverService,
    ResumeRagService,
    {
      provide: RESUME_RAG_CONFIG,
      useFactory: (): ResumeRagConfig => getResumeRagConfig(),
    },
    {
      provide: RESUME_RAG_EMBEDDING_PROVIDER,
      useFactory: (config: ResumeRagConfig): EmbeddingProvider =>
        createEmbeddingProvider(config),
      inject: [RESUME_RAG_CONFIG],
    },
    {
      provide: RESUME_RAG_CHAT_PROVIDER,
      useFactory: (config: ResumeRagConfig): ChatProvider =>
        createChatProvider(config),
      inject: [RESUME_RAG_CONFIG],
    },
  ],
  exports: [ResumeSourceItemImportService, ResumeVectorIndexerService],
})
export class ResumeRagModule {}
