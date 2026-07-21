---
name: follow-vscoke-coding-convention
description: Apply the VSCoke repository's canonical coding convention. Use for any task that creates, modifies, refactors, reviews, or validates code, tests, scripts, configuration, API contracts, frontend components, backend modules, filenames, commits, branches, or worktrees in this repository.
---

# Follow VSCoke Coding Convention

Use the repository document as the sole policy source. Do not duplicate its detailed rules in this
skill.

## Workflow

1. Resolve the repository root with `git rev-parse --show-toplevel`.
2. Read `<repo-root>/docs/coding-convention.md` completely before taking a code-related action.
3. Read `<repo-root>/docs/vscoke-monorepo-concept.md` before frontend, backend, test, hook, or
   monorepo work.
4. Inspect the nearest existing implementation and the applicable formatter, linter, TypeScript,
   and test configuration.
5. Apply the convention only within the requested scope. Do not create unrelated mechanical churn.
6. Run the validation required by the convention's completion matrix in proportion to the change.
7. Report any exception, skipped validation, or mismatch between the convention and executable
   configuration.

## Convention Changes

When changing the convention itself:

- Edit `docs/coding-convention.md` as the policy source.
- Keep `AGENTS.md` and this skill procedural; do not copy detailed convention text into them.
- Update mechanical enforcement only when necessary to match the policy.
- Search for stale active duplicates before finishing. Historical plans may retain their original
  context but are not policy sources.
