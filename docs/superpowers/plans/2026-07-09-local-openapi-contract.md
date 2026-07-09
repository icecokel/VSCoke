# Local OpenAPI Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate frontend API types from the current local API contract instead of production Swagger.

**Architecture:** Add a DB-free API contract module that reuses real controllers and DTOs with stub services. Generate `apps/api/openapi.json` from that module, then run `openapi-typescript` against the local file.

**Tech Stack:** NestJS 11, `@nestjs/swagger`, TypeScript, `ts-node`, `openapi-typescript`, pnpm workspace scripts.

## Global Constraints

- Use `pnpm@9.12.0` from the root `packageManager`.
- Do not make `apps/web` import `apps/api` source code at runtime or build time.
- The OpenAPI generator must not require PostgreSQL, production API network access, or production Swagger.
- New files use kebab-case names.

---

### Task 1: Local Contract Generator

**Files:**

- Create: `apps/api/test/api-contract.e2e-spec.ts`
- Create: `apps/api/src/api-contract.module.ts`
- Create: `apps/api/src/api-contract.ts`
- Modify: `apps/api/src/api-documentation.ts`
- Create: `apps/api/scripts/generate-openapi.ts`

**Interfaces:**

- Produces: `createLocalOpenApiDocument(): Promise<OpenAPIObject>`
- Produces: CLI `pnpm --filter @vscoke/api openapi:generate`

- [ ] Write failing e2e test importing `createLocalOpenApiDocument`.
- [ ] Run `pnpm --filter @vscoke/api test:e2e -- api-contract.e2e-spec.ts --runInBand` and confirm it fails because the generator does not exist.
- [ ] Implement contract module with real controllers and stub service providers.
- [ ] Export `createApiDocument(app)` from `api-documentation.ts`.
- [ ] Implement `createLocalOpenApiDocument()` and the `scripts/generate-openapi.ts` CLI.
- [ ] Run the focused e2e test and confirm it passes.

### Task 2: Workspace Scripts And Contract Drift Check

**Files:**

- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`
- Modify: `package.json`
- Modify: `.github/workflows/pull-request-check.yml`

**Interfaces:**

- Root script `pnpm generate:openapi`
- Root script `pnpm generate:types`
- Root script `pnpm check:api-contract`

- [ ] Add API script `openapi:generate`.
- [ ] Point Web `generate:types` at `../api/openapi.json`.
- [ ] Make root `generate:types` generate OpenAPI first, then Web types.
- [ ] Add root `check:api-contract` to regenerate and diff `apps/api/openapi.json` and `apps/web/src/types/api.d.ts`.
- [ ] Add the contract check to PR CI before Web typecheck.

### Task 3: Generated Contract And Docs

**Files:**

- Create: `apps/api/openapi.json`
- Modify: `apps/web/src/types/api.d.ts`
- Modify: `docs/local-development.md`
- Modify: `docs/vscoke-monorepo-concept.md`

**Interfaces:**

- `apps/api/openapi.json` is the local generated contract file.
- `apps/web/src/types/api.d.ts` is generated from the local contract file.

- [ ] Run `pnpm generate:types`.
- [ ] Confirm generated files changed only as expected.
- [ ] Update docs so API type generation describes local OpenAPI generation instead of production Swagger.
- [ ] Run `pnpm --filter @vscoke/api test:e2e -- api-contract.e2e-spec.ts --runInBand`.
- [ ] Run `pnpm check:api-contract`.
- [ ] Run `pnpm type:check:web`.
- [ ] Run `pnpm lint`.
