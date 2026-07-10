# CI Game Enum Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Poke Lounge game enum migration run on an empty PostgreSQL database without changing existing production enum values.

**Architecture:** Keep the historical migration identifier so production databases that already recorded it remain compatible. Its SQL will branch inside PostgreSQL: create the enum from the current `GameType` values when absent, otherwise perform the additive `POKE_LOUNGE` update. A query-runner capture unit spec will lock down both SQL branches without opening a database connection.

**Tech Stack:** NestJS, TypeORM migrations, PostgreSQL SQL, Jest, TypeScript

## Global Constraints

- Work only in `/Users/smlee/vscoke/worktrees/fix/poke-lounge-test-migration`.
- Do not enable `synchronize`, use an implicit database, connect to a local database, or recreate production schema objects.
- Preserve `GameType` values exactly: `SKY_DROP`, `POKE_LOUNGE`.
- Commit exactly `fix(api):신규 DB 게임 enum 마이그레이션 보강`.
- Record the CI rerun risk in `.superpowers/sdd/task-5-ci-migration-report.md`.

---

### Task 1: Cover the migration SQL contract

**Files:**

- Create: `apps/api/src/migrations/1793664000000-add-poke-lounge-game-type.spec.ts`
- Modify: `apps/api/src/migrations/1793664000000-add-poke-lounge-game-type.ts`
- Create: `.superpowers/sdd/task-5-ci-migration-report.md`

**Interfaces:**

- Consumes: `AddPokeLoungeGameType1793664000000.up(queryRunner: QueryRunner): Promise<void>`.
- Produces: a single captured SQL statement containing an absent-enum creation branch and an existing-enum additive branch.

- [x] **Step 1: Write the failing migration SQL spec**

```ts
expect(query).toMatch(
  /CREATE TYPE "game_history_gametype_enum" AS ENUM \('SKY_DROP', 'POKE_LOUNGE'\)/,
);
expect(query).toMatch(
  /ELSE\s+ALTER TYPE "game_history_gametype_enum" ADD VALUE IF NOT EXISTS 'POKE_LOUNGE'/,
);
```

- [x] **Step 2: Run the focused spec and verify it fails**

Run: `pnpm --filter @vscoke/api test -- 1793664000000-add-poke-lounge-game-type.spec.ts --runInBand`

Expected: FAIL because the current migration only sends `ALTER TYPE` and lacks the absent-enum branch.

- [x] **Step 3: Implement the minimal compatible migration SQL**

```sql
DO $$
BEGIN
  IF NOT EXISTS (...) THEN
    CREATE TYPE "game_history_gametype_enum" AS ENUM ('SKY_DROP', 'POKE_LOUNGE');
  ELSE
    ALTER TYPE "game_history_gametype_enum" ADD VALUE IF NOT EXISTS 'POKE_LOUNGE';
  END IF;
END $$;
```

- [x] **Step 4: Run focused and full API verification without a database**

Run: `pnpm --filter @vscoke/api test -- 1793664000000-add-poke-lounge-game-type.spec.ts --runInBand`, `pnpm test:api`, `pnpm --filter @vscoke/api lint`, `pnpm build:api`, and `git diff --check`.

Expected: all commands exit 0; no command uses `migration:run:test` or an E2E database connection.

- [x] **Step 5: Write the CI report and commit**

```bash
git add apps/api/src/migrations/1793664000000-add-poke-lounge-game-type.ts \
  apps/api/src/migrations/1793664000000-add-poke-lounge-game-type.spec.ts \
  docs/superpowers/plans/2026-07-11-ci-game-enum-migration.md \
  .superpowers/sdd/task-5-ci-migration-report.md
git commit -m "fix(api):신규 DB 게임 enum 마이그레이션 보강"
```
