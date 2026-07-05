import { createHash } from 'node:crypto';

export type ResumeChunkerOptions = {
  chunkSize: number;
  chunkOverlap: number;
};

export type ResumeSourceItemChunkInput = {
  sourceItemId: string;
  bodyText: string;
  metadata: Record<string, unknown>;
};

export type ResumeSourceItemChunk = {
  chunkIndex: number;
  content: string;
  contentHash: string;
  citationMetadata: Record<string, unknown>;
};

export const RESUME_CHUNKER_VERSION = 'resume-source-item-chunker-v1';

const DEFAULT_OPTIONS: ResumeChunkerOptions = {
  chunkSize: 1200,
  chunkOverlap: 120,
};

const hashText = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const normalizeText = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const splitOversizedParagraph = (
  paragraph: string,
  chunkSize: number,
  chunkOverlap: number,
): string[] => {
  const chunks: string[] = [];
  let start = 0;
  while (start < paragraph.length) {
    const end = Math.min(start + chunkSize, paragraph.length);
    chunks.push(paragraph.slice(start, end).trim());
    if (end === paragraph.length) break;
    start = Math.max(end - chunkOverlap, start + 1);
  }
  return chunks.filter(Boolean);
};

export class ResumeSourceItemChunker {
  chunk(
    input: ResumeSourceItemChunkInput,
    options: Partial<ResumeChunkerOptions> = {},
  ): ResumeSourceItemChunk[] {
    const chunkSize = options.chunkSize ?? DEFAULT_OPTIONS.chunkSize;
    const chunkOverlap = options.chunkOverlap ?? DEFAULT_OPTIONS.chunkOverlap;
    const text = normalizeText(input.bodyText);
    if (!text) return [];

    const paragraphs = text.split(/\n{2,}/).filter(Boolean);
    const chunks: string[] = [];
    let current = '';

    for (const paragraph of paragraphs) {
      if (paragraph.length > chunkSize) {
        if (current) {
          chunks.push(current);
          current = '';
        }
        chunks.push(
          ...splitOversizedParagraph(paragraph, chunkSize, chunkOverlap),
        );
        continue;
      }

      const next = current ? `${current}\n\n${paragraph}` : paragraph;
      if (next.length > chunkSize && current) {
        chunks.push(current);
        current = paragraph;
      } else {
        current = next;
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks.map((content, chunkIndex) => ({
      chunkIndex,
      content,
      contentHash: hashText(content),
      citationMetadata: { ...input.metadata },
    }));
  }
}
