import { resolve } from 'node:path';
import {
  chatDefinitions,
  getChatNoEvidenceAnswer,
  getChatSimpleReply,
} from './chat-definition';
import {
  createResumeImportManifest,
  loadResumeSourceItemsFromEntry,
} from './import/resume-source-item-loader';
import { ResumeSourceItemChunker } from './indexing/resume-source-item-chunker';

describe('채팅 정의', () => {
  it('이전 파일 원문은 보존하지만 공통 DB 이력서 채팅 근거에서 제외한다', () => {
    const manifest = createResumeImportManifest({
      repoRoot: resolve(__dirname, '../../../..'),
    });
    const entry = manifest.find((item) => item.id === 'app:resume-experience');
    if (!entry) throw new Error('공개 경험 원본 없음');
    expect(entry.sourceType).toBe('app_resume');
    expect(entry.locale).toBeUndefined();
    expect(chatDefinitions.resume.itemTypes).not.toContain(entry.itemType);
    expect(chatDefinitions.main.itemTypes).not.toContain(entry.itemType);

    const items = loadResumeSourceItemsFromEntry(entry);
    expect(items.length).toBeGreaterThan(0);
    expect(new Set(items.map((item) => item.sourceKey)).size).toBe(
      items.length,
    );
    const chunker = new ResumeSourceItemChunker();
    for (const item of items) {
      expect(item.status).toBe('active');
      expect(item.vectorize).toBe(true);
      expect(item.bodyText).toContain('근거:');
      const chunks = chunker.chunk(
        { sourceItemId: item.sourceKey, ...item },
        { chunkSize: 600, chunkOverlap: 80 },
      );
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(item.bodyText);
    }
  });

  it.each(['ko-KR', 'en-US', 'ja-JP'])(
    '%s 인사·도움말·근거 부족 안내가 채팅별 주제를 따른다',
    (locale) => {
      for (const channel of ['main', 'resume'] as const) {
        const topic = chatDefinitions[channel].topics[locale];
        expect(getChatSimpleReply('Hello!', locale, channel)).toContain(topic);
        expect(getChatSimpleReply('help', locale, channel)).toContain(topic);
        expect(getChatNoEvidenceAnswer(locale, channel)).toContain(topic);
        expect(getChatSimpleReply('Thanks!', locale, channel)).toBeTruthy();
        expect(
          getChatSimpleReply('안녕, 프로젝트를 알려줘', locale, channel),
        ).toBeUndefined();
      }
      expect(getChatSimpleReply('Hello!', locale, 'main')).not.toEqual(
        getChatSimpleReply('Hello!', locale, 'resume'),
      );
    },
  );

  it('명시된 공개 원본마다 하나의 채팅 범위가 있고 사이트 자료를 실제로 읽는다', () => {
    const repoRoot = resolve(__dirname, '../../../..');
    const manifest = createResumeImportManifest({
      repoRoot,
      resumeWorkspaceRoot: '/resume',
    });
    for (const entry of manifest.filter(
      (item) =>
        item.visibility === 'public' &&
        item.vectorize &&
        item.status === 'active',
    )) {
      const channels = Object.values(chatDefinitions).filter(
        (definition) =>
          definition.sourceTypes.includes(entry.sourceType) &&
          definition.itemTypes.includes(entry.itemType),
      );
      expect(channels).toHaveLength(
        entry.itemType === 'public_resume_detail' ||
          entry.itemType === 'public_site_guide'
          ? 1
          : 0,
      );
    }
    const guide = manifest.find(
      (entry) => entry.itemType === 'public_site_guide',
    );
    expect(guide).toBeDefined();
    if (!guide) throw new Error('사이트 안내 원본 없음');
    const items = loadResumeSourceItemsFromEntry(guide);
    expect(items.length).toBeGreaterThan(0);
    expect(
      items.every((item) => item.status === 'active' && item.vectorize),
    ).toBe(true);
    expect(items.some((item) => item.bodyText.includes('/game/wordle'))).toBe(
      true,
    );
  });
});
