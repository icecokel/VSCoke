# Playwright CLI 테스트 흐름 스펙

## 1. 목적

이 문서는 `vscoke` 프로젝트의 E2E 테스트를 `Playwright CLI` 중심으로 운영하기 위한 표준을 정의한다.

- 로컬 개발자가 같은 명령 체계로 테스트를 실행할 수 있어야 한다.
- 테스트 추가 시 파일 위치, 시나리오 분류, 실행 방법이 일관되어야 한다.
- 전체 실행과 단일 시나리오 실행 모두 서버 기동 정책이 명확해야 한다.

이 스펙은 현재 저장소에 이미 존재하는 Playwright 기반 구현을 정식 운영 규칙으로 고정하는 문서다.

## 2. 현재 기준 구현

- 설정 파일: `apps/web/playwright.config.ts`
- 러너 스크립트: `apps/web/scripts/playwright-runner.mjs`
- 전용 서버 스크립트: `apps/web/scripts/playwright-web-server.mjs`
- 테스트 루트: `apps/web/tests/e2e`
- 리포터: `list`, `html`
- 실패 산출물: screenshot, trace, video

현재 프로젝트는 단순 `pnpm exec playwright test`만으로 전체 흐름을 돌리는 구조가 아니라, 서버 자동 기동과 종료를 포함하는 래퍼 스크립트를 함께 사용한다.

## 3. 목표

### 3-1. 필수 목표

- 공식 진입점은 `pnpm e2e:*` 스크립트로 통일한다.
- 전체 E2E, 스모크, 비주얼 갱신, 디버깅, 코드젠 흐름을 명령 단위로 분리한다.
- 로컬에서 서버를 자동 기동하는 흐름과, 이미 떠 있는 서버를 재사용하는 흐름을 모두 지원한다.
- 테스트 파일은 기능 단위 시나리오로 유지하고, 공통 유틸은 `apps/web/tests/e2e/test-helpers.ts`에 모은다.

### 3-2. 비목표

- 이 문서는 API mocking 프레임워크 교체를 다루지 않는다.
- 이 문서는 단위 테스트 도입 전략을 다루지 않는다.
- 이 문서는 전체 cross-browser CI 상시 실행을 강제하지 않는다.

## 4. 공식 실행 흐름

| 목적                | 명령                        | 비고                           |
| ------------------- | --------------------------- | ------------------------------ |
| 브라우저 설치       | `pnpm e2e:install`          | 최초 1회 또는 브라우저 갱신 시 |
| 스모크 검증         | `pnpm e2e:smoke`            | 가장 빠른 핵심 검증            |
| 전체 E2E            | `pnpm e2e`                  | 기본 회귀 검증                 |
| 크로스 브라우저     | `pnpm e2e:cross-browser`    | WebKit, Firefox 포함           |
| 헤디드 디버깅       | `pnpm e2e:headed`           | 로컬 재현용                    |
| UI 모드             | `pnpm e2e:ui`               | 선택 실행 및 디버깅            |
| 코드 생성기         | `pnpm e2e:codegen`          | 셀렉터 탐색용                  |
| 리포트 확인         | `pnpm e2e:report`           | 실패 분석                      |
| 비주얼 기준선 갱신  | `pnpm e2e:update-snapshots` | Chromium 기준선만 갱신         |
| 반복 검증 서버 기동 | `pnpm e2e:server`           | 고정 포트 `37123` 사용         |

## 5. CLI 실행 정책

### 5-1. 기본 원칙

- 전체 테스트 실행은 반드시 `apps/web/scripts/playwright-runner.mjs`를 통해 수행한다.
- 래퍼는 테스트 실행 전 Next 개발 서버를 자동 기동하고, 종료 시 서버를 정리한다.
- 기본 `baseURL`은 격리 포트 기반으로 자동 계산한다.
- 기본 worker 수는 1로 유지한다.

### 5-2. 직접 CLI 실행 허용 조건

아래 조건일 때만 `pnpm exec playwright ...` 직접 실행을 공식 허용한다.

- `pnpm e2e:server`로 이미 서버를 띄운 상태
- 또는 `PLAYWRIGHT_BASE_URL`을 명시적으로 전달한 상태

예시:

```bash
pnpm e2e:server
PLAYWRIGHT_BASE_URL=http://127.0.0.1:37123 pnpm --filter @vscoke/web exec playwright test tests/e2e/history-tabs.spec.ts --project=chromium
```

직접 CLI 실행은 빠른 반복 확인용이며, 전체 회귀의 기본 경로로 사용하지 않는다.

## 6. 테스트 매트릭스 정책

### 6-1. 기본 매트릭스

- `chromium`
- `chromium-mobile-sm`
- `chromium-mobile-md`
- `chromium-mobile-lg`

### 6-2. 확장 매트릭스

환경 변수 `PLAYWRIGHT_ENABLE_CROSS_BROWSER=1`일 때 아래를 추가한다.

- `webkit`
- `firefox`
- `webkit-mobile-*`
- `firefox-mobile-*`

### 6-3. 운영 원칙

- 기본 회귀는 Chromium 계열만 돈다.
- 크로스 브라우저 검증은 릴리즈 전 확인 또는 수동 회귀에 사용한다.
- 비주얼 스냅샷은 Chromium 프로젝트만 기준선으로 사용한다.

## 7. 시나리오 분류 기준

현재 테스트는 아래 범주로 관리한다.

| 범주                 | 현재 파일                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------- |
| 스모크/i18n          | `i18n-integrity.spec.ts`                                                                 |
| 핵심 라우트/CTA      | `core-routes.spec.ts`, `deep-link.spec.ts`                                               |
| 장애 복구/fallback   | `error-fallback.spec.ts`, `capability-fallback.spec.ts`, `not-found-recovery.spec.ts`    |
| API/client 계약      | `api-read-error.spec.ts`, `auth-token.spec.ts`, `server-route-fallback.spec.ts`          |
| 상태 유지            | `history-tabs.spec.ts`, `state-persistence.spec.ts`                                      |
| 접근성/키보드        | `keyboard-only.spec.ts`                                                                  |
| 모바일 동작          | `mobile-behavior.spec.ts`                                                                |
| 레이아웃/비주얼 회귀 | `layout-shift.spec.ts`, `visual-regression.spec.ts`                                      |
| 취미/게임 진입       | `hobby-games.spec.ts`, `hobby-recipes.spec.ts`, `hobby-espresso.spec.ts`                 |
| Poke Lounge          | `poke-lounge.spec.ts`, `poke-lounge-autosave.spec.ts`, `poke-lounge-multiplayer.spec.ts` |
| Resume RAG           | `resume-rag-chat-public.spec.ts`                                                         |
| Analytics            | `google-analytics.spec.ts`, `google-tag-manager.spec.ts`                                 |

신규 테스트는 반드시 위 범주 중 하나에 속해야 하며, 성격이 다르면 새 범주를 문서에 추가한 뒤 도입한다.

## 8. 테스트 파일 작성 규칙

### 8-1. 파일 규칙

- 위치: `tests/e2e/<behavior>.spec.ts`
- 일반 파일명 규칙은 [VSCoke 코딩 컨벤션](./coding-convention.md)을 따른다.
- 하나의 파일은 하나의 사용자 흐름 축을 담당한다.

### 8-2. 구현 규칙

- 라우트 진입은 `gotoWithRetry` 또는 `visit`을 우선 사용한다.
- 로케일 의존 텍스트는 `resolveLocaleAndMessages`와 메시지 JSON을 통해 가져온다.
- 셀렉터는 `getByRole`, `getByTestId`, 의미 있는 locator를 우선 사용한다.
- 상태 공유가 큰 시나리오는 `test.describe.configure({ mode: "serial" })`를 사용한다.
- 테스트 내부에서 외부 API 의존성을 새로 늘리지 않는다.
- 실패 재현을 위해 필요한 mocking은 `page.route` 또는 `page.addInitScript` 수준에서 국소적으로 처리한다.

### 8-3. 금지 규칙

- 임의 `waitForTimeout` 남발 금지
- 화면 문구 하드코딩 금지
- 여러 제품 요구사항을 한 테스트에 과도하게 묶는 방식 금지

## 9. 서버 및 환경 변수 규칙

공식적으로 사용하는 환경 변수는 아래와 같다.

- `PLAYWRIGHT_BASE_URL`
- `PLAYWRIGHT_PORT`
- `PLAYWRIGHT_WORKERS`
- `PLAYWRIGHT_ENABLE_CROSS_BROWSER`
- `PLAYWRIGHT_REUSE_EXISTING_SERVER`
- `NEXT_DIST_DIR`

운영 규칙:

- 자동 실행 시 포트와 dist 디렉토리는 프로세스 단위로 격리한다.
- 반복 검증 서버는 고정 포트 `37123`, 고정 산출물 `.next-e2e`를 사용한다.
- 인증 및 API 주소는 E2E 안전 기본값으로 주입한다.

## 10. 비주얼 회귀 규칙

- 비주얼 테스트는 `visual-regression.spec.ts` 한 곳에서 관리한다.
- 스냅샷 기준선은 Chromium만 유지한다.
- 스냅샷 갱신은 `pnpm e2e:update-snapshots`로만 수행한다.
- 레이아웃이 변하는 UI 변경은 코드 변경과 기준선 갱신을 한 세트로 취급한다.

## 11. 로컬 완료 기준

기능 변경 후 최소 완료 기준은 아래와 같다.

1. 관련 단일 spec 직접 실행 또는 `pnpm e2e:headed`로 로컬 재현이 가능해야 한다.
2. 변경이 핵심 라우트, 상태, i18n, 공유, 게임 UI에 영향을 주면 `pnpm e2e`를 통과해야 한다.
3. 비주얼 영향이 있으면 `pnpm e2e:update-snapshots` 후 변경분을 검토해야 한다.
4. 테스트 실패 시 `playwright-report` 또는 `test-results` 산출물로 원인 확인이 가능해야 한다.

## 12. CI 확장 기준

현재 저장소에는 PR용 focused Playwright 검증이 있다.

`.github/workflows/pull-request-check.yml`의 Web job은 아래 흐름을 따른다.

1. `pnpm install`
2. Chromium 설치
3. `pnpm check:api-contract`
4. `pnpm type:check:web`
5. `pnpm lint:web`
6. `pnpm knip`
7. `pnpm build:web`
8. focused E2E: `i18n-integrity.spec.ts`, `hobby-games.spec.ts`, `keyboard-only.spec.ts`

기본 PR job은 Chromium 기반 focused 회귀만 책임진다. 전체 E2E, visual regression, cross-browser는 로컬 검증 또는 별도 수동 job 후보로 분리한다.

## 13. 수용 기준

이 스펙이 충족되었다고 판단하는 조건은 아래와 같다.

- 팀원이 `README` 없이도 이 문서만 보고 Playwright CLI 실행 방식을 이해할 수 있다.
- 서버 자동 기동 흐름과 직접 CLI 흐름의 차이가 문서상 명확하다.
- 신규 E2E 추가 시 파일 위치, 작성 규칙, 실행 명령을 일관되게 결정할 수 있다.
- 기본 회귀, 디버깅, 비주얼 갱신, 크로스 브라우저 실행 경로가 각각 구분되어 있다.
