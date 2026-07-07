# README Chat Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a README floating resume-question entry that waits for the first API answer on the README page, stores it in `sessionStorage`, and opens the chat page with the completed conversation.

**Architecture:** Keep the backend contract unchanged. Add a small client-side storage utility, a README-only floating composer, and a `chatId` hydration path in the existing resume question chat component.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, next-intl, shadcn/ui `Button` and `Textarea`, Playwright.

## Global Constraints

- New files use kebab-case.
- Shared interaction primitives reuse `apps/web/src/components/ui/`.
- Web code lives under `apps/web`.
- The API request remains `POST /resume-rag/chat`.
- Chat history for this feature is temporary browser `sessionStorage`, not server persistence.
- Tests are written before production code changes.

---

## File Structure

- Create `apps/web/src/features/resume-rag/lib/resume-rag-chat-storage.ts`: read/write/validate temporary chat records in `sessionStorage`.
- Create `apps/web/src/features/resume-rag/components/readme-resume-question-composer.tsx`: README floating composer and "view answer" state.
- Modify `apps/web/src/app/[locale]/readme/page.tsx`: render the floating composer next to `Profile`.
- Modify `apps/web/src/app/[locale]/resume/question/page.tsx`: pass `chatId` search param to the chat component.
- Modify `apps/web/src/features/resume-rag/components/resume-question-chat.tsx`: hydrate initial messages from `chatId`.
- Modify `apps/web/messages/*.json`: add localized README composer copy.
- Modify `apps/web/tests/e2e/resume-rag-chat-public.spec.ts`: add README entry E2E coverage.

## Task 1: README Entry Regression Test

**Files:**

- Modify: `apps/web/tests/e2e/resume-rag-chat-public.spec.ts`

**Interfaces:**

- Consumes: existing Playwright route mock for `${apiBaseUrl}/resume-rag/chat`
- Produces: failing coverage for README entry storage and navigation

- [ ] **Step 1: Add a failing Playwright test**

Add a test that visits `/ko-KR/readme`, fills the floating composer, mocks `/resume-rag/chat`, waits for `답변 보러가기`, clicks it, and expects `/ko-KR/resume/question?chatId=...` to render the saved question, answer, and source title.

- [ ] **Step 2: Run the focused E2E and verify RED**

Run:

```bash
PATH="/opt/homebrew/bin:$PATH" NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 corepack pnpm --filter @vscoke/web e2e tests/e2e/resume-rag-chat-public.spec.ts --project=chromium
```

Expected: the new README entry test fails because the floating composer does not exist.

## Task 2: Storage Utility

**Files:**

- Create: `apps/web/src/features/resume-rag/lib/resume-rag-chat-storage.ts`

**Interfaces:**

- Produces: `storeResumeRagChat(chat)`, `readResumeRagChat(chatId)`, `StoredResumeRagChat`

- [ ] **Step 1: Implement guarded sessionStorage helpers**

Create helpers that serialize records under `vscoke.resumeRag.chat.<chatId>`, validate the required fields on read, and return `null` if browser storage is unavailable or malformed.

- [ ] **Step 2: Run typecheck after the storage file compiles**

Run:

```bash
corepack pnpm --filter @vscoke/web type:check
```

Expected: no TypeScript errors from the new helper.

## Task 3: README Floating Composer

**Files:**

- Create: `apps/web/src/features/resume-rag/components/readme-resume-question-composer.tsx`
- Modify: `apps/web/src/app/[locale]/readme/page.tsx`
- Modify: `apps/web/messages/ko-KR.json`
- Modify: `apps/web/messages/en-US.json`
- Modify: `apps/web/messages/ja-JP.json`

**Interfaces:**

- Consumes: `askResumeRag`, `storeResumeRagChat`, `useRouter`, `useLocale`, `resumeRag.readmeEntry.*` copy
- Produces: README floating input with loading, error, and view-answer states

- [ ] **Step 1: Add localized copy**

Add `resumeRag.readmeEntry` labels for title, description, placeholder, submit, submitting, ready, retry, and error.

- [ ] **Step 2: Implement the client composer**

Use shadcn `Textarea` and `Button`. On submit, generate a `chatId`, call `askResumeRag`, store the successful result, and show a ready button that routes to `/resume/question?chatId=<id>`.

- [ ] **Step 3: Render it on README**

Update the README route to render `Profile` and the new composer.

## Task 4: Chat Page Hydration

**Files:**

- Modify: `apps/web/src/app/[locale]/resume/question/page.tsx`
- Modify: `apps/web/src/features/resume-rag/components/resume-question-chat.tsx`

**Interfaces:**

- Consumes: `readResumeRagChat(chatId)`
- Produces: `ResumeQuestionChat` can render stored user and assistant messages immediately

- [ ] **Step 1: Pass `chatId` from search params**

Read `searchParams.chatId` on the server page and pass a string prop to the client component.

- [ ] **Step 2: Hydrate stored chat on mount**

If `chatId` resolves to a stored record, set messages to a user message and assistant message. If the record is missing, leave the existing empty state unchanged.

## Task 5: Verification

**Files:**

- Verify all modified files

- [ ] **Step 1: Run focused E2E**

Run:

```bash
PATH="/opt/homebrew/bin:$PATH" NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 corepack pnpm --filter @vscoke/web e2e tests/e2e/resume-rag-chat-public.spec.ts --project=chromium
```

Expected: all tests in the file pass.

- [ ] **Step 2: Run web typecheck**

Run:

```bash
corepack pnpm --filter @vscoke/web type:check
```

Expected: no TypeScript errors.
