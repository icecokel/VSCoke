# Resume RAG DB Source Design

## Goal

Build a resume/career RAG chat system where imported database rows are the source of truth and runtime question answering retrieves existing DB text with keyword/text search.

## Confirmed Decisions

- `/Users/smlee/Documents/resume` is a raw/semi-structured evidence archive, not a clean career schema.
- Existing MDX/JSON/Markdown/TSV/TXT files are import inputs only.
- After import, runtime RAG reads DB source rows; source files are not read by chat.
- Runtime chat retrieval uses text/keyword search over `resume_source_items`.
- Natural-language answer generation runs through Codex app-server.
- Embedding provider, embedding model, vector indexes, and embedding dimensions are optional legacy/future paths, not required for current deployment.
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

VSCoke already uses NestJS, TypeORM, PostgreSQL, migration scripts, Swagger DTOs, and route-level guards. A new `ResumeRagModule` under `apps/api/src/resume-rag` should follow those patterns. File reads belong to import CLI scripts only.

### Risk Review

The main risks are:

- Over-indexing raw commit logs and name-status files.
- Returning stale resume drafts as current truth.
- Returning low-quality results if text search ranking is too broad.
- Treating optional vector rows as required runtime infrastructure.
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

### `resume_vector_chunks` Optional Legacy/Future Path

Optional vector retrieval table. Current runtime chat does not require this table for retrieval. If vector indexing is re-enabled later, each row must contain enough denormalized citation metadata to answer without joining source tables.

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

ANN indexes are deferred until vector retrieval is selected again and embedding model/dimensions are fixed.

## Source Type Policy

### Search In Current Deployment

- Current final resume sections.
- Current public resume page source items.
- Allowlisted raw work units from Oprimed and Code Crayon.
- Confirmed AI workflow and CI/CD evidence documents.
- Strategy documents needed for “how should this be phrased?” questions.
- Wanted mapping summaries for current variants only.

### Store But Do Not Search In Current Deployment

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

`POST /resume-rag/chat` must query existing DB text from `resume_source_items` only. It must not read source files or require vector embeddings at chat runtime.

It must filter by:

- `visibility` allowed for public answers
- `status` eligible for answering
- locale policy
- text/keyword ranking threshold or fallback policy

The response source citation must be built from `resume_source_items` fields and item metadata.

## Model Selection Policy

- No embedding provider/model/dimension source-code defaults.
- `embeddingProvider`, `embeddingModel`, `embeddingDimensions`, and `RAG_AI_API_KEY` are required only if optional vector indexing/openai-compatible embedding is used.
- `RAG_CHAT_PROVIDER=codex-app-server` routes answer generation to Codex app-server.
- `RAG_CHAT_MODEL` is optional for Codex because the app-server can use its configured default model.
- `RAG_CODEX_APP_SERVER_URL` defaults to the local Codex loopback endpoint `ws://127.0.0.1:14561`.
- On Ubuntu host, `RAG_CODEX_CWD` should point to `/home/icenux/projects/vscoke-api`.
- Current production chat does not require OpenAI/API embedding keys.
- Existing vector rows may remain in DB but are ignored by current text-search retrieval.
- Exact pgvector search and HNSW/IVFFlat indexes are legacy/future vector options only.

## Security And Privacy

- Public chat must not force visitor login.
- Public chat must only retrieve `public` visibility source items.
- Public chat must reject browser requests whose `Origin`/`Referer` is outside the configured official web origin allowlist.
- If private/internal source items are indexed later, they must use a separate authenticated endpoint and stronger authorization than “any valid Google user”.
- Notification payloads must redact `question`, `authorization`, token-like values, email, phone, and contact fields.
- Import logs must not print full sensitive item bodies.

## V1 Non-Goals

- Full automatic ingestion of `/Users/smlee/Documents/resume`.
- Detailed resume CMS/editor.
- Career/project/skill relational model.
- Model selection UI.
- Multi-provider fallback.
- Private/internal resume chat on the public endpoint.
- Streaming responses.
- Chat history persistence.
- Automatic resume rewriting.

## Design Acceptance Criteria

- Phase 1 schema uses `resume_source_items`, `resume_vector_chunks`, and `resume_import_batches`.
- Runtime chat retrieves citations from `resume_source_items` and item metadata.
- Import manifest includes included and excluded source lists.
- At least 20 representative evaluation questions are defined before release.
- `rg` verification proves chat runtime has no filesystem reads from resume source files.
- Low-confidence retrieval returns `grounded: false`.
