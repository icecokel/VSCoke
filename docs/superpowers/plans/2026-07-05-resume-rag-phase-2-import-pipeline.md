# Resume RAG Phase 2: Import Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import allowlisted resume evidence and current resume content into DB source items.

**Architecture:** The importer is the only component that reads file-based resume sources. It converts allowlisted files from the app and resume workspace into `resume_source_items`, records an import batch, sanitizes sensitive fields, and marks each item as vectorizable or store-only. After import, DB source rows are the source for indexing.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL, Node filesystem APIs, Jest.

---

## Scope

- Read allowlisted source files from `apps/web` and `/Users/smlee/Documents/resume`.
- Normalize current resume sections, raw work units, strategy sections, and mapping summaries.
- Sanitize direct contact data, private URLs, tokens, and secret-like values.
- Upsert `resume_source_items` and record `resume_import_batches`.
- Mark noisy evidence as store-only with `vectorize = false`.
- Do not create embeddings in this phase.
- Do not answer chat questions in this phase.

## Source Inputs

### App Sources

- `apps/web/src/constants/resume-data.json`
- `apps/web/messages/ko-KR.json`
- `apps/web/messages/en-US.json`
- `apps/web/messages/ja-JP.json`
- `apps/web/resume-detail/*.mdx`

### Resume Workspace Sources

The importer must use an explicit manifest rather than scanning the whole workspace.

Vectorize in V1:

- Current final resume sections.
- Current public resume page source items.
- Allowlisted Oprimed and Code Crayon raw work units.
- Confirmed AI workflow and CI/CD evidence documents.
- Strategy documents needed for phrasing questions.
- Wanted mapping summaries for current variants only.

Store but do not vectorize in V1:

- Full commit TSV logs.
- Full name-status TXT logs.
- Old resume versions.
- Long Wanted change-note history.
- Raw directory README/index files.
- Candidate-device evidence unless explicitly allowlisted.
- Job tracker/recommendation JSON unless chat scope expands.

## Runtime Rule

Only the import CLI may read these files. API request handlers, RAG retrievers, answer services, and web pages must not read MDX, JSON, Markdown, TSV, or TXT source files.

## Source Item Contract

Each loaded item must include:

- `sourceType`
- `itemType`
- `sourcePath`
- `sourceKey`
- `title`
- `bodyText`
- `locale`
- `status`
- `visibility`
- `vectorize`
- `contentHash`
- `metadata`

`metadata` should preserve useful evidence shape without forcing a relational schema, for example:

- `sectionPath`
- `version`
- `bucket`
- `dateRange`
- `affectedArea`
- `evidenceCommits`
- `caveats`
- `currentVariant`
- `targetRole`
- `rejectionReason`

## Tasks

### Task 1: Manifest Tests

- [ ] Create tests for an import manifest loader.
- [ ] Assert the manifest does not allow whole-directory recursive ingestion by default.
- [ ] Assert each manifest entry has `sourceType`, `itemType`, `visibility`, and `vectorize`.
- [ ] Assert unsupported paths are rejected before file read.

### Task 2: Manifest Loader

- [ ] Create `apps/api/src/resume-rag/import/resume-import-manifest.ts`.
- [ ] Represent app sources and resume workspace sources as explicit entries.
- [ ] Add per-entry parser hints for JSON, MDX, Markdown, TSV, and TXT.
- [ ] Keep the manifest deterministic and reviewable.

### Task 3: Source Loader Tests

- [ ] Create tests for a source loader that returns normalized source item payloads.
- [ ] Assert direct contact fields are excluded.
- [ ] Assert old resume versions and noisy logs default to `vectorize = false`.
- [ ] Assert raw work unit fields become metadata where present.
- [ ] Assert MDX frontmatter is removed from `bodyText`.

### Task 4: Source Loader

- [ ] Create `apps/api/src/resume-rag/import/resume-source-item-loader.ts`.
- [ ] Parse JSON with `JSON.parse`.
- [ ] Parse MDX and Markdown as text with frontmatter stripped.
- [ ] Parse TSV/TXT evidence as store-only items unless the manifest explicitly marks otherwise.
- [ ] Sanitize emails, phone numbers, direct contact keys, private URLs, and token-like values.
- [ ] Return plain DTOs without TypeORM dependencies.

### Task 5: Import Service Tests

- [ ] Create tests for `ResumeSourceItemImportService`.
- [ ] Mock repositories for import batches and source items.
- [ ] Assert imports create a batch with summary counts.
- [ ] Assert unchanged `contentHash` rows are idempotent.
- [ ] Assert changed items create or update source rows according to the unique key.
- [ ] Assert rejected items are counted with reasons.

### Task 6: Import Service

- [ ] Create `apps/api/src/resume-rag/import/resume-source-item-import.service.ts`.
- [ ] Start a `resume_import_batches` row before import.
- [ ] Upsert `resume_source_items` by `(sourceType, sourceKey, contentHash)`.
- [ ] Store inclusion, exclusion, rejection, and vectorization counts in batch summary.
- [ ] Mark rejected or sensitive items in summary without logging full body text.

### Task 7: CLI

- [ ] Create `apps/api/scripts/import-resume-source-items.ts`.
- [ ] Initialize the TypeORM data source.
- [ ] Load manifest entries from repo root and approved resume workspace paths.
- [ ] Run import service.
- [ ] Print imported, skipped, rejected, vectorizable, and store-only counts.
- [ ] Add `resume:import` script to `apps/api/package.json`.

## Verification

```bash
pnpm --filter @vscoke/api test -- resume-import-manifest resume-source-item-loader resume-source-item-import
pnpm --filter @vscoke/api lint
pnpm --filter @vscoke/api build
```

## Done When

- Allowlisted resume evidence can be imported into `resume_source_items`.
- Import batches show what was included and excluded.
- Importer is the only filesystem reader for resume source files.
- Source rows can be re-imported idempotently.
- Store-only evidence remains available in DB without polluting vector retrieval.
