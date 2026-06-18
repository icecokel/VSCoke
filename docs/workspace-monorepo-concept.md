# Workspace Monorepo Concept

## Purpose

이 문서는 VSCoke 작업 공간을 볼 때 프론트엔드와 백엔드 위치를 혼동하지 않기 위한 기준 문서다.
백엔드 코드는 별도 외부 저장소가 아니라 이 모노레포 workspace 안에서 관리한다.

## Source Of Truth

- 실제 작업 기준 저장소는 `vscoke` 모노레포다.
- workspace 패키지는 `pnpm-workspace.yaml`의 `apps/*`, `packages/*` 기준을 따른다.
- 웹 프론트엔드는 `apps/web`에 있으며 패키지명은 `@vscoke/web`이다.
- 백엔드는 `apps/api`에 있으며 패키지명은 `@vscoke/api`다.
- 루트 `package.json`의 `pnpm --filter @vscoke/...` scripts를 우선 사용한다.

## Directory Map

```txt
vscoke/
  package.json
  pnpm-workspace.yaml
  apps/
    web/      # Next.js frontend, @vscoke/web
    api/      # NestJS backend, @vscoke/api
```

`packages/*`는 workspace glob으로 예약되어 있지만, 실제 패키지가 없으면 빈 placeholder 파일을 두지 않는다.

## Backend Rule

백엔드 작업, API 테스트, DB/API 계약 확인, NestJS 코드 수정은 반드시 `apps/api`에서 수행한다.
외부 경로의 `vscoke-api` 같은 디렉토리는 이 workspace의 백엔드 작업 대상으로 간주하지 않는다.

외부 배포 서버나 과거 분리 repo가 존재하더라도, 코드 변경의 기준은 모노레포의 `apps/api`다.
별도 경로를 확인해야 할 때는 사용자가 명시적으로 요청한 경우에만 읽기 위주로 확인한다.

## Frontend Rule

웹 작업, Next.js 라우트, Playwright e2e, 시각 회귀 스냅샷은 `apps/web`에서 수행한다.
루트 명령이 있으면 직접 `apps/web`으로 들어가기보다 루트 script를 먼저 사용한다.

## Commands

루트에서 실행하는 기본 명령:

```bash
pnpm type:check
pnpm test:api
pnpm test:api:e2e
pnpm build
pnpm e2e
```

패키지 단위로 좁혀야 할 때:

```bash
pnpm --filter @vscoke/web type:check
pnpm --filter @vscoke/web e2e
pnpm --filter @vscoke/api test
pnpm --filter @vscoke/api test:e2e
pnpm --filter @vscoke/api build
```

## Pre-push Concept

push 전 검증은 루트 `.husky/pre-push` 한 곳에서 관리한다.
FE와 BE를 각각 별도 repo hook으로 분리하지 않는다.
테스트나 빌드가 하나라도 실패하면 push는 중단되어야 한다.

## Before Editing Checklist

작업을 시작하기 전에 다음을 확인한다.

```bash
git rev-parse --show-toplevel
test -f pnpm-workspace.yaml
test -f apps/web/package.json
test -f apps/api/package.json
```

`apps/api`가 없다면 현재 위치는 모노레포 기준 작업 위치가 아니므로 백엔드 코드를 외부 repo에서 수정하지 않는다.
이 경우 올바른 worktree나 브랜치를 먼저 확인한다.

## Agent Behavior

- "BE", "backend", "API", "Nest", "DB", "Swagger" 요청은 기본적으로 `apps/api`를 본다.
- "FE", "frontend", "web", "Next", "Playwright", "UI" 요청은 기본적으로 `apps/web`을 본다.
- 루트 hook, 공통 scripts, workspace 정책은 모노레포 루트에서 수정한다.
- `/Users/smlee/vscoke-api` 같은 외부 경로를 코드 변경 대상으로 삼지 않는다.
