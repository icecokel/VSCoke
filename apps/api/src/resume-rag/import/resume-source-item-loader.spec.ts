import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createResumeImportManifest,
  loadResumeSourceItemsFromEntry,
} from './resume-source-item-loader';

describe('resume source item loader', () => {
  it('builds an explicit manifest without whole-workspace ingestion', () => {
    const manifest = createResumeImportManifest({
      repoRoot: '/repo',
      resumeWorkspaceRoot: '/resume',
    });

    expect(manifest.length).toBeGreaterThan(0);
    expect(manifest.every((entry) => entry.path.includes('*'))).toBe(false);
    expect(manifest).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'app_resume',
          vectorize: true,
          visibility: 'public',
        }),
        expect.objectContaining({
          path: '/resume/docs/base-resume-final-v61-2026-08-02.md',
          itemType: 'final_resume_section',
          vectorize: true,
          visibility: 'public',
        }),
        expect.objectContaining({
          path: '/resume/docs/career-experience-category-raw-data-v5-2026-08-02.md',
          itemType: 'raw_career_evidence',
          vectorize: true,
          visibility: 'public',
          metadata: { version: 'supporting', fidelity: 'raw-section' },
        }),
      ]),
    );
    const currentResume = manifest.find((entry) =>
      entry.path.endsWith('base-resume-final-v61-2026-08-02.md'),
    );
    expect(currentResume?.metadata.version).toBe('current');
    const supersededSources = manifest.filter((entry) =>
      [
        'base-resume-final-v35-2026-07-13.md',
        'public-resume-rag-source-v1-2026-07-13.md',
        'public-resume-rag-source-v2-2026-08-08.md',
      ].some((fileName) => entry.path.endsWith(fileName)),
    );
    expect(supersededSources).toHaveLength(3);
    expect(
      supersededSources.every(
        (entry) => entry.status === 'superseded' && entry.vectorize === false,
      ),
    ).toBe(true);
    expect(
      manifest.some((entry) =>
        entry.path.endsWith('base-resume-final-v22-r15-2026-07-01.md'),
      ),
    ).toBe(false);
  });

  it('splits markdown headings into source items with stable metadata', () => {
    const dir = mkdtempSync(join(tmpdir(), 'resume-rag-loader-'));
    const filePath = join(dir, 'source.md');
    writeFileSync(
      filePath,
      [
        '---',
        'title: Hidden',
        '---',
        '# Resume',
        'Intro',
        '## Project A',
        'A body',
        '## Project B',
        'B body',
      ].join('\n'),
    );

    const items = loadResumeSourceItemsFromEntry({
      id: 'test:source',
      path: filePath,
      parser: 'markdown',
      sourceType: 'resume_workspace',
      itemType: 'final_resume_section',
      title: 'Resume',
      status: 'active',
      visibility: 'private',
      vectorize: true,
      metadata: { version: 'current' },
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual(
      expect.objectContaining({
        sourceKey: 'test:source#project-a',
        title: 'Project A',
        vectorize: true,
        visibility: 'private',
      }),
    );
    expect(items[0]?.metadata).toEqual(
      expect.objectContaining({
        sectionPath: 'Project A',
        version: 'current',
      }),
    );
    expect(items[0].bodyText).not.toContain('title: Hidden');
  });

  it('keeps raw markdown section text unchanged', () => {
    const dir = mkdtempSync(join(tmpdir(), 'resume-rag-loader-'));
    const filePath = join(dir, 'raw-source.md');
    writeFileSync(
      filePath,
      ['# Raw', '## Experience', '원문 문장', '', '- 원문 bullet'].join('\n'),
    );

    const [item] = loadResumeSourceItemsFromEntry({
      id: 'test:raw-source',
      path: filePath,
      parser: 'markdown',
      sourceType: 'resume_workspace',
      itemType: 'raw_career_evidence',
      title: 'Raw source',
      status: 'active',
      visibility: 'public',
      vectorize: true,
      metadata: { fidelity: 'raw-section' },
    });

    expect(item.bodyText).toBe('원문 문장\n\n- 원문 bullet');
  });

  it('rejects source items containing direct contact data', () => {
    const dir = mkdtempSync(join(tmpdir(), 'resume-rag-loader-'));
    const filePath = join(dir, 'source.md');
    writeFileSync(filePath, '## Contact\nemail me at person@example.com');

    const items = loadResumeSourceItemsFromEntry({
      id: 'test:contact',
      path: filePath,
      parser: 'markdown',
      sourceType: 'resume_workspace',
      itemType: 'strategy_section',
      title: 'Contact',
      status: 'active',
      visibility: 'private',
      vectorize: true,
      metadata: {},
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        vectorize: false,
        status: 'rejected',
      }),
    );
    expect(items[0]?.metadata.rejectionReason).toContain('email');
  });
});
