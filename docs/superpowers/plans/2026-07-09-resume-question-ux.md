# Resume Question UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the resume question page explain itself as a fast resume-checking tool through topic-based suggested questions, clearer README entry copy, and stronger evidence labeling.

**Architecture:** Keep the API contract and feature boundary unchanged. The client chat component owns topic expansion, suggested-question selection, pending/error rendering, and source display. Localized strings provide all user-facing copy.

**Tech Stack:** Next.js App Router, React 19, next-intl JSON messages, Tailwind CSS 4, shadcn/ui `Button`, `Textarea`, `Skeleton`, Playwright E2E.

## Global Constraints

- Do not change `POST /resume-rag/chat`.
- Do not add a new shared UI primitive.
- Reuse existing VSCode-style dark panel, border, blue accent, and yellow ready-state patterns.
- Suggested question clicks fill the textarea and do not submit automatically.
- README entry remains a question composer.
- Keep all new files in kebab-case.

---

### Task 1: Topic-Based Empty State

**Files:**

- Modify: `apps/web/tests/e2e/resume-rag-chat-public.spec.ts`
- Modify: `apps/web/src/features/resume-rag/components/resume-question-chat.tsx`
- Modify: `apps/web/messages/ko-KR.json`
- Modify: `apps/web/messages/en-US.json`
- Modify: `apps/web/messages/ja-JP.json`

**Interfaces:**

- Consumes: `resumeRag.questionTopics` locale array
- Produces: topic buttons that reveal suggested question buttons and call `setQuestion(question)`

- [ ] **Step 1: Write failing Playwright expectations**

Add expectations that `/ko-KR/resume/question` shows `이력서를 질문으로 빠르게 확인하세요`, shows `직무 적합성`, expands example questions, and fills the textarea without making a network call.

- [ ] **Step 2: Run focused E2E and verify failure**

Run: `PATH="/opt/homebrew/bin:$PATH" NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 corepack pnpm --filter @vscoke/web e2e tests/e2e/resume-rag-chat-public.spec.ts --project=chromium`

Expected: fails because the topic-based empty state is not implemented.

- [ ] **Step 3: Implement locale copy and component state**

Add `resumeRag.introTitle`, `resumeRag.introDescription`, and `resumeRag.questionTopics`. Update `EmptyChatState` to render topic buttons and expanded example questions.

- [ ] **Step 4: Run focused E2E and verify pass**

Run the same focused E2E command.

Expected: all tests in `resume-rag-chat-public.spec.ts` pass.

### Task 2: Evidence Labeling And README Copy

**Files:**

- Modify: `apps/web/tests/e2e/resume-rag-chat-public.spec.ts`
- Modify: `apps/web/src/features/resume-rag/components/resume-question-chat.tsx`
- Modify: `apps/web/src/features/resume-rag/components/readme-resume-question-composer.tsx`
- Modify: `apps/web/messages/ko-KR.json`
- Modify: `apps/web/messages/en-US.json`
- Modify: `apps/web/messages/ja-JP.json`

**Interfaces:**

- Consumes: `resumeRag.groundedBadge`, `resumeRag.evidenceLabel`, and `resumeRag.readmeEntry.*`
- Produces: visible answer trust badge and clearer source section label

- [ ] **Step 1: Write failing Playwright expectations**

Add expectations that a successful answer shows `이력서 근거 기반`, `참고한 이력서 근거`, and README entry copy beginning with `README를 읽다가 궁금한 점이 있나요?`.

- [ ] **Step 2: Run focused E2E and verify failure**

Run the focused E2E command.

Expected: fails because labels and README copy are not implemented yet.

- [ ] **Step 3: Implement minimal UI copy changes**

Render the badge in assistant messages and `PendingAnswer` only where appropriate, rename the source label, and update README entry text while keeping the composer behavior.

- [ ] **Step 4: Run focused E2E and verify pass**

Run the focused E2E command.

Expected: all tests in `resume-rag-chat-public.spec.ts` pass.

### Task 3: Static Checks

**Files:**

- Modify only the files touched in Tasks 1 and 2.

**Interfaces:**

- Consumes: final implementation
- Produces: type/lint confidence for changed web code

- [ ] **Step 1: Run web typecheck**

Run: `PATH="/opt/homebrew/bin:$PATH" corepack pnpm --filter @vscoke/web type:check`

Expected: command exits 0.

- [ ] **Step 2: Run focused lint if typecheck passes**

Run: `PATH="/opt/homebrew/bin:$PATH" corepack pnpm --filter @vscoke/web lint`

Expected: command exits 0 or reports only unrelated pre-existing issues.
