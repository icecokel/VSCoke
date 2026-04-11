# VSCoke

VS Code 스타일 인터페이스를 가진 개발자 포트폴리오 웹사이트입니다.

## 소개

VS Code의 UI/UX를 모티브로 파일 탐색기, 메뉴바, 탭 시스템 등을 웹으로 구현한 포트폴리오 사이트입니다.

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **i18n**: next-intl (한국어/영어)

## 시작하기

```bash
# 설치
pnpm install

# 개발 서버
pnpm dev

# 빌드
pnpm build
```

[http://localhost:3000](http://localhost:3000)에서 확인

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
pnpm exec playwright test tests/e2e/i18n-integrity.spec.ts --project=chromium
pnpm exec playwright test tests/e2e/history-tabs.spec.ts --project=chromium

# 리포트 확인
pnpm e2e:report

# 코드 생성기
pnpm e2e:codegen
```

- 자동 E2E 실행은 충돌을 줄이기 위해 프로세스별 격리 포트와 프로세스별 `NEXT_DIST_DIR` 산출물을 사용합니다.
- `pnpm e2e`, `pnpm e2e:smoke`, `pnpm e2e:codegen`은 서버를 자동으로 올리고 종료합니다.
- `pnpm exec playwright test ...` 같은 직접 CLI 실행은 이미 떠 있는 서버를 대상으로 사용합니다.
- 기본 프로젝트는 `chromium` + 모바일 크로미움 3종이며, 기본 worker 수는 1입니다.
- 웹킷/파이어폭스까지 포함하려면 `pnpm e2e:cross-browser` 또는 `PLAYWRIGHT_ENABLE_CROSS_BROWSER=1 pnpm e2e`를 사용합니다.
- worker 수를 늘리려면 `PLAYWRIGHT_WORKERS=2 pnpm e2e`처럼 실행하면 됩니다.
- 반복 검증이나 수동 CLI 사용은 `pnpm e2e:server` 뒤에 `pnpm exec playwright test ...` 또는 `PLAYWRIGHT_BASE_URL=http://127.0.0.1:37123 pnpm exec playwright test ...` 형태로 재사용하면 됩니다.
  이 경로는 고정 포트 `37123`과 `.next-e2e` 산출물을 사용합니다.
- 비주얼 스냅샷 기준선은 현재 `chromium` 프로젝트만 사용하며, 파일명은 플랫폼과 무관하게 공유됩니다.
- 스냅샷 갱신은 `pnpm e2e:update-snapshots` 로 수행합니다.

---

**Built with ❤️ using Next.js 15 & Tailwind CSS v4**
