# Task 5 CI Migration Report

## Status

`DONE_WITH_CONCERNS`

## Evidence

GitHub Actions run `29105454358` applied migrations to a fresh PostgreSQL database. `CreateResumeRagTables1760000000000` succeeded, then `AddPokeLoungeGameType1793664000000` failed with PostgreSQL error `42704`: `type "game_history_gametype_enum" does not exist`. The API integration and E2E stage was skipped after that migration failure.

The migration previously executed only:

```sql
ALTER TYPE "game_history_gametype_enum" ADD VALUE IF NOT EXISTS 'POKE_LOUNGE'
```

No earlier repository migration creates the TypeORM enum. The current `GameType` source of truth contains exactly `SKY_DROP` and `POKE_LOUNGE`.

## Change

`AddPokeLoungeGameType1793664000000` now executes a PostgreSQL `DO` block:

- When `to_regtype('game_history_gametype_enum')` is `NULL`, it creates `game_history_gametype_enum` with `SKY_DROP` and `POKE_LOUNGE`.
- When the enum already exists, it only runs `ADD VALUE IF NOT EXISTS 'POKE_LOUNGE'`.

This retains the historical migration identifier for databases that already recorded it. It does not enable `synchronize`, connect to an implicit database, drop objects, rewrite enum-backed tables, or recreate production schema.

## Test Evidence

The query-runner capture spec was written before the migration change. It failed against the previous SQL because neither the missing-enum creation branch nor the existing-enum branch existed. After the change, both focused cases pass without a database connection:

```text
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

The final local non-DB verification also passed:

```text
pnpm test:api: 37 suites, 219 tests passed
pnpm --filter @vscoke/api lint: passed
pnpm build:api: passed
git diff --check: passed
```

## Remaining Concern

No local PostgreSQL connection, migration execution, integration test, or E2E test was run, by request. The actual PostgreSQL parser and fresh-database migration sequence must rerun in GitHub Actions before this result can be considered fully verified.

## Follow-up: Legacy Core Baseline

GitHub Actions run `29106614573` passed the enum migration, then failed in `CreateGamePokeLoungeState1793750400000` with PostgreSQL error `42P01` because its foreign key references the absent `user` table. The historical `user` and `game_history` schema was created outside tracked migrations.

The test data source now prepends a test-only migration glob. Its timestamped baseline creates the legacy `user` table, the historical `game_history_gametype_enum` containing only `SKY_DROP`, and the minimal `game_history` table with its UUID default, user foreign key, and user-ID index. Production `data-source.ts` continues to load only `src/migrations` and does not include the bootstrap.

The existing enum migration remains unchanged: after the baseline it adds `POKE_LOUNGE`, and it still creates the current enum values when a type is otherwise absent.

Local non-DB verification for this follow-up passed:

```text
Focused data-source and baseline tests: 3 suites, 20 tests passed
pnpm test:api: 38 suites, 220 tests passed
pnpm --filter @vscoke/api lint: passed
pnpm build:api: passed
git diff --check: passed
```

The fresh PostgreSQL migration run and integration/E2E stages still require a GitHub Actions rerun.
