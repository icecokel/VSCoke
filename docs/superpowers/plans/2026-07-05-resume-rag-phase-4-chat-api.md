# Resume RAG Phase 4: Chat API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose an authenticated chat API that answers from DB text/keyword retrieval.

**Architecture:** The API searches existing `resume_source_items.bodyText` and metadata with DB text/keyword search, builds grounded context from returned source items, and calls the configured answer-generation adapter. Natural-language answering is routed through Codex app-server via `RAG_CHAT_PROVIDER=codex-app-server`. The endpoint must not read source files or import loaders at runtime. OpenAI/API embedding keys are not required for production chat.

**Tech Stack:** NestJS 11, TypeORM 0.3, PostgreSQL text search, GoogleAuthGuard, Swagger DTOs, Jest.

---

## Scope

- Add `POST /resume-rag/chat`.
- Require authenticated API access.
- Retrieve source evidence from `resume_source_items` only.
- Return answer, grounded flag, and source citations.
- Redact question body from production error notifications.
- Use Codex app-server for final natural-language answer generation.
- Keep vector embeddings/indexing as an optional legacy/future path outside current production chat.
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

The retriever must query only `resume_source_items` and existing DB text/metadata.

It must filter by:

- eligible `status`
- allowed `visibility` for the authenticated user
- requested locale policy
- text/keyword score or fallback threshold

If no source item passes the threshold, the API returns `grounded: false` and a localized fallback.

## Tasks

### Task 1: DTO Tests

- [ ] Add request DTO tests for question length and locale validation.
- [ ] Add response DTO shape tests.
- [ ] Assert unsupported locale is rejected.
- [ ] Assert source DTO exposes source-item citation fields.

### Task 2: DTOs

- [ ] Create `apps/api/src/resume-rag/dto/resume-rag-chat-request.dto.ts`.
- [ ] Create `apps/api/src/resume-rag/dto/resume-rag-chat-response.dto.ts`.
- [ ] Create `apps/api/src/resume-rag/dto/resume-rag-source.dto.ts`.
- [ ] Keep response citations source-file agnostic from the web app perspective.

### Task 3: Retriever Tests

- [ ] Mock `DataSource.query`.
- [ ] Assert SQL reads `resume_source_items`.
- [ ] Assert SQL does not read `resume_vector_chunks`.
- [ ] Assert SQL filters `locale`, `status`, and `visibility`.
- [ ] Assert low-score rows are filtered.
- [ ] Assert no filesystem dependency exists in retriever constructor.

### Task 4: Retriever

- [ ] Create `apps/api/src/resume-rag/resume-rag-retriever.service.ts`.
- [ ] Query DB text/keyword search over `resume_source_items`.
- [ ] Return item body/excerpt and citation metadata from source item rows.
- [ ] Enforce visibility and status filters in SQL.

### Task 5: Answer Service Tests

- [ ] Mock retriever and chat provider.
- [ ] Assert no retrieved chunks returns localized fallback and `grounded: false`.
- [ ] Assert retrieved chunks are included in prompt context.
- [ ] Assert answer provider receives a grounded-only instruction.
- [ ] Assert Codex app-server provider starts an ephemeral read-only thread and returns final answer text.
- [ ] Assert citations are derived from retrieved source item rows.

### Task 6: Answer Service

- [ ] Create `apps/api/src/resume-rag/resume-rag.service.ts`.
- [ ] Build context only from retrieved DB source item text.
- [ ] Call chat provider adapter; use `codex-app-server` for natural-language generation.
- [ ] Return citations derived from source item fields and metadata.
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

- Chat API reads `resume_source_items` only.
- Auth is required.
- Low-confidence retrieval returns `grounded: false`.
- Question text is not leaked to error notifications.
- Production chat requires `RAG_CHAT_PROVIDER=codex-app-server`, `RAG_CODEX_APP_SERVER_URL`, and `RAG_CODEX_CWD`, but does not require `RAG_AI_API_KEY`.
- API tests and build pass.
