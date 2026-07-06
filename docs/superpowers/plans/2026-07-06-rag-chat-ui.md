# RAG Chat UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the public resume RAG question page with VSCode-style chat usability, suggested questions, clearer citations, and clearer failure states.

**Architecture:** Keep the API contract unchanged and implement this as a scoped web UI change. The chat component remains the state owner; localized strings supply suggested questions and labels; Playwright verifies the public no-login flow.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, next-intl, Tailwind CSS 4, shadcn `Button`/`Textarea`/`Skeleton`, Playwright.

---

## File Structure

- Modify `apps/web/src/features/resume-rag/components/resume-question-chat.tsx`
  - Owns chat state, submission, suggested question selection, pending/failure/source rendering.
- Modify `apps/web/messages/ko-KR.json`
  - Adds Korean suggested questions and source/failure labels.
- Modify `apps/web/messages/en-US.json`
  - Adds English suggested questions and source/failure labels.
- Modify `apps/web/messages/ja-JP.json`
  - Adds Japanese suggested questions and source/failure labels.
- Modify `apps/web/tests/e2e/resume-rag-chat-public.spec.ts`
  - Adds suggested question and citation rendering coverage while keeping public no-auth assertions.

### Task 1: Suggested Question Behavior Test

**Files:**

- Modify: `apps/web/tests/e2e/resume-rag-chat-public.spec.ts`

- [ ] **Step 1: Add a failing Playwright assertion for suggested questions**

Add this assertion to the first test after the textarea and submit button are located:

```ts
const suggestedQuestion = page.getByRole("button", {
  name: "Oprimed에서 어떤 업무를 했어?",
});

await expect(suggestedQuestion).toBeVisible();
await suggestedQuestion.click();
await expect(textarea).toHaveValue("Oprimed에서 어떤 업무를 했어?");
```

- [ ] **Step 2: Run test and verify it fails because suggested question UI is missing**

Run:

```bash
PATH="/opt/homebrew/bin:$PATH" NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 corepack pnpm --filter @vscoke/web e2e tests/e2e/resume-rag-chat-public.spec.ts --project=chromium
```

Expected: the first test fails while looking for the suggested question button.

### Task 2: Localized UI Copy

**Files:**

- Modify: `apps/web/messages/ko-KR.json`
- Modify: `apps/web/messages/en-US.json`
- Modify: `apps/web/messages/ja-JP.json`

- [ ] **Step 1: Add localized labels and suggested questions**

Add these keys under `resumeRag` in each locale:

```json
"emptyTitle": "무엇이 궁금한가요?",
"emptyDescription": "아래 질문으로 시작하거나 직접 질문을 입력하세요.",
"suggestionsLabel": "추천 질문",
"composerLabel": "질문 입력",
"sourceLabel": "근거",
"suggestions": [
  "Oprimed에서 어떤 업무를 했어?",
  "의료 도메인 경험을 설명해줘",
  "CI/CD와 배포 경험은 어때?",
  "프론트엔드 강점은 뭐야?"
]
```

Use equivalent English and Japanese strings in their locale files.

- [ ] **Step 2: Run message syntax check through typecheck**

Run:

```bash
PATH="/opt/homebrew/bin:$PATH" corepack pnpm --filter @vscoke/web type:check
```

Expected: no JSON parse or TypeScript errors.

### Task 3: Chat Surface UI

**Files:**

- Modify: `apps/web/src/features/resume-rag/components/resume-question-chat.tsx`

- [ ] **Step 1: Read localized suggestions**

Use:

```ts
const suggestions = t.raw("suggestions") as string[];
```

- [ ] **Step 2: Render the empty state as a VSCode-style panel**

Replace the dashed empty state with a bordered editor-like panel that renders `emptyTitle`, `emptyDescription`, `suggestionsLabel`, and suggestion buttons.

- [ ] **Step 3: Wire suggestion buttons to textarea state**

Each suggestion button must call:

```ts
setQuestion(suggestion);
```

Do not auto-submit on click; the user should still control sending.

- [ ] **Step 4: Improve message and source blocks**

Keep user messages on the right and assistant messages on the left. Render sources in a separated citation area with the localized `sourceLabel`, `sources`, and `similarity` strings.

- [ ] **Step 5: Improve composer semantics**

Add an accessible label for the textarea using `aria-label={t("composerLabel")}`. Keep the placeholder and disabled behavior unchanged.

- [ ] **Step 6: Run targeted Playwright test**

Run:

```bash
PATH="/opt/homebrew/bin:$PATH" NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 corepack pnpm --filter @vscoke/web e2e tests/e2e/resume-rag-chat-public.spec.ts --project=chromium
```

Expected: all tests in `resume-rag-chat-public.spec.ts` pass.

### Task 4: Quality and Deployment Verification

**Files:**

- Verify only unless failures require a focused fix.

- [ ] **Step 1: Run web typecheck**

```bash
PATH="/opt/homebrew/bin:$PATH" corepack pnpm --filter @vscoke/web type:check
```

- [ ] **Step 2: Run web lint**

```bash
PATH="/opt/homebrew/bin:$PATH" corepack pnpm --filter @vscoke/web lint
```

- [ ] **Step 3: Run full build**

```bash
PATH="/opt/homebrew/bin:$PATH" corepack pnpm build
```

- [ ] **Step 4: Merge to main with squash commit**

Use the project local squash merge rules and commit with:

```bash
feat(resume-rag):채팅 UI 개선
```

- [ ] **Step 5: Push main and wait for Vercel deployment**

Push `main` to `origin` and verify that Vercel serves the new page.

- [ ] **Step 6: Run production E2E smoke manually**

Open `https://vscoke.vercel.app/ko-KR/resume/question`, send a real question, and capture evidence that the answer and source block render without login.
