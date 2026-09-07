import { createHash } from 'node:crypto';
import type { ResumeRagConfig } from '../resume-rag.config';

export const getResumeChunkConfigHash = (
  config: Pick<ResumeRagConfig, 'chunkSize' | 'chunkOverlap'>,
): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
      }),
    )
    .digest('hex');
