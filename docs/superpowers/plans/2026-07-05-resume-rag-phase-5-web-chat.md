# Resume RAG Phase 5: Web Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a web chat page for public resume questions without forcing visitor login.

**Architecture:** The web app does not access DB or source files. It sends public-origin-limited requests to the API, renders answer messages, and displays citations returned by the API. The API remains the only runtime owner of RAG retrieval.

**Tech Stack:** Next.js 15 App Router, React 19, next-intl, shadcn/ui primitives, Playwright.

---

## Scope

- Add localized `/resume/question` page.
- Add client service wrapper for `POST /resume-rag/chat`.
- Render user and assistant messages.
- Render source citations returned by API.
- Do not implement local RAG search in the browser.
- Do not read MDX/JSON/Markdown/TSV/TXT files from the chat page.

## Source Display Rule

The web page renders only API citation fields. It must not infer source paths, read source files, or link private filesystem paths directly. The API decides whether a source is displayed as a public link, plain citation label, or internal-only reference.

## Tasks

### Task 1: API Client Tests

- [ ] Add a unit or integration-style test for the client wrapper if an existing pattern exists.
- [ ] Assert missing auth token does not block public question submission.
- [ ] Assert API errors are surfaced as user-facing failure messages.
- [ ] Assert low-confidence `grounded: false` responses render without source links.

### Task 2: Service Wrapper

- [ ] Create `apps/web/src/features/resume-rag/types.ts`.
- [ ] Create `apps/web/src/features/resume-rag/lib/resume-rag-service.ts`.
- [ ] Use existing `apiClient`.
- [ ] Send the request without a Google ID token.
- [ ] Preserve API source citation fields without client-side source lookup.

### Task 3: UI Primitive Check

- [ ] Check `apps/web/src/components/ui/` for an existing textarea.
- [ ] Reuse existing textarea if present.
- [ ] If absent, add a shadcn-style textarea primitive under `apps/web/src/components/ui/textarea.tsx`.

### Task 4: Chat Component

- [ ] Create `apps/web/src/features/resume-rag/components/resume-question-chat.tsx`.
- [ ] Show submit action for unauthenticated visitors.
- [ ] Submit question to API without an auth token.
- [ ] Render returned citations as public links only when the API provides a public URL.
- [ ] Render internal citations as text labels with title, section path, and caveat.

### Task 5: Route And Messages

- [ ] Create `apps/web/src/app/[locale]/resume/question/page.tsx`.
- [ ] Add `resumeRag` messages to `ko-KR`, `en-US`, and `ja-JP`.
- [ ] Add the page to sidebar/search metadata if existing navigation supports it.

### Task 6: E2E

- [ ] Add Playwright test for unauthenticated page render and public question submission.
- [ ] Add Playwright test that sidebar search can find the resume question page.
- [ ] Do not require live API RAG in E2E unless test auth and DB are available.

## Verification

```bash
pnpm --filter @vscoke/web type:check
pnpm --filter @vscoke/web lint
pnpm --filter @vscoke/web e2e tests/e2e/resume-rag-chat.spec.ts --project=chromium
pnpm build
```

## Done When

- Resume question page is reachable in all supported locales.
- Unauthenticated users can submit public questions.
- Public requests go through API only.
- Web code contains no direct DB or filesystem RAG logic.
- Private source paths are not linked directly from the browser.
