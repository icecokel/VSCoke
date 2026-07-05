import dataSource from '../src/data-source';
import type { EmbeddingProvider } from '../src/resume-rag/ai/embedding-provider';
import { createEmbeddingProvider } from '../src/resume-rag/ai/resume-rag-ai-provider.factory';
import { ResumeSourceItem } from '../src/resume-rag/entities/resume-source-item.entity';
import { ResumeVectorChunk } from '../src/resume-rag/entities/resume-vector-chunk.entity';
import { ResumeSourceItemChunker } from '../src/resume-rag/indexing/resume-source-item-chunker';
import { ResumeVectorIndexerService } from '../src/resume-rag/indexing/resume-vector-indexer.service';
import { getResumeRagConfig } from '../src/resume-rag/resume-rag.config';

const main = async () => {
  const config = getResumeRagConfig();
  const embeddingProvider: EmbeddingProvider = createEmbeddingProvider(config);

  await dataSource.initialize();
  try {
    const indexer = new ResumeVectorIndexerService(
      dataSource.getRepository(ResumeSourceItem),
      dataSource.getRepository(ResumeVectorChunk),
      new ResumeSourceItemChunker(),
      embeddingProvider,
      config,
    );
    const summary = await indexer.indexAll();
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await dataSource.destroy();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
