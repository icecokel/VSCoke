# Monorepo Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert VSCoke into a conventional JS/TS monorepo with the existing Next.js app under `apps/web` and a future NestJS backend under `apps/api`.

**Architecture:** The repository root becomes the workspace control layer and no longer owns the web application source directly. `apps/web` owns the current Next.js code, tests, content, and app-local configuration. `apps/api` and `packages/*` are reserved as workspace package locations for the backend import and shared packages.

**Tech Stack:** pnpm workspaces, Next.js 15, TypeScript, Playwright, ESLint, Prettier.

---

## Purpose

This migration establishes the target monorepo shape before importing the backend repository. The first pass intentionally avoids shared package extraction so that the existing web app can keep building with minimal behavior changes.

The target structure is:

```txt
vscoke/
  apps/
    web/
    api/
  packages/
    api-types/
    config/
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
```

`apps/api` is a workspace application directory for the NestJS backend. It is not related to Next.js route handlers under `apps/web/src/app/api`.

## File Structure

- Create: `pnpm-workspace.yaml`
- Create: `apps/api/.gitkeep`
- Create: `packages/api-types/.gitkeep`
- Create: `packages/config/.gitkeep`
- Create: `docs/superpowers/plans/2026-06-13-monorepo-structure.md`
- Modify: `.gitignore`
- Modify: `package.json`
- Move to `apps/web/`: `src`, `public`, `messages`, `tests`, `scripts`, `resume-detail`
- Move to `apps/web/`: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `playwright.config.ts`, `postcss.config.mjs`, `components.json`, `knip.json`
- Keep at root: `README.md`, `AGENTS.md`, `.husky`, `.prettierrc.json`, `.lintstagedrc.json`, `.nvmrc`, workspace lockfile

## Tasks

### Task 1: Document the monorepo target

**Files:**

- Modify: `.gitignore`
- Create: `docs/superpowers/plans/2026-06-13-monorepo-structure.md`

- [x] Add a tracked plan document that states the goal, final structure, migration scope, and verification commands.
- [x] Add `.gitignore` exceptions so the plan document is tracked even though most local docs remain ignored.
- [x] Run `git status --short` and confirm the plan document is visible as an untracked file.

### Task 2: Create workspace directories

**Files:**

- Create: `apps/api/.gitkeep`
- Create: `packages/api-types/.gitkeep`
- Create: `packages/config/.gitkeep`

- [x] Create `apps/web`, `apps/api`, `packages/api-types`, and `packages/config`.
- [x] Add `.gitkeep` files only to empty reserved directories.
- [x] Do not add placeholder package files for `apps/api` or `packages/*` until there is real content to avoid fake packages in workspace commands.

### Task 3: Move the current web app into `apps/web`

**Files:**

- Move: `src/` to `apps/web/src/`
- Move: `public/` to `apps/web/public/`
- Move: `messages/` to `apps/web/messages/`
- Move: `tests/` to `apps/web/tests/`
- Move: `scripts/` to `apps/web/scripts/`
- Move: `resume-detail/` to `apps/web/resume-detail/`
- Move: app-local config files to `apps/web/`

- [x] Move only tracked app-owned files and directories.
- [x] Leave repository-level files at the root.
- [x] Keep ignored build output and local reports out of the migration.

### Task 4: Split package metadata

**Files:**

- Modify: `package.json`
- Create: `apps/web/package.json`
- Create: `pnpm-workspace.yaml`

- [x] Convert the root `package.json` into a workspace controller named `vscoke`.
- [x] Create `apps/web/package.json` named `@vscoke/web` with the existing Next.js dependencies and scripts.
- [x] Add root scripts that delegate to `@vscoke/web`.
- [x] Add `pnpm-workspace.yaml` with `apps/*` and `packages/*`.

### Task 5: Update web-local paths

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/playwright.config.ts`
- Modify: `apps/web/knip.json`
- Modify: `apps/web/components.json`
- Modify: `apps/web/scripts/playwright-runner.mjs`
- Modify: `apps/web/scripts/playwright-web-server.mjs`
- Modify: `README.md`
- Modify: `.husky/pre-push`

- [x] Ensure commands run from `apps/web` still use local paths such as `src`, `tests`, `scripts`, and `resume-detail`.
- [x] Ensure root commands delegate through pnpm filters instead of assuming the web app lives at the root.
- [x] Update README commands to show root workspace commands and web-local commands where useful.

### Task 6: Regenerate workspace lockfile

**Files:**

- Modify: `pnpm-lock.yaml`

- [x] Run `pnpm install` from the repository root.
- [x] Confirm `pnpm-lock.yaml` records the root workspace and `apps/web` importer.

### Task 7: Verify the reshaped repository

**Files:**

- No direct file edits.

- [x] Run `pnpm --filter @vscoke/web type:check`.
- [x] Run `NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 pnpm --filter @vscoke/web build`.
- [x] Run `pnpm --filter @vscoke/web e2e:smoke` if browser dependencies are available.
- [x] Run `git status --short` and review the moved files and generated lockfile.

## Deferred Work

- Imported `git@github.com:icecokel/vscoke-api.git` into `apps/api` with subtree after the web app structure stabilized.
- Replaced `apps/api/.gitkeep` with the real NestJS project during backend import.
- Create real `packages/api-types` and `packages/config` packages only when shared code or config is extracted.
- Archive the standalone `vscoke-api` repository after the monorepo backend build, tests, and deployment have been verified.
