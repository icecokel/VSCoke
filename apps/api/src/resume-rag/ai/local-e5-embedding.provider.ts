import { join } from 'node:path';
import type { ResumeRagConfig } from '../resume-rag.config';
import { requireEmbeddingModelConfig } from '../resume-rag.config';
import {
  assertEmbeddingResultMatches,
  type EmbeddingInputType,
  type EmbeddingProvider,
  type EmbeddingResult,
} from './embedding-provider';

type LocalExtractorOptions = {
  model: string;
  revision: string;
  cacheDirectory: string;
  localFilesOnly: boolean;
};
type LocalExtractor = (input: string) => Promise<number[]>;
type LocalExtractorFactory = (
  options: LocalExtractorOptions,
) => Promise<LocalExtractor>;

const createLocalExtractor: LocalExtractorFactory = async (options) => {
  const { pipeline } = await import('@huggingface/transformers');
  const extractor = await pipeline('feature-extraction', options.model, {
    revision: options.revision,
    dtype: 'q8',
    device: 'cpu',
    cache_dir: options.cacheDirectory,
    local_files_only: options.localFilesOnly,
    session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
  });
  return async (input) => {
    const output = await extractor(input, {
      pooling: 'mean',
      normalize: true,
    });
    const data: unknown = output.data;
    if (!(data instanceof Float32Array)) {
      throw new Error('Local E5 model returned an invalid tensor');
    }
    return Array.from(data);
  };
};

// 모델 revision, q8 정밀도, E5 접두사를 고정해 서로 다른 임베딩 공간의 혼합을 막는다.
export class LocalE5EmbeddingProvider implements EmbeddingProvider {
  private extractor?: Promise<LocalExtractor>;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly config: ResumeRagConfig,
    private readonly factory: LocalExtractorFactory = createLocalExtractor,
  ) {}

  embed(
    input: string,
    inputType: EmbeddingInputType = 'query',
  ): Promise<EmbeddingResult> {
    const operation = this.queue.then(() => this.embedOne(input, inputType));
    // 작은 운영 호스트에서 여러 요청이 동시에 CPU/메모리를 점유하지 않도록 직렬화한다.
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private async embedOne(
    input: string,
    inputType: EmbeddingInputType,
  ): Promise<EmbeddingResult> {
    if (!input.trim()) throw new Error('Embedding input must not be empty');
    const profile = requireEmbeddingModelConfig(this.config);
    const match = /^([\w.-]+\/[\w.-]+)@([a-f0-9]{40})$/.exec(
      profile.embeddingModel,
    );
    if (!match) {
      throw new Error(
        'Local E5 model requires repository@40-character-revision',
      );
    }
    this.extractor ??= this.factory({
      model: match[1],
      revision: match[2],
      cacheDirectory:
        this.config.localEmbeddingCacheDir ??
        join(process.cwd(), '.cache', 'resume-embeddings'),
      localFilesOnly: this.config.localEmbeddingLocalFilesOnly ?? false,
    }).catch((error: unknown) => {
      this.extractor = undefined;
      throw error;
    });
    const extractor = await this.extractor;
    const vector = await extractor(`${inputType}: ${input}`);
    const result: EmbeddingResult = {
      provider: profile.embeddingProvider,
      model: profile.embeddingModel,
      dimensions: profile.embeddingDimensions,
      vector,
    };
    assertEmbeddingResultMatches(result, {
      provider: profile.embeddingProvider,
      model: profile.embeddingModel,
      dimensions: profile.embeddingDimensions,
    });
    return result;
  }
}
