import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join, relative } from 'node:path';

export type ResumeSourceParser = 'json' | 'markdown' | 'mdx' | 'text' | 'tsv';

export type ResumeImportManifestEntry = {
  id: string;
  path: string;
  parser: ResumeSourceParser;
  sourceType: string;
  itemType: string;
  title: string;
  locale?: string;
  status: string;
  visibility: string;
  vectorize: boolean;
  metadata: Record<string, unknown>;
  jsonKeys?: string[];
};

export type ResumeSourceItemPayload = {
  sourceType: string;
  itemType: string;
  sourcePath: string;
  sourceKey: string;
  title: string;
  bodyText: string;
  locale: string | null;
  status: string;
  visibility: string;
  vectorize: boolean;
  contentHash: string;
  metadata: Record<string, unknown>;
};

type ManifestOptions = {
  repoRoot: string;
  resumeWorkspaceRoot?: string;
};

const APP_RESUME_DETAIL_FILES = [
  'commerce-backoffice-product.mdx',
  'freebooting-finder.mdx',
  'oprimed-medical-frontend-productization.mdx',
  'sellectors-admin.mdx',
  'sellectors-frontend.mdx',
  'shortime-frontend.mdx',
  'shortime-playground.mdx',
  'translate.mdx',
];

const RESUME_WORKSPACE_VECTOR_FILES = [
  'docs/base-resume-final-v30-2026-07-13.md',
  'docs/base-resume-ai-workflow-v1-2026-06-29.md',
  'docs/oprimed-public-resume-final.md',
  'docs/public-resume-rag-source-v1-2026-07-13.md',
  'docs/public-resume-page.md',
  'docs/resume-writing-concept-v7-2026-06-30.md',
  'docs/wanted-resume-map.json',
  'docs/raw/codex-agent-workflow-raw-data-2026-06-29.md',
  'docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-ai-workflow-confirmed-work.md',
  'docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/oprimed-cicd-confirmed-work.md',
  'docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/optivis-nexus-fe-all-branches-raw-work-units.md',
  'docs/raw/oprimed-fresh-work-units-all-branches-2026-06-23/portal-trial-all-branches-raw-work-units.md',
  'docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/selectors-all-branches-raw-work-units.md',
  'docs/raw/code-crayon-fresh-work-units-all-branches-2026-06-23/shortime-all-branches-raw-work-units.md',
];

const RESUME_WORKSPACE_STORE_ONLY_FILES = [
  'docs/raw/oprimed-commit-logs-2026-06-23/repo-summary.tsv',
  'docs/raw/oprimed-commit-logs-2026-06-23/commits-self-candidates-no-merges.tsv',
  'docs/raw/oprimed-commit-logs-2026-06-23/commits-self-candidates-with-merges.tsv',
];

const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'section';

const hashText = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const stripFrontmatter = (value: string): string =>
  value.startsWith('---') ? value.replace(/^---\n[\s\S]*?\n---\n?/, '') : value;

const hasDirectContactData = (
  value: string,
): { rejected: false } | { rejected: true; reason: string } => {
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) {
    return { rejected: true, reason: 'email detected' };
  }

  if (
    /\b(?:\+?\d{1,3}[-.\s]?)?(?:010|011|016|017|018|019)[-.\s]?\d{3,4}[-.\s]?\d{4}\b/.test(
      value,
    )
  ) {
    return { rejected: true, reason: 'phone detected' };
  }

  if (
    /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])|[^\s]*(?:notion\.so|docs\.google\.com))[^\s)]*/i.test(
      value,
    )
  ) {
    return { rejected: true, reason: 'private url detected' };
  }

  return { rejected: false };
};

const toSourcePath = (filePath: string): string => {
  const repoRelative = relative(process.cwd(), filePath);
  return repoRelative.startsWith('..') ? filePath : repoRelative;
};

const createPayload = (
  entry: ResumeImportManifestEntry,
  title: string,
  bodyText: string,
  sourceKey: string,
  metadata: Record<string, unknown>,
): ResumeSourceItemPayload => {
  const normalizedBody = bodyText.replace(/\r\n/g, '\n').trim();
  const directContact = hasDirectContactData(normalizedBody);
  const rejectedMetadata = directContact.rejected
    ? { ...metadata, rejectionReason: directContact.reason }
    : metadata;
  const safeBody = directContact.rejected ? '[REDACTED]' : normalizedBody;

  return {
    sourceType: entry.sourceType,
    itemType: entry.itemType,
    sourcePath: toSourcePath(entry.path),
    sourceKey,
    title,
    bodyText: safeBody,
    locale: entry.locale ?? null,
    status: directContact.rejected ? 'rejected' : entry.status,
    visibility: entry.visibility,
    vectorize: directContact.rejected ? false : entry.vectorize,
    contentHash: hashText(safeBody),
    metadata: rejectedMetadata,
  };
};

const splitMarkdownItems = (
  entry: ResumeImportManifestEntry,
  text: string,
): ResumeSourceItemPayload[] => {
  const body = stripFrontmatter(text).replace(/\r\n/g, '\n');
  const headings = [...body.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
    depth: match[1].length,
    title: match[2].trim(),
    index: match.index ?? 0,
    endOfHeading: (match.index ?? 0) + match[0].length,
  }));

  const selectedDepth =
    [2, 3, 1, 4, 5, 6].find((depth) =>
      headings.some((heading) => heading.depth === depth),
    ) ?? 0;
  const selected = headings.filter(
    (heading) => heading.depth === selectedDepth,
  );

  if (selected.length === 0) {
    return [
      createPayload(entry, entry.title, body, entry.id, {
        ...entry.metadata,
        sectionPath: entry.title,
      }),
    ];
  }

  const slugCounts = new Map<string, number>();
  return selected.map((heading, index) => {
    const next = selected[index + 1];
    const sectionBody = body
      .slice(heading.endOfHeading, next ? next.index : body.length)
      .trim();
    const baseSlug = slugify(heading.title);
    const count = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

    return createPayload(
      entry,
      heading.title,
      sectionBody,
      `${entry.id}#${slug}`,
      {
        ...entry.metadata,
        sectionPath: heading.title,
      },
    );
  });
};

const pickJsonItems = (
  entry: ResumeImportManifestEntry,
  text: string,
): ResumeSourceItemPayload[] => {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const keys = entry.jsonKeys?.length ? entry.jsonKeys : ['root'];

  return keys.map((key) => {
    const value = key === 'root' ? parsed : parsed[key];
    return createPayload(
      entry,
      key === 'root' ? entry.title : `${entry.title}: ${key}`,
      JSON.stringify(value ?? {}, null, 2),
      `${entry.id}#${slugify(key)}`,
      {
        ...entry.metadata,
        sectionPath: key,
      },
    );
  });
};

export const createResumeImportManifest = ({
  repoRoot,
  resumeWorkspaceRoot,
}: ManifestOptions): ResumeImportManifestEntry[] => {
  const appEntries: ResumeImportManifestEntry[] = [
    {
      id: 'app:resume-data',
      path: join(repoRoot, 'apps/web/src/constants/resume-data.json'),
      parser: 'json',
      sourceType: 'app_resume',
      itemType: 'current_resume_data',
      title: 'VSCoke resume data',
      status: 'active',
      visibility: 'public',
      vectorize: true,
      metadata: { version: 'current' },
    },
    ...['ko-KR', 'en-US', 'ja-JP'].map((locale) => ({
      id: `app:messages:${locale}`,
      path: join(repoRoot, `apps/web/messages/${locale}.json`),
      parser: 'json' as const,
      sourceType: 'app_resume',
      itemType: 'localized_resume_messages',
      title: `VSCoke messages ${locale}`,
      locale,
      status: 'active',
      visibility: 'public',
      vectorize: true,
      jsonKeys: ['profile', 'resume'],
      metadata: { version: 'current' },
    })),
    ...APP_RESUME_DETAIL_FILES.map((fileName) => ({
      id: `app:resume-detail:${fileName.replace(/\.mdx$/, '')}`,
      path: join(repoRoot, 'apps/web/resume-detail', fileName),
      parser: 'mdx' as const,
      sourceType: 'app_resume',
      itemType: 'public_resume_detail',
      title: basename(fileName, '.mdx'),
      status: 'active',
      visibility: 'public',
      vectorize: true,
      metadata: { version: 'current' },
    })),
  ];

  if (!resumeWorkspaceRoot) {
    return appEntries;
  }

  const vectorEntries = RESUME_WORKSPACE_VECTOR_FILES.map((fileName) => ({
    id: `resume-workspace:${fileName}`,
    path: join(resumeWorkspaceRoot, fileName),
    parser: fileName.endsWith('.json')
      ? ('json' as const)
      : ('markdown' as const),
    sourceType: 'resume_workspace',
    itemType: fileName.includes('public-resume-rag-source')
      ? 'public_rag_evidence'
      : fileName.includes('/raw/')
        ? 'raw_work_unit'
        : fileName.includes('wanted')
          ? 'wanted_mapping'
          : 'final_resume_section',
    title: basename(fileName),
    status: 'active',
    visibility:
      fileName.includes('public') || fileName.includes('base-resume-final-v30')
        ? 'public'
        : 'private',
    vectorize: true,
    metadata: {
      version: fileName.includes('base-resume-final-v30')
        ? 'current'
        : 'supporting',
    },
  }));

  const storeOnlyEntries = RESUME_WORKSPACE_STORE_ONLY_FILES.map(
    (fileName) => ({
      id: `resume-workspace:${fileName}`,
      path: join(resumeWorkspaceRoot, fileName),
      parser: fileName.endsWith('.tsv') ? ('tsv' as const) : ('text' as const),
      sourceType: 'resume_workspace',
      itemType: 'evidence_log',
      title: basename(fileName),
      status: 'active',
      visibility: 'private',
      vectorize: false,
      metadata: { evidenceOnly: true },
    }),
  );

  return [...appEntries, ...vectorEntries, ...storeOnlyEntries];
};

export const loadResumeSourceItemsFromEntry = (
  entry: ResumeImportManifestEntry,
): ResumeSourceItemPayload[] => {
  if (!existsSync(entry.path)) {
    throw new Error(`Resume import source not found: ${entry.path}`);
  }

  const text = readFileSync(entry.path, 'utf8');

  if (entry.parser === 'json') {
    return pickJsonItems(entry, text);
  }

  if (entry.parser === 'markdown' || entry.parser === 'mdx') {
    return splitMarkdownItems(entry, text);
  }

  return [
    createPayload(entry, entry.title, text, entry.id, {
      ...entry.metadata,
      sectionPath: entry.title,
    }),
  ];
};
