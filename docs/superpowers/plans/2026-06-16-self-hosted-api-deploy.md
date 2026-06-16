# Self-hosted API Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy `apps/api` from a Termux self-hosted GitHub Actions runner without SSH or Cloudflare Access SSH secrets.

**Architecture:** The workflow runs directly on the Termux production host with labels `self-hosted`, `termux`, and `vscoke-api`. It builds from the GitHub checkout, stages production files under `~/projects/vscoke-api/.next-release`, swaps the staged release into `~/projects/vscoke-api` while preserving `.env`, restarts PM2, and verifies local and public API health.

**Tech Stack:** GitHub Actions, Termux self-hosted runner, Node.js, pnpm 9.12.0, NestJS, PM2.

---

### Task 1: Replace SSH Deploy With Self-hosted Runner Deploy

**Files:**

- Modify: `.github/workflows/deploy-api.yml`

- [x] **Step 1: Change runner target**

Set `runs-on` to `[self-hosted, termux, vscoke-api]` so the workflow only runs on the Termux production runner.

- [x] **Step 2: Remove SSH and Cloudflare Access steps**

Delete `TERMUX_HOST`, `TERMUX_USER`, `TERMUX_KEY`, `cloudflared`, SSH config, `ssh`, and `scp` steps.

- [x] **Step 3: Add local deployment steps**

Add prerequisite checks, pnpm setup, API build, runtime `.env` verification, staged release install, PM2 restart, local health check, and public health check.

### Task 2: Update Operations Documentation

**Files:**

- Modify: `docs/deployment-and-env.md`
- Modify: `docs/user-deployment-checklist.md`
- Modify: `apps/api/DEPLOY.md`

- [x] **Step 1: Document self-hosted runner requirement**

Document that the Termux server must have a GitHub self-hosted runner with labels `termux` and `vscoke-api`.

- [x] **Step 2: Remove obsolete SSH secret requirement**

Replace `TERMUX_HOST`, `TERMUX_USER`, and `TERMUX_KEY` instructions with runner setup and optional `API_HEALTH_URL` / `API_DEPLOY_DIR` repository variables.

- [x] **Step 3: Document remaining manual setup**

Keep `.env`, PM2, Cloudflare Tunnel, and API smoke checks as manual/operational verification items.

### Task 3: Verify and Publish

**Files:**

- Test: `.github/workflows/deploy-api.yml`
- Test: repository scripts

- [x] **Step 1: Run format checks**

Run `pnpm exec prettier --check .github/workflows/deploy-api.yml docs/deployment-and-env.md docs/user-deployment-checklist.md apps/api/DEPLOY.md docs/superpowers/plans/2026-06-16-self-hosted-api-deploy.md`.

- [x] **Step 2: Run API and repository checks**

Run API build, lint, typecheck, API tests, API e2e tests, and remote API smoke check.

- [x] **Step 3: Push and open PR**

Commit with a Korean conventional commit subject, push `codex/ci/self-hosted-api-deploy`, and open a PR.
