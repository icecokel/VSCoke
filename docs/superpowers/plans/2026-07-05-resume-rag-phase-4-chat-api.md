# Resume RAG Phase 4: Chat API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose an authenticated chat API that answers from vector DB retrieval only.

**Architecture:** The API embeds the user question with the configured embedding provider, searches `resume_vector_chunks` by vector similarity and embedding profile, builds grounded context from returned vector rows, and calls the configured answer-generation adapter. For V1, natural-language answering is routed through Codex app-server via `RAG_CHAT_PROVIDER=codex-app-server`. The endpoint must not read source files, import loaders, or source item tables at runtime.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL + pgvector, GoogleAuthGuard, Swagger DTOs, Jest.

---

## Scope

- Add `POST /resume-rag/chat`.
- Require authenticated API access.
- Retrieve source chunks from `resume_vector_chunks` only.
- Return answer, grounded flag, and source citations.
- Redact question body from production error notifications.
- Use Codex app-server for final natural-language answer generation.
- Do not add streaming in this phase.
- Do not add chat history persistence in this phase.

## Request Shape

```json
{
  "question": "어떤 의료 도메인 프로젝트 경험이 있나요?",
  "locale": "ko-KR"
}
```

## Response Shape

```json
{
  "answer": "검색된 이력 근거 기반 답변",
  "grounded": true,
  "sources": [
    {
      "title": "문서 제목",
      "sourcePath": "docs/raw/op/2026-01-example.md",
      "sourceKey": "op:2026-01-example:work-unit-1",
      "sectionPath": "Oprimed > AI workflow",
      "version": "current",
      "caveats": ["원본 근거는 내부 문서"],
      "excerpt": "근거 발췌",
      "similarity": 0.82
    }
  ]
}
```

## Retrieval Rule

The retriever must query only `resume_vector_chunks`.

It must filter by:

- active embedding provider/model/dimensions from runtime config
- eligible `status`
- allowed `visibility` for the authenticated user
- requested locale policy
- minimum similarity threshold

If no chunk passes the threshold, the API returns `grounded: false` and a localized fallback.

## Tasks

### Task 1: DTO Tests

- [ ] Add request DTO tests for question length and locale validation.
- [ ] Add response DTO shape tests.
- [ ] Assert unsupported locale is rejected.
- [ ] Assert source DTO exposes vector-row citation fields.

### Task 2: DTOs

- [ ] Create `apps/api/src/resume-rag/dto/resume-rag-chat-request.dto.ts`.
- [ ] Create `apps/api/src/resume-rag/dto/resume-rag-chat-response.dto.ts`.
- [ ] Create `apps/api/src/resume-rag/dto/resume-rag-source.dto.ts`.
- [ ] Keep response citations source-file agnostic from the web app perspective.

### Task 3: Retriever Tests

- [ ] Mock `DataSource.query`.
- [ ] Assert SQL reads `resume_vector_chunks`.
- [ ] Assert SQL does not join `resume_source_items`.
- [ ] Assert SQL filters `locale`, `embeddingProvider`, `embeddingModel`, and `embeddingDimensions`.
- [ ] Assert low-similarity rows are filtered.
- [ ] Assert no filesystem dependency exists in retriever constructor.

### Task 4: Retriever

- [ ] Create `apps/api/src/resume-rag/resume-rag-retriever.service.ts`.
- [ ] Embed question through embedding adapter.
- [ ] Query vector DB with pgvector distance operator.
- [ ] Return chunk content and citation metadata from vector rows.
- [ ] Enforce visibility and status filters in SQL.

### Task 5: Answer Service Tests

- [ ] Mock retriever and chat provider.
- [ ] Assert no retrieved chunks returns localized fallback and `grounded: false`.
- [ ] Assert retrieved chunks are included in prompt context.
- [ ] Assert answer provider receives a grounded-only instruction.
- [ ] Assert Codex app-server provider starts an ephemeral read-only thread and returns final answer text.
- [ ] Assert citations are derived from vector rows, not source item repository calls.

### Task 6: Answer Service

- [ ] Create `apps/api/src/resume-rag/resume-rag.service.ts`.
- [ ] Build context only from retrieved vector DB chunks.
- [ ] Call chat provider adapter; use `codex-app-server` for natural-language generation.
- [ ] Return citations derived from vector row fields and `citationMetadata`.
- [ ] Mark answer as low confidence when retrieval is below threshold.

### Task 7: Controller And Module

- [ ] Create `apps/api/src/resume-rag/resume-rag.controller.ts`.
- [ ] Use existing auth guard pattern.
- [ ] Register controller and providers in `ResumeRagModule`.
- [ ] Import `ResumeRagModule` into `AppModule`.

### Task 8: Notification Redaction

- [ ] Add test proving `/resume-rag/chat` request body is redacted from notification payload.
- [ ] Redact `question`, `authorization`, token-like values, email, phone, and contact fields for this endpoint.
- [ ] Ensure logs do not print retrieved chunk bodies at error level.

## Verification

```bash
pnpm --filter @vscoke/api test -- resume-rag
pnpm --filter @vscoke/api lint
pnpm --filter @vscoke/api build
```

## Done When

- Chat API reads `resume_vector_chunks` only.
- Auth is required.
- Low-confidence retrieval returns `grounded: false`.
- Question text is not leaked to error notifications.
- API tests and build pass.
