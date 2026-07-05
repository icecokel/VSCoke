import { ResumeSourceItemChunker } from './resume-source-item-chunker';

describe('ResumeSourceItemChunker', () => {
  const chunker = new ResumeSourceItemChunker();

  it('returns no chunks for empty text', () => {
    expect(
      chunker.chunk({
        sourceItemId: 'item-1',
        bodyText: '   ',
        metadata: {},
      }),
    ).toEqual([]);
  });

  it('normalizes whitespace and keeps chunk order stable', () => {
    const chunks = chunker.chunk(
      {
        sourceItemId: 'item-1',
        bodyText: 'First paragraph.\r\n\r\n\r\nSecond paragraph.',
        metadata: { sectionPath: 'A' },
      },
      { chunkSize: 18, chunkOverlap: 0 },
    );

    expect(chunks.map((chunk) => chunk.content)).toEqual([
      'First paragraph.',
      'Second paragraph.',
    ]);
    expect(chunks[0].citationMetadata).toEqual({ sectionPath: 'A' });
  });
});
