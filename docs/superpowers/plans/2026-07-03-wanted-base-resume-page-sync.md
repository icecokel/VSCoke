# Wanted Base Resume Page Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync the VSCoke resume page in Korean and English with the current Wanted base resume.

**Architecture:** The readme resume page is data-driven. `resume-data.json` controls which career/project entries render, while `ko-KR.json` and `en-US.json` provide localized copy. MDX files provide detail pages for selected project descriptions.

**Tech Stack:** Next.js App Router, next-intl JSON messages, MDX resume details, Playwright tests, TypeScript.

---

### Task 1: Add Resume Copy Integrity Test

**Files:**

- Modify: `apps/web/tests/e2e/i18n-integrity.spec.ts`

- [ ] Add a test that loads both locale message files and verifies the Wanted base resume phrases exist in Korean and English.
- [ ] Run `pnpm --filter @vscoke/web e2e tests/e2e/i18n-integrity.spec.ts --project=chromium` and confirm the new test fails before message changes.

### Task 2: Sync Visible Resume Data

**Files:**

- Modify: `apps/web/src/constants/resume-data.json`
- Modify: `apps/web/messages/ko-KR.json`
- Modify: `apps/web/messages/en-US.json`

- [ ] Limit the All of Them rendered projects to the two Wanted-visible entries.
- [ ] Replace Korean introduction and career copy with the Wanted base resume structure.
- [ ] Translate the same structure into English without changing the rendered data keys.
- [ ] Keep technical stacks in `skills` fields.

### Task 3: Sync Detail Pages

**Files:**

- Modify: `apps/web/resume-detail/oprimed-medical-frontend-productization.mdx`
- Modify: `apps/web/resume-detail/commerce-backoffice-product.mdx`
- Modify: `apps/web/resume-detail/translate.mdx`
- Modify: `apps/web/resume-detail/shortime-playground.mdx`
- Modify: `apps/web/resume-detail/freebooting-finder.mdx`

- [ ] Update Oprimed detail to the two-section Wanted structure.
- [ ] Update Code Crayon detail pages so they match the updated summary page tone and facts.
- [ ] Avoid adding ungrounded metrics.

### Task 4: Verify

**Files:**

- No additional files.

- [ ] Run the focused Playwright integrity test.
- [ ] Run `pnpm type:check:web`.
- [ ] Run `pnpm lint:web`.
- [ ] Run `git diff --check`.
- [ ] Run resume wording checks for repeated weak phrasing.
