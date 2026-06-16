# VSCoke

VS Code 스타일 인터페이스를 가진 개발자 포트폴리오 웹사이트입니다.

## 소개

VS Code의 UI/UX를 모티브로 파일 탐색기, 메뉴바, 탭 시스템 등을 웹으로 구현한 포트폴리오 사이트입니다.

## 구조

```txt
vscoke/
  apps/
    web/      # Next.js 프론트엔드
    api/      # NestJS 백엔드
  packages/
    api-types/
    config/
```

## 기술 스택

- **Monorepo**: pnpm workspace
- **Frontend**: Next.js 15 (App Router)
- **Backend**: NestJS 11
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **i18n**: next-intl (한국어/영어)

## 시작하기

```bash
# 설치
pnpm install

# 개발 서버
pnpm dev
pnpm dev:api

# 빌드
pnpm build
```

[http://localhost:3000](http://localhost:3000)에서 확인

웹 앱만 직접 실행할 때는 아래 명령을 사용할 수 있습니다.

```bash
pnpm --filter @vscoke/web dev
pnpm --filter @vscoke/web build
pnpm --filter @vscoke/api start:dev
pnpm --filter @vscoke/api build
```

## 환경 변수

웹 앱 빌드에는 API 서버 주소가 필요합니다.

```env
NEXT_PUBLIC_API_URL=https://api.icecoke.kr
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

---

**Built with ❤️ using Next.js 15 & Tailwind CSS v4**
