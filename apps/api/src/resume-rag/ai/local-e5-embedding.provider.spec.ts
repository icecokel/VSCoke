import { LocalE5EmbeddingProvider } from './local-e5-embedding.provider';
import { getResumeRagConfig } from '../resume-rag.config';
import { createEmbeddingProvider } from './resume-rag-ai-provider.factory';

const config = getResumeRagConfig({
  RAG_EMBEDDING_PROVIDER: 'local-e5-q8',
  RAG_EMBEDDING_MODEL: `Xenova/multilingual-e5-small@${'a'.repeat(40)}`,
  RAG_EMBEDDING_DIMENSIONS: '2',
  RAG_LOCAL_EMBEDDING_CACHE_DIR: '/model-cache',
  RAG_LOCAL_EMBEDDING_LOCAL_FILES_ONLY: 'true',
});

describe('LocalE5EmbeddingProvider', () => {
  it('같은 모델을 재사용하고 질문과 원문에 다른 E5 접두사를 사용한다', async () => {
    const extractor = jest.fn().mockResolvedValue([1, 0]);
    const factory = jest.fn().mockResolvedValue(extractor);
    const provider = new LocalE5EmbeddingProvider(config, factory);
    await expect(provider.embed('역할은?')).resolves.toMatchObject({
      provider: 'local-e5-q8',
      dimensions: 2,
      vector: [1, 0],
    });
    await provider.embed('프로젝트 역할 근거', 'passage');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith({
      model: 'Xenova/multilingual-e5-small',
      revision: 'a'.repeat(40),
      cacheDirectory: '/model-cache',
      localFilesOnly: true,
    });
    expect(extractor.mock.calls).toEqual([
      ['query: 역할은?'],
      ['passage: 프로젝트 역할 근거'],
    ]);
    expect(createEmbeddingProvider(config)).toBeInstanceOf(
      LocalE5EmbeddingProvider,
    );
  });

  it('로딩 실패 후 재시도하며 잘못된 벡터를 반환하지 않는다', async () => {
    const factory = jest
      .fn()
      .mockRejectedValueOnce(new Error('not cached'))
      .mockResolvedValue(jest.fn().mockResolvedValue([1, 0]));
    const provider = new LocalE5EmbeddingProvider(config, factory);
    await expect(provider.embed('질문')).rejects.toThrow('not cached');
    await expect(provider.embed('질문')).resolves.toMatchObject({
      vector: [1, 0],
    });
    const invalid = new LocalE5EmbeddingProvider(
      config,
      jest.fn().mockResolvedValue(jest.fn().mockResolvedValue([0, 0])),
    );
    await expect(invalid.embed('질문')).rejects.toThrow('zero vector');
  });

  it('가변 모델 revision과 빈 입력을 거부한다', async () => {
    const factory = jest.fn();
    const provider = new LocalE5EmbeddingProvider(
      { ...config, embeddingModel: 'Xenova/model' },
      factory,
    );
    await expect(provider.embed('질문')).rejects.toThrow('revision');
    await expect(provider.embed(' ')).rejects.toThrow('empty');
    expect(factory).not.toHaveBeenCalled();
  });
});
