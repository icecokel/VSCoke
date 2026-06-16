# VSCoke

VS Code 스타일 인터페이스를 가진 개발자 포트폴리오 웹사이트와 NestJS API를 함께 관리하는 pnpm workspace monorepo입니다.

## 소개

VSCoke는 Next.js 웹 앱과 NestJS API를 하나의 저장소에서 관리한다. 저장소는 하나지만 배포 환경은 앱별로 분리된다.

```txt
apps/web -> Vercel
apps/api -> GitHub Actions self-hosted runner on Termux -> PM2 -> Cloudflare Tunnel
```

## 구조

```txt
vscoke/
├─ apps/
│  ├─ web/      # Next.js frontend
│  └─ api/      # NestJS backend
├─ packages/
│  ├─ api-types/
│  └─ config/
├─ docs/
├─ package.json
└─ pnpm-workspace.yaml
```

루트 `package.json`은 workspace 공통 명령을 담당한다. 각 앱의 의존성과 앱 전용 명령은 `apps/web/package.json`, `apps/api/package.json`에서 관리한다.

## 기술 스택

- **Monorepo**: pnpm workspace
- **Frontend**: Next.js 15 (App Router)
- **Backend**: NestJS 11
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **i18n**: next-intl (한국어/영어)

## 시작하기

```bash
pnpm install
pnpm dev
PORT=3001 pnpm dev:api
pnpm build
```

웹 개발 서버는 [http://localhost:3000](http://localhost:3000)에서 확인한다.

웹 앱만 직접 실행할 때는 아래 명령을 사용할 수 있습니다.

```bash
pnpm --filter @vscoke/web dev
pnpm --filter @vscoke/web build
pnpm --filter @vscoke/api build
pnpm --filter @vscoke/api start:dev
```

자세한 로컬 실행 방식은 [Local Development](docs/local-development.md)를 기준으로 한다.

## 환경 변수

웹 앱 빌드에는 API 서버 주소가 필요합니다.

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

로컬에서 API 서버 없이 빌드만 확인할 때는 임시 값으로 실행할 수 있습니다.

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 pnpm build
```

배포와 환경 변수 운영 기준은 [Deployment and Environment Plan](docs/deployment-and-env.md)을 따릅니다.

- 웹(`apps/web`)은 Vercel 프로젝트의 Root Directory를 `apps/web`으로 설정해 배포합니다.
- 웹 로컬 환경은 `apps/web/.env.example`, API 로컬 환경은 `apps/api/.env.example`을 복사해 시작합니다.
- API(`apps/api`)는 GitHub Actions가 Termux 서버의 `~/projects/vscoke-api`로 배포하고 PM2로 실행합니다.
- 웹 환경 변수는 Vercel Project Settings에서, API 운영 환경 변수는 Termux 서버의 `.env`에서 관리합니다.

## 문서

- [Monorepo Concept](docs/vscoke-monorepo-concept.md): monorepo 구조와 배포 컨셉
- [Local Development](docs/local-development.md): 로컬 실행, 환경 변수, DB tunnel
- [Operations Runbook](docs/operations-runbook.md): 배포 실패와 운영 장애 대응
- [Deployment and Environment Plan](docs/deployment-and-env.md): 배포/환경 변수 상세 기준
- [API Git History Report](docs/api-git-history-report.md): 기존 API 저장소 이력 이전 검토

## 테스트

Playwright 기반 E2E 테스트는 `pnpm e2e`로 실행합니다.

```bash
# 브라우저 설치
pnpm e2e:install

# 가장 작은 스모크 테스트
pnpm e2e:smoke

# 전체 E2E
pnpm e2e

# 웹킷/파이어폭스 포함 전체 매트릭스
pnpm e2e:cross-browser

# 반복 검증용 로컬 서버
pnpm e2e:server

# 특정 시나리오만 실행
pnpm --filter @vscoke/web exec playwright test tests/e2e/i18n-integrity.spec.ts --project=chromium
pnpm --filter @vscoke/web exec playwright test tests/e2e/history-tabs.spec.ts --project=chromium

# 리포트 확인
pnpm e2e:report

# 코드 생성기
pnpm e2e:codegen
```

- 자동 E2E 실행은 충돌을 줄이기 위해 프로세스별 격리 포트와 프로세스별 `NEXT_DIST_DIR` 산출물을 사용합니다.
- `pnpm e2e`, `pnpm e2e:smoke`, `pnpm e2e:codegen`은 서버를 자동으로 올리고 종료합니다.
- `pnpm --filter @vscoke/web exec playwright test ...` 같은 직접 CLI 실행은 이미 떠 있는 서버를 대상으로 사용합니다.
- 기본 프로젝트는 `chromium` + 모바일 크로미움 3종이며, 기본 worker 수는 1입니다.
- 웹킷/파이어폭스까지 포함하려면 `pnpm e2e:cross-browser` 또는 `PLAYWRIGHT_ENABLE_CROSS_BROWSER=1 pnpm e2e`를 사용합니다.
- worker 수를 늘리려면 `PLAYWRIGHT_WORKERS=2 pnpm e2e`처럼 실행하면 됩니다.
- 반복 검증이나 수동 CLI 사용은 `pnpm e2e:server` 뒤에 `pnpm --filter @vscoke/web exec playwright test ...` 또는 `PLAYWRIGHT_BASE_URL=http://127.0.0.1:37123 pnpm --filter @vscoke/web exec playwright test ...` 형태로 재사용하면 됩니다.
  이 경로는 고정 포트 `37123`과 `.next-e2e` 산출물을 사용합니다.
- 비주얼 스냅샷 기준선은 현재 `chromium` 프로젝트만 사용하며, 파일명은 플랫폼과 무관하게 공유됩니다.
- 스냅샷 갱신은 `pnpm e2e:update-snapshots` 로 수행합니다.

## 작업 기준

- 새 웹 작업은 `apps/web`에서 진행한다.
- 새 API 작업은 `apps/api`에서 진행한다.
- API 계약이 바뀌면 Swagger/OpenAPI와 프론트 타입 갱신을 함께 확인한다.
- 운영 비밀값은 Git에 커밋하지 않는다.
