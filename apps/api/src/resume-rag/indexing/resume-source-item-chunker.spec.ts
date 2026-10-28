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
  it('독립 사실은 작은 chunkSize에서도 근거와 표현 한계를 분리하지 않는다', () => {
    const bodyText =
      '주장: 렌더링 개선\n\n측정 조건: 제한된 테스트 환경\n\n표현 한계: 전체 트래픽 성능으로 일반화하지 않는다';
    expect(
      chunker
        .chunk(
          { sourceItemId: 'fact', bodyText, metadata: { factId: 'fact-id' } },
          { chunkSize: 12 },
        )
        .map((chunk) => chunk.content),
    ).toEqual([bodyText]);
    expect(() =>
      chunker.chunk({
        sourceItemId: 'fact',
        bodyText: 'x'.repeat(4001),
        metadata: { factId: 'fact-id' },
      }),
    ).toThrow('atomic context limit');
  });
});
