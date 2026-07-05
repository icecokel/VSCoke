# Resume RAG DB Source Design

## Goal

Build a resume/career RAG chat system where imported database rows are the source of truth and runtime question answering reads only from vector-index rows.

## Confirmed Decisions

- `/Users/smlee/Documents/resume` is a raw/semi-structured evidence archive, not a clean career schema.
- Existing MDX/JSON/Markdown/TSV/TXT files are import inputs only.
- After import, RAG indexing reads DB source rows.
- Runtime chat retrieval reads vector rows only.
- Natural-language answer generation runs through Codex app-server.
- Embedding provider, embedding model, and embedding dimensions are not selected yet.
- V1 must avoid detailed `career/project/skill/achievement` normalization.
- V1 must avoid ingesting the whole resume workspace automatically.

## 3-Person Cross-Check Summary

### Data Analysis

The resume workspace contains mixed source layers:

- Raw work units with repeatable fields: `bucket`, `date range`, `affected area/files`, `evidence commits`, `raw interpretation`, `needs follow-up`.
- Commit TSV and name-status logs with high evidence value but high retrieval noise.
- Final resume versions, including many historical drafts.
- Strategy and writing concept documents.
- Wanted mapping JSON with current resume URLs, active variants, notes, and target-job metadata.

Conclusion: V1 should store these as source items with flexible metadata instead of forcing a relational career schema.

### Backend Fit

VSCoke already uses NestJS, TypeORM, PostgreSQL, migration scripts, Swagger DTOs, and Google ID-token authentication. A new `ResumeRagModule` under `apps/api/src/resume-rag` should follow those patterns. File reads belong to import CLI scripts only.

### Risk Review

The main risks are:

- Over-indexing raw commit logs and name-status files.
- Returning stale resume drafts as current truth.
- Losing citation data if runtime reads only vector rows.
- Model/dimension changes invalidating existing vectors.
- Leaking questions or private resume content through logs or notification payloads.

## V1 Data Model

### `resume_import_batches`

Tracks what was imported, from where, and with which importer version.

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

Represents a document section, raw work unit, mapping entry, strategy section, or evidence item.

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

Recommended unique key:

- `(sourceType, sourceKey, contentHash)`

Recommended indexes:

- `(sourceType, itemType)`
- `(status, visibility, vectorize)`
- `(contentHash)`

### `resume_vector_chunks`

Runtime retrieval table. It must contain enough denormalized citation metadata to answer without joining source tables.

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

Recommended unique key:

- `(sourceItemId, chunkIndex, embeddingProvider, embeddingModel, embeddingDimensions, chunkerVersion, chunkConfigHash)`

Recommended indexes:

- `(locale)`
- `(status, visibility)`
- `(embeddingProvider, embeddingModel, embeddingDimensions)`

ANN indexes are deferred until embedding model and dimensions are selected.

## Source Type Policy

### Vectorize In V1

- Current final resume sections.
- Current public resume page source items.
- Allowlisted raw work units from Oprimed and Code Crayon.
- Confirmed AI workflow and CI/CD evidence documents.
- Strategy documents needed for “how should this be phrased?” questions.
- Wanted mapping summaries for current variants only.

### Store But Do Not Vectorize In V1

- Full commit TSV logs.
- Full name-status TXT logs.
- Old resume versions.
- Long Wanted change-note history.
- Raw directory README/index files.
- Candidate-device evidence unless explicitly allowlisted.
- Job tracker/recommendation JSON unless the chat scope expands to application strategy.

## Import Rules

- Import must be allowlist-driven.
- Import must record `resume_import_batches`.
- Import must mark every item with `status`, `visibility`, and `vectorize`.
- Import must fail or reject items containing direct contact fields, email, phone, tokens, secrets, or private URLs.
- Import must keep rejection reasons in import summary or item metadata.
- Import must be idempotent by `sourceType`, `sourceKey`, and `contentHash`.

## Runtime Retrieval Rule

`POST /resume-rag/chat` must query `resume_vector_chunks` only.

It must filter by:

- active embedding provider/model/dimensions from runtime config
- `visibility` allowed for the authenticated user
- `status` eligible for answering
- locale policy
- similarity threshold

The response source citation must be built from vector row fields and `citationMetadata`.

## Model Selection Policy

- No embedding provider/model/dimension source-code defaults.
- `embeddingProvider`, `embeddingModel`, and `embeddingDimensions` are required to index and retrieve.
- `RAG_CHAT_PROVIDER=codex-app-server` routes answer generation to Codex app-server.
- `RAG_CHAT_MODEL` is optional for Codex because the app-server can use its configured default model.
- `RAG_CODEX_APP_SERVER_URL` defaults to the local Codex loopback endpoint `ws://127.0.0.1:14561`.
- Existing vector rows from other profiles remain in DB but are ignored by retrieval.
- Exact pgvector search is acceptable for V1.
- HNSW/IVFFlat indexes are added only after model/dimension selection.

## Security And Privacy

- Chat endpoint must require authentication.
- If private/internal source items are indexed, auth must be stronger than “any valid Google user”.
- Notification payloads must redact `question`, `authorization`, token-like values, email, phone, and contact fields.
- Import logs must not print full sensitive item bodies.

## V1 Non-Goals

- Full automatic ingestion of `/Users/smlee/Documents/resume`.
- Detailed resume CMS/editor.
- Career/project/skill relational model.
- Model selection UI.
- Multi-provider fallback.
- Public unauthenticated chat.
- Streaming responses.
- Chat history persistence.
- Automatic resume rewriting.

## Design Acceptance Criteria

- Phase 1 schema uses `resume_source_items`, `resume_vector_chunks`, and `resume_import_batches`.
- Runtime vector rows contain citation metadata without source-table joins.
- Import manifest includes included and excluded source lists.
- At least 20 representative evaluation questions are defined before release.
- `rg` verification proves chat runtime has no filesystem reads from resume source files.
- Low-confidence retrieval returns `grounded: false`.
