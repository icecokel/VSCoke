# Resume RAG Phase 1: DB Source Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the minimal PostgreSQL schema for resume source items, import batches, and vector chunks.

**Architecture:** V1 stores imported resume knowledge as flexible source items with JSONB metadata. It does not model careers, projects, skills, or sections as detailed relational tables. Vector chunks store embedding profile data and citation metadata so chat runtime can retrieve and cite from vector rows only.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL, pgvector, Jest.

---

## Scope

- Create TypeORM entities for import batches, source items, and vector chunks.
- Create a migration for the three tables and `pgvector` extension.
- Keep `embedding` as unbounded `vector` because model dimensions are not selected.
- Do not create `resume_document_sections`.
- Do not create career/project/skill tables.
- Do not implement import, embedding, or chat behavior in this phase.

## Tables

### `resume_import_batches`

- `id uuid primary key`
- `sourceName varchar(120) not null`
- `sourceRoot varchar(500) not null`
- `importerVersion varchar(80) not null`
- `status varchar(32) not null`
- `startedAt timestamptz not null`
- `finishedAt timestamptz`
- `summary jsonb not null default '{}'`
- `createdAt timestamptz not null`

### `resume_source_items`

- `id uuid primary key`
- `importBatchId uuid`
- `sourceType varchar(60) not null`
- `itemType varchar(60) not null`
- `sourcePath varchar(500) not null`
- `sourceKey varchar(300) not null`
- `title varchar(300) not null`
- `bodyText text not null`
- `locale varchar(16)`
- `status varchar(32) not null`
- `visibility varchar(40) not null`
- `vectorize boolean not null`
- `contentHash varchar(96) not null`
- `metadata jsonb not null default '{}'`
- `createdAt timestamptz not null`
- `updatedAt timestamptz not null`

Unique key:

- `(sourceType, sourceKey, contentHash)`

Indexes:

- `(sourceType, itemType)`
- `(status, visibility, vectorize)`
- `(contentHash)`

### `resume_vector_chunks`

- `id uuid primary key`
- `sourceItemId uuid not null`
- `chunkIndex integer not null`
- `content text not null`
- `contentHash varchar(96) not null`
- `sourceType varchar(60) not null`
- `itemType varchar(60) not null`
- `title varchar(300) not null`
- `locale varchar(16)`
- `sourcePath varchar(500) not null`
- `sourceKey varchar(300) not null`
- `visibility varchar(40) not null`
- `status varchar(32) not null`
- `citationMetadata jsonb not null default '{}'`
- `embeddingProvider varchar(80) not null`
- `embeddingModel varchar(160) not null`
- `embeddingDimensions integer not null`
- `embedding vector not null`
- `chunkerVersion varchar(80) not null`
- `chunkConfigHash varchar(96) not null`
- `indexedAt timestamptz not null`

Unique key:

- `(sourceItemId, chunkIndex, embeddingProvider, embeddingModel, embeddingDimensions, chunkerVersion, chunkConfigHash)`

Indexes:

- `(locale)`
- `(status, visibility)`
- `(embeddingProvider, embeddingModel, embeddingDimensions)`

## Tasks

### Task 1: Entity Tests

- [ ] Add tests asserting the three entity table names.
- [ ] Assert `resume_source_items` has `metadata`, `visibility`, `status`, and `vectorize`.
- [ ] Assert `resume_vector_chunks` has denormalized citation fields and embedding profile fields.
- [ ] Run `pnpm --filter @vscoke/api test -- resume-rag-schema`.

### Task 2: Entities

- [ ] Create `apps/api/src/resume-rag/entities/resume-import-batch.entity.ts`.
- [ ] Create `apps/api/src/resume-rag/entities/resume-source-item.entity.ts`.
- [ ] Create `apps/api/src/resume-rag/entities/resume-vector-chunk.entity.ts`.
- [ ] Keep names DB-source oriented and avoid MDX-specific naming.

### Task 3: Migration

- [ ] Create a migration under `apps/api/src/migrations/`.
- [ ] Add `CREATE EXTENSION IF NOT EXISTS vector`.
- [ ] Add `resume_import_batches`.
- [ ] Add `resume_source_items`.
- [ ] Add `resume_vector_chunks`.
- [ ] Do not add HNSW or IVFFlat indexes yet.

### Task 4: Module Boundary

- [ ] Create `apps/api/src/resume-rag/resume-rag.module.ts`.
- [ ] Register the three entities with `TypeOrmModule.forFeature`.
- [ ] Do not import the module into `AppModule` until at least one tested provider exists.

## Verification

```bash
pnpm --filter @vscoke/api test -- resume-rag-schema
pnpm --filter @vscoke/api lint
pnpm --filter @vscoke/api build
```

## Done When

- Schema reflects the item-based design.
- Vector chunks can support citation without source-table joins.
- No model/provider/dimension default is baked into the schema.
- API build passes.
