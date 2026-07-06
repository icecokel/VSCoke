# Resume RAG DB Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a resume RAG chat system where database source items are the source of truth and runtime question answering reads existing DB text.

**Architecture:** Existing resume files are import inputs only. Import turns allowlisted raw evidence, final resume sections, strategy documents, and mapping summaries into `resume_source_items`; chat retrieval reads `resume_source_items` with text/keyword scoring. Natural-language answer generation uses Codex app-server. Vector chunks and embedding settings are optional legacy/future paths.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL, pgvector optional, Next.js 15 App Router, next-intl, shadcn/ui primitives, Jest, Playwright.

---

## Governing Decisions

- DB is the source of truth after import.
- Runtime chat never reads MDX, JSON, Markdown, TSV, or TXT files.
- V1 uses `resume_source_items` rather than detailed `career/project/section` tables.
- Runtime retrieval reads source rows directly; vector rows are optional legacy/future metadata.
- Answer-generation provider is Codex app-server.
- Embedding model/provider selection remains open.
- ANN indexes are deferred until embedding model and dimension are selected.
- Import is allowlist-driven; full `/Users/smlee/Documents/resume` ingestion is explicitly out of scope.

## Source Shape Summary

`/Users/smlee/Documents/resume` contains:

- raw work units with semi-structured fields
- commit TSV and name-status evidence logs
- many final and draft resume versions
- strategy and writing concept documents
- Wanted resume mapping JSON

This data is closer to an evidence archive than a relational career database. V1 should preserve raw evidence and metadata without over-normalizing it.

## Phase Documents

| Phase | Document                                                                          | Scope                                                                                      |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1     | [DB Source Schema](./2026-07-05-resume-rag-phase-1-db-source-schema.md)           | `resume_import_batches`, `resume_source_items`, `resume_vector_chunks`, pgvector extension |
| 2     | [Import Pipeline](./2026-07-05-resume-rag-phase-2-import-pipeline.md)             | Allowlisted import from resume files into source items                                     |
| 3     | [Vector Index Pipeline](./2026-07-05-resume-rag-phase-3-vector-index-pipeline.md) | Chunk source items and upsert vector chunks                                                |
| 4     | [Chat API](./2026-07-05-resume-rag-phase-4-chat-api.md)                           | Public-origin-limited text retrieval and grounded answer generation                        |
| 5     | [Web Chat](./2026-07-05-resume-rag-phase-5-web-chat.md)                           | Public resume question UI and citation rendering                                           |

## Execution Order

1. Complete schema and import manifest design.
2. Implement allowlisted import and sanitizer.
3. Keep embedding adapter, chunker, and exact vector indexing optional.
4. Implement text-search chat API and redaction.
5. Implement web chat UI after API contract stabilizes.

## Acceptance Criteria

- Source rows are inspectable in PostgreSQL as `resume_source_items`.
- Chat retrieval can answer from DB source items.
- Source rows contain enough metadata to cite title, source path, source key, section path, version, and caveats.
- Chat retrieval filters by public visibility, status, locale, and text score.
- Model settings remain runtime configuration, not source defaults.
- Tests cover importer, indexer, retriever, redaction, public-origin guard behavior, and web route rendering.
