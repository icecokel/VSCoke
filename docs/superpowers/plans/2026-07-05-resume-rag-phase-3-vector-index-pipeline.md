# Resume RAG Phase 3: Optional Vector Index Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the optional vector-indexing plan for a legacy/future retrieval path.

**Architecture:** Current production chat does not require this phase. Runtime RAG retrieves existing DB text from `resume_source_items` with keyword/text search and uses Codex app-server for answer generation. If vector retrieval is re-enabled later, the indexer reads vectorizable `resume_source_items`, chunks `bodyText`, calls an embedding adapter, and upserts `resume_vector_chunks`.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL, pgvector, provider adapter boundary, Jest.

---

## Scope

- Treat this phase as optional legacy/future work, not a prerequisite for current production chat.
- Read source text from DB source items only.
- Chunk source item text into deterministic vector inputs.
- Define an embedding provider adapter without choosing a final provider/model.
- Upsert vector chunks with embedding profile and citation metadata.
- Delete stale chunks only within the same embedding and chunking profile.
- Do not implement chat answer generation in this phase.

## Required Configuration

- `RAG_EMBEDDING_PROVIDER`
- `RAG_EMBEDDING_MODEL`
- `RAG_EMBEDDING_DIMENSIONS`

These are required to run indexing. They must not have source-code defaults.

They are not required for current production chat. `RAG_AI_API_KEY` is required only when the optional embedding provider path uses an openai-compatible API.

## Vector Row Citation Contract

If vector retrieval is re-enabled, each `resume_vector_chunks` row must carry enough metadata for citations without joining `resume_source_items`:

- `sourceType`
- `itemType`
- `title`
- `locale`
- `sourcePath`
- `sourceKey`
- `visibility`
- `status`
- `citationMetadata.sectionPath`
- `citationMetadata.version`
- `citationMetadata.bucket`
- `citationMetadata.dateRange`
- `citationMetadata.caveats`
- `citationMetadata.evidenceCommits`

## Search Strategy

- Use exact pgvector search only for the optional vector path.
- Do not add HNSW or IVFFlat indexes yet.
- Add ANN indexes only after provider, model, dimensions, data volume, and recall requirements are selected.

## Tasks

### Task 1: Config Tests

- [ ] Create tests for `resume-rag.config.ts`.
- [ ] Assert missing embedding provider/model/dimensions are represented as missing values.
- [ ] Assert numeric settings are parsed from env strings.
- [ ] Assert no specific provider or model is returned by default.

### Task 2: Config Helper

- [ ] Create or update `apps/api/src/resume-rag/resume-rag.config.ts`.
- [ ] Read embedding provider, model, dimensions, topK, and minSimilarity.
- [ ] Keep `topK` and `minSimilarity` defaults because they are retrieval behavior, not model selection.
- [ ] Do not default model/provider/dimensions.

### Task 3: Chunker Tests

- [ ] Create tests for deterministic source item chunking.
- [ ] Assert empty text returns no chunks.
- [ ] Assert long text is split without reordering.
- [ ] Assert whitespace normalization is stable.
- [ ] Assert citation metadata is copied into each chunk payload.

### Task 4: Chunker

- [ ] Create `apps/api/src/resume-rag/indexing/resume-source-item-chunker.ts`.
- [ ] Normalize CRLF to LF.
- [ ] Collapse excessive blank lines.
- [ ] Split by sentence or paragraph boundary.
- [ ] Keep chunk size configurable.
- [ ] Preserve source item citation metadata on every chunk.

### Task 5: Embedding Adapter Boundary

- [ ] Create `EmbeddingProvider` interface.
- [ ] Create provider implementation only behind that interface.
- [ ] Return `{ provider, model, dimensions, vector }` from embedding calls.
- [ ] Throw a clear error if required model settings are missing.
- [ ] Reject embedding responses whose vector length differs from `RAG_EMBEDDING_DIMENSIONS`.

### Task 6: Vector Indexer Tests

- [ ] Mock repositories for `resume_source_items` and `resume_vector_chunks`.
- [ ] Assert only `vectorize = true`, eligible `status`, and allowed `visibility` rows are indexed.
- [ ] Assert store-only rows are skipped.
- [ ] Assert unchanged chunks for the same profile are skipped.
- [ ] Assert stale chunks are deleted only for the same embedding and chunking profile.

### Task 7: Vector Indexer

- [ ] Create `apps/api/src/resume-rag/indexing/resume-vector-indexer.service.ts`.
- [ ] Read vectorizable `resume_source_items` from DB.
- [ ] Chunk each source item.
- [ ] Embed chunk content through the adapter.
- [ ] Upsert `resume_vector_chunks`.
- [ ] Copy denormalized citation metadata into every vector row.
- [ ] Delete stale vector chunks for the same source item, embedding profile, and chunking profile only.

### Task 8: CLI

- [ ] Create `apps/api/scripts/index-resume-vectors.ts`.
- [ ] Initialize TypeORM data source.
- [ ] Resolve embedding provider from runtime config.
- [ ] Run vector indexer.
- [ ] Print indexed, skipped, stale-deleted, and failed chunk counts.
- [ ] Add `resume:index` script to `apps/api/package.json`.

## Verification

```bash
pnpm --filter @vscoke/api test -- resume-rag.config resume-source-item-chunker resume-vector-indexer
pnpm --filter @vscoke/api lint
pnpm --filter @vscoke/api build
```

## Done When

- Vector rows are regenerated from DB source items.
- Embedding profile metadata is persisted with each vector row.
- Citation metadata is available directly from vector rows.
- Changing embedding model does not reuse stale vectors from another profile.
- Production chat can still run without this phase, without vector rows, and without an embedding API key.
