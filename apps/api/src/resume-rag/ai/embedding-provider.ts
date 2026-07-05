export type EmbeddingResult = {
  provider: string;
  model: string;
  dimensions: number;
  vector: number[];
};

export type EmbeddingProvider = {
  embed(input: string): Promise<EmbeddingResult>;
};

export const RESUME_RAG_EMBEDDING_PROVIDER = 'RESUME_RAG_EMBEDDING_PROVIDER';

export const assertEmbeddingResultMatches = (
  result: EmbeddingResult,
  expected: {
    provider: string;
    model: string;
    dimensions: number;
  },
): void => {
  if (
    result.provider !== expected.provider ||
    result.model !== expected.model ||
    result.dimensions !== expected.dimensions
  ) {
    throw new Error('Embedding provider returned a different profile');
  }

  if (result.vector.length !== expected.dimensions) {
    throw new Error(
      `Embedding dimensions mismatch: expected ${expected.dimensions}, got ${result.vector.length}`,
    );
  }
};
