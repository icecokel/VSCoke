# VSCoke 전체 기능 E2E 테스트 시나리오

## 1. 문서 목적

이 문서는 VSCoke Web, API, PostgreSQL, 인증, 실시간 통신을 포함한 전체 사용자 기능의 E2E 검증 기준을 정의한다. 현재 Playwright와 API E2E에서 자동화된 범위뿐 아니라, 전체 기능 검증을 위해 추가해야 할 시나리오와 수동 검증 범위까지 하나의 기준으로 관리한다.

이 문서의 "전체 기능"은 현재 저장소에 구현된 공개 화면, 사용자 상호작용, API 계약, 저장과 복구, 실시간 경쟁 흐름, 반응형·접근성·다국어·분석 기능을 의미한다. 가능한 모든 입력 조합을 뜻하지는 않으며, 각 기능의 정상 경로, 주요 경계값, 권한 경계, 복구 경로를 최소 한 번 이상 검증하는 것을 완료 기준으로 삼는다.

기준 구현:

- Web: `apps/web`
- API: `apps/api`
- 공유 전투 엔진: `packages/poke-lounge-battle`
- Web E2E: `apps/web/tests/e2e`
- API E2E/통합: `apps/api/test`
- 브라우저 설정: `apps/web/playwright.config.ts`

## 2. 테스트 상태와 우선순위

### 2.1 상태 표기

| 표기 | 의미                                          |
| ---- | --------------------------------------------- |
| `A`  | 현재 자동화되어 있음                          |
| `P`  | 일부만 자동화되어 보강 필요                   |
| `N`  | 신규 자동화 필요                              |
| `M`  | 운영 환경 또는 사람의 판단이 필요한 수동 검증 |

### 2.2 우선순위

| 우선순위 | 실행 시점                               | 실패 처리                 |
| -------- | --------------------------------------- | ------------------------- |
| `P0`     | 모든 PR, 배포 전                        | 배포 중단                 |
| `P1`     | main 반영 전 또는 일일 전체 회귀        | 원인 확인 후 승인 필요    |
| `P2`     | 릴리즈 후보, 크로스 브라우저, 정기 점검 | 알려진 제약으로 기록 가능 |

## 3. 테스트 환경

### 3.1 환경 매트릭스

| 환경       | 목적                            | Web                         | API                           | DB                      | 외부 서비스                  |
| ---------- | ------------------------------- | --------------------------- | ----------------------------- | ----------------------- | ---------------------------- |
| UI 격리    | 화면 상태와 오류 UI 검증        | 로컬 Next.js                | Playwright route interception | 없음                    | 없음                         |
| 로컬 통합  | 실제 요청·저장·Socket 검증      | 로컬 Next.js                | 로컬 NestJS                   | 격리 PostgreSQL `_test` | Google 인증은 테스트 토큰    |
| 운영 smoke | 배포·도메인·CORS·정적 에셋 확인 | `https://vscoke.icecoke.kr` | `https://api.icecoke.kr`      | 운영 DB                 | 실제 OAuth/Cloudflare/Vercel |

UI 격리 테스트의 route interception은 오류 상태를 재현하기 위한 테스트 장치다. 실제 API 통합 성공을 대신하지 않는다. 전체 기능 완료 판정에는 로컬 통합 또는 운영 smoke 결과가 함께 있어야 한다.

### 3.2 브라우저와 뷰포트

| 그룹          | 브라우저/디바이스 | 뷰포트                | 범위                       |
| ------------- | ----------------- | --------------------- | -------------------------- |
| Desktop 기본  | Chromium          | Desktop Chrome 기본값 | 모든 P0/P1                 |
| Desktop 호환  | Firefox, WebKit   | Desktop 기본값        | P0와 주요 게임             |
| Mobile small  | Chromium, WebKit  | 360x780               | 메뉴, 게임, 모달, overflow |
| Mobile medium | Chromium, WebKit  | 390x844               | 기본 모바일 회귀           |
| Mobile large  | Chromium, WebKit  | 430x932               | 넓은 모바일 회귀           |

Firefox mobile emulation은 터치 동작 참고용으로만 사용한다. 실제 iOS Safari 판정은 WebKit 또는 실기기 결과를 우선한다.

### 3.3 필수 계정과 데이터

| 식별자    | 준비 내용                                             | 사용 시나리오             |
| --------- | ----------------------------------------------------- | ------------------------- |
| `USER_A`  | Google 인증 가능한 테스트 계정, Poke Lounge 파티 보유 | 로그인, 저장, 경쟁전 host |
| `USER_B`  | `USER_A`와 다른 Google 계정                           | 경쟁전 guest              |
| `USER_C`  | 선택적 세 번째 계정 또는 익명 참가자                  | 3인 casual 강등           |
| `ANON`    | 쿠키·스토리지가 비어 있는 context                     | 공개 화면, 익명 게임      |
| `DB_BASE` | migration 완료, Wordle 단어·레시피·원두 fixture       | API 정상 경로             |
| `DB_GAME` | ranking과 공유 결과 fixture                           | 점수·랭킹·공유            |
| `DB_ROOM` | 테스트 시작 시 active room 없음                       | Poke Lounge room          |

테스트 데이터는 반복 실행 가능해야 한다. 고정 UUID, 고정 room code 또는 테스트 전용 seed를 사용하고, 테스트 종료 시 생성 데이터와 room을 정리한다. 운영 smoke에서는 쓰기 작업을 최소화하고 테스트 전용 계정과 식별자를 사용한다.

### 3.4 공통 사전조건

1. Node.js, pnpm, Playwright 브라우저가 설치되어 있다.
2. 로컬 통합 실행 시 PostgreSQL과 migration이 준비되어 있다.
3. `NEXT_PUBLIC_API_URL`은 실행하려는 API 환경을 정확히 가리킨다.
4. 인증 시나리오는 테스트 계정과 토큰을 로그나 artifact에 노출하지 않는다.
5. 각 테스트는 독립된 browser context를 사용하고 필요한 storage만 명시적으로 주입한다.

### 3.5 구현 범위 인벤토리

Web route:

| 영역            | 경로                                                         | 주요 검증 섹션 |
| --------------- | ------------------------------------------------------------ | -------------- |
| 홈              | `/:locale`                                                   | 5, 6           |
| README          | `/:locale/readme`                                            | 6, 7           |
| 이력서          | `/:locale/resume/:slug`                                      | 6              |
| 이력 질문       | `/:locale/resume/question`                                   | 7              |
| 패키지          | `/:locale/package`                                           | 6              |
| 블로그          | `/:locale/blog`, `/:locale/blog/:slug`                       | 8              |
| 블로그 대시보드 | `/:locale/blog/dashboard`                                    | 8              |
| 게임 센터       | `/:locale/game`                                              | 11             |
| Sky Drop        | `/:locale/game/sky-drop`                                     | 12, 19         |
| Wordle          | `/:locale/game/wordle`                                       | 13             |
| Poke Lounge     | `/:locale/game/poke-lounge`                                  | 14~18          |
| 에스프레소      | `/:locale/hobby/espresso`, `/:locale/hobby/espresso/:beanId` | 9              |
| 레시피          | `/:locale/hobby/recipes`                                     | 10             |
| 공유 결과       | `/:locale/share/:id`, `/:locale/share/:id/opengraph-image`   | 19, 22         |
| Auth.js         | `/api/auth/[...nextauth]`                                    | 20             |
| 취미 검색 집계  | `/api/hobby-search-index`                                    | 5, 10          |
| 검색엔진 파일   | `/robots.txt`, `/sitemap.xml`                                | 22             |

API endpoint:

| 모듈          | 경로                                                                                | 주요 검증 섹션 |
| ------------- | ----------------------------------------------------------------------------------- | -------------- |
| App           | `GET /`, `GET /health`                                                              | 21             |
| OpenAPI       | `GET /api-json`                                                                     | 21             |
| Recipe        | `GET /recipes`, `GET /recipes/:id`                                                  | 10, 21         |
| Espresso      | `GET /espresso-history/beans`, `GET /espresso-history/beans/:id`                    | 9, 21          |
| Wordle        | `GET /wordle/word`, `POST /wordle/check`                                            | 13, 21         |
| Game result   | `POST /game/result`, `GET /game/ranking`, `GET /game/result/:id`                    | 11, 19, 21     |
| Poke state    | `GET /game/poke-lounge/state`, `PUT /game/poke-lounge/state`                        | 17, 21         |
| Poke room     | `POST /poke-lounge/rooms`, `GET /poke-lounge/rooms/:roomCode`                       | 18, 21         |
| Poke mutation | `competitive-seat`, `actions`, `join`, `ready`, `party-snapshot`, `result`, `leave` | 18, 21         |
| Poke Socket   | namespace `/poke-lounge`, snapshot subscribe/broadcast                              | 18, 21         |
| Resume RAG    | `POST /resume-rag/chat`                                                             | 7, 21          |

## 4. 공통 실행 명령

```bash
# Web 기본 전체 회귀
pnpm e2e

# 로컬 PostgreSQL fixture와 실제 API를 사용하는 취미 통합 회귀
TEST_DATABASE_URL=postgresql://<user>@127.0.0.1:5432/vscoke_web_test pnpm e2e:integration

# Desktop 및 mobile 크로스 브라우저
pnpm e2e:cross-browser

# API unit, PostgreSQL integration, HTTP/Socket E2E
pnpm test:api
pnpm test:api:e2e

# 계약, 타입, 정적 검증
pnpm check:api-contract
pnpm type:check:web
pnpm lint
pnpm knip
pnpm build

# 운영 연결 smoke
pnpm smoke:api:remote
```

실패 조사 시 `PLAYWRIGHT_WORKERS=1`을 유지하고, `--grep`으로 단일 시나리오를 재현한다. Playwright artifact는 HTML report, 첫 재시도 trace, 실패 screenshot, 실패 video를 기준 증적으로 사용한다.

## 5. 전역 셸·탐색·다국어

| ID         | 우선순위/상태 | 사전조건             | 절차                                                              | 기대 결과                                                                |
| ---------- | ------------- | -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `NAV-001`  | P0/A          | `ANON`               | `/ko-KR` 직접 진입                                                | 홈이 200으로 렌더되고 메뉴바·사이드바·히스토리 영역이 초기화된다.        |
| `NAV-002`  | P0/A          | 홈                   | Hero의 README와 Game CTA를 각각 클릭                              | locale을 유지한 `/readme`, `/game` 탭이 열리고 활성 탭과 URL이 일치한다. |
| `NAV-003`  | P0/A          | 홈                   | Quick Launch의 README, Blog, Dashboard, Game 카드를 순서대로 클릭 | 모든 목적지가 올바른 탭 제목과 경로로 열린다.                            |
| `NAV-004`  | P0/A          | 셸 표시              | 메뉴바의 모든 CTA 실행                                            | 각 CTA가 중복 탭을 만들지 않고 대응 화면으로 이동한다.                   |
| `NAV-005`  | P0/A          | 셸 표시              | 사이드바 트리를 펼치고 모든 공개 항목 실행                        | 트리 선택, URL, 활성 히스토리 탭이 일치한다.                             |
| `NAV-006`  | P0/A          | 두 개 이상 탭        | 탭 전환, 중간 탭 닫기, 활성 탭 닫기                               | 마지막 사용 가능한 탭이 규칙대로 활성화되고 URL이 갱신된다.              |
| `NAV-007`  | P0/A          | 탭 생성 완료         | 새로고침 후 브라우저 재진입                                       | history/localStorage 상태와 활성 탭이 복원된다.                          |
| `NAV-008`  | P0/A          | `ANON`               | 존재하지 않는 locale 내부 경로 진입                               | 404 화면 또는 유효 탭으로 복구되고 잘못된 탭은 history에서 제거된다.     |
| `NAV-009`  | P0/A          | 상세 화면            | 브라우저 뒤로/앞으로 실행                                         | URL, 화면, 활성 탭이 browser history와 일치한다.                         |
| `NAV-010`  | P0/A          | 검색 패널            | 화면명, 블로그 제목, 원두, 레시피 검색                            | 결과가 분류되어 표시되고 선택 시 정확한 상세 화면으로 이동한다.          |
| `NAV-011`  | P1/N          | 검색 패널            | 공백, 특수문자, 존재하지 않는 검색어 입력                         | 오류 없이 빈 상태를 표시하고 이전 결과가 남지 않는다.                    |
| `I18N-001` | P0/A          | 메시지 파일          | ko-KR, en-US, ja-JP key 구조 비교                                 | key, 배열 구조, 필수 이력 문구가 모든 locale에서 일치한다.               |
| `I18N-002` | P0/A          | `/ko-KR`             | locale을 en-US, ja-JP로 변경                                      | 같은 논리 경로에서 텍스트와 URL locale만 변경된다.                       |
| `I18N-003` | P0/A          | locale 변경 완료     | 새로고침 후 `/` 진입                                              | locale cookie가 유지되고 `/`가 저장된 locale로 redirect된다.             |
| `I18N-004` | P1/N          | 각 locale            | 전체 주요 화면에서 제목, 버튼, 빈 상태 확인                       | 번역 key가 그대로 노출되지 않고 레이아웃 overflow가 없다.                |
| `LINK-001` | P0/A          | `ANON`               | 블로그 상세, 이력서 상세, 원두 상세, 각 게임을 URL로 직접 진입    | 셸과 상세 콘텐츠가 함께 렌더되고 hydration 오류가 없다.                  |
| `LINK-002` | P1/A          | Web Share API 미지원 | 공유 링크 버튼 실행                                               | clipboard fallback이 동작하고 성공 또는 실패 안내가 명확하다.            |
| `LINK-003` | P1/N          | QR 지원 화면         | QR dialog 열기, 닫기, 재열기                                      | 현재 canonical URL의 QR이 표시되고 focus가 dialog 안에서 관리된다.       |

현재 자동화 매핑: `core-routes.spec.ts`, `history-tabs.spec.ts`, `state-persistence.spec.ts`, `not-found-recovery.spec.ts`, `deep-link.spec.ts`, `i18n-integrity.spec.ts`, `capability-fallback.spec.ts`.

## 6. 홈·README·이력서·패키지

| ID            | 우선순위/상태 | 사전조건         | 절차                                   | 기대 결과                                                         |
| ------------- | ------------- | ---------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `HOME-001`    | P0/A          | 홈               | Hero, 설명, 4개 Quick Launch 카드 확인 | 핵심 텍스트와 CTA가 표시되고 카드가 겹치거나 잘리지 않는다.       |
| `HOME-002`    | P1/N          | 네트워크 관찰    | CTA hover/focus 후 클릭                | 목적지 prefetch가 발생하고 클릭 navigation은 한 번만 실행된다.    |
| `README-001`  | P0/A          | `/readme`        | 프로필, 경력, 기술, 링크 영역 스크롤   | 모든 주요 섹션이 렌더되고 외부 링크 속성이 안전하다.              |
| `README-002`  | P0/A          | README           | 이력서 CTA 선택                        | 선택한 slug의 `/resume/:slug`로 이동하고 정확한 문서가 표시된다.  |
| `README-003`  | P1/N          | README           | 블로그·프로젝트·연락 링크 실행         | 내부 링크는 탭 셸을 사용하고 외부 링크는 새 context에서 열린다.   |
| `RESUME-001`  | P0/A          | 유효 slug        | 이력서 상세 직접 진입                  | 제목, 회사/프로젝트, 기간, 본문이 slug와 일치한다.                |
| `RESUME-002`  | P1/N          | 잘못된 slug      | `/resume/not-existing` 진입            | 서버 500 없이 404 또는 안전한 복구 화면을 표시한다.               |
| `RESUME-003`  | P1/N          | 상세 화면        | 공유 링크·QR, 뒤로 가기 실행           | 공유 URL이 현재 slug를 포함하고 이전 탭으로 복귀한다.             |
| `PACKAGE-001` | P0/A          | `/package`       | package JSON 트리 확인                 | object, array, string, number가 유효한 구조로 표시된다.           |
| `PACKAGE-002` | P2/A          | Desktop snapshot | package 화면 visual 비교               | 긴 dependency 이름이 컨테이너를 깨지 않고 기준 이미지와 일치한다. |

현재 자동화 매핑: `core-routes.spec.ts`, `deep-link.spec.ts`, `visual-regression.spec.ts`.

## 7. Resume RAG 공개 질문

| ID        | 우선순위/상태 | 사전조건            | 절차                               | 기대 결과                                                                                 |
| --------- | ------------- | ------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `RAG-001` | P0/A          | 비로그인 README     | 질문 입력 후 답변 보기 선택        | 질문이 임시 저장되고 `/resume/question`에서 자동 제출 또는 준비 상태로 표시된다.          |
| `RAG-002` | P0/A          | 비로그인 질문 화면  | 새 질문 입력·전송                  | Authorization 없이 공개 API를 호출하고 로딩 후 답변을 표시한다.                           |
| `RAG-003` | P1/A          | 성공 fixture        | source가 있는 답변 수신            | 답변, topic, source 제목, 유사도, source link가 표시된다.                                 |
| `RAG-004` | P1/A          | 낮은 신뢰 fixture   | 질문 전송                          | 낮은 신뢰 안내와 빈 근거 상태가 오해 없이 표시된다.                                       |
| `RAG-005` | P1/A          | API 429             | 질문 전송 후 재시도                | 같은 질문이 보존되고 재시도 버튼으로 다시 전송된다.                                       |
| `RAG-006` | P1/A          | origin 차단 응답    | 질문 전송                          | origin 안내를 표시하고 무의미한 재시도 버튼은 제공하지 않는다.                            |
| `RAG-007` | P1/A          | 계약 불일치 응답    | 질문 전송 후 재시도                | 응답 형식 오류를 구분해 안내하고 재시도가 가능하다.                                       |
| `RAG-008` | P1/A          | 깨진 chatId/storage | 질문 화면 직접 진입                | 예외 없이 빈 composer로 fallback한다.                                                     |
| `RAG-009` | P1/A          | 질문 화면           | response header 확인               | API origin이 CSP `connect-src`에 허용되고 불필요한 wildcard가 없다.                       |
| `RAG-010` | P1/N          | 로컬 API+DB         | 실제 저장 문서에 대한 질문         | 답변과 source가 DB 검색 결과에 기반하고 source 제목·내용·유사도가 실제 record와 대응한다. |
| `RAG-011` | P2/N          | 연속 질문           | 빈 질문, 최대 길이, 빠른 중복 제출 | validation이 동작하고 요청이 중복 생성되지 않는다.                                        |

현재 자동화 매핑: `resume-rag-chat-public.spec.ts`. `RAG-010`은 실 API·DB 통합 suite로 추가해야 한다.

## 8. 블로그

| ID         | 우선순위/상태 | 사전조건          | 절차                                        | 기대 결과                                                |
| ---------- | ------------- | ----------------- | ------------------------------------------- | -------------------------------------------------------- |
| `BLOG-001` | P0/A          | `/blog`           | 목록, 설명, tag, 게시물 카드 확인           | 게시물 수와 tag가 source content와 일치한다.             |
| `BLOG-002` | P0/A          | 목록              | tag 선택과 해제                             | 해당 tag 게시물만 필터되고 URL/상태가 일관된다.          |
| `BLOG-003` | P0/A          | 목록              | 게시물 카드 선택                            | slug 상세로 이동하고 제목·날짜·본문이 렌더된다.          |
| `BLOG-004` | P1/N          | 상세              | heading, code block, link, image, 목록 확인 | MDX 요소가 의미 구조와 스타일을 유지한다.                |
| `BLOG-005` | P1/N          | 목록/상세         | 공유 링크와 QR 실행                         | 현재 페이지 URL이 복사되고 QR dialog가 키보드로 닫힌다.  |
| `BLOG-006` | P0/A          | `/blog/dashboard` | 통계와 전체 게시물 확인                     | Total Posts와 실제 목록 개수가 일치한다.                 |
| `BLOG-007` | P0/A          | Dashboard         | 제목·tag·본문 검색                          | 대소문자와 부분 문자열에 맞는 결과만 표시된다.           |
| `BLOG-008` | P1/N          | Dashboard         | 검색 초기화와 빈 결과                       | 전체 목록 복귀와 빈 상태가 정확하다.                     |
| `BLOG-009` | P1/A          | 셸                | 사이드바/검색/홈에서 Blog·Dashboard 진입    | 각 경로와 탭 이름이 일치한다.                            |
| `BLOG-010` | P2/N          | metadata 검사     | 목록·상세·Dashboard head 확인               | title/description이 locale에 맞고 Dashboard는 noindex다. |

현재 자동화 매핑: `core-routes.spec.ts`, `visual-regression.spec.ts`, `deep-link.spec.ts`.

## 9. 취미: 에스프레소

| ID        | 우선순위/상태 | 사전조건         | 절차                                           | 기대 결과                                                         |
| --------- | ------------- | ---------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `ESP-001` | P0/A          | API bean fixture | `/hobby/espresso` 진입                         | 원두 카드가 이름, 로스터, 상태 정보와 함께 표시된다.              |
| `ESP-002` | P0/A          | bean 목록        | 카드 선택                                      | `/hobby/espresso/:beanId`로 이동하고 선택 bean의 log가 표시된다.  |
| `ESP-003` | P1/A          | 상세 log fixture | current, next, guide, history 항목 전환        | 선택 항목의 레시피·추출값·평가가 navigation tree와 일치한다.      |
| `ESP-004` | P1/N          | 여러 log         | 이전/다음 log 이동                             | 경계에서 잘못 이동하지 않고 선택 상태와 URL이 유지된다.           |
| `ESP-005` | P0/A          | API 연결 실패    | 목록 진입                                      | 500 대신 빈 상태와 복구 가능한 안내를 표시한다.                   |
| `ESP-006` | P0/A          | API 404          | 잘못된 beanId 직접 진입                        | 서버 예외 없이 404 또는 빈 상세로 처리한다.                       |
| `ESP-007` | P0/A          | 셸               | 사이드바 및 검색에서 원두 화면 선택            | 목록과 상세 목적지가 정확하다.                                    |
| `ESP-008` | P1/N          | 로컬 API+DB      | 실제 `GET /espresso-history/beans`와 상세 연계 | 목록 ID로 상세 조회가 성공하고 화면 projection과 원본이 일치한다. |
| `ESP-009` | P2/N          | mobile           | 긴 bean/log 이름과 navigation tree 조작        | 가로 overflow 없이 touch target을 사용할 수 있다.                 |

현재 자동화 매핑: `hobby-espresso.spec.ts`.

## 10. 취미: 레시피

| ID        | 우선순위/상태 | 사전조건           | 절차                                  | 기대 결과                                                   |
| --------- | ------------- | ------------------ | ------------------------------------- | ----------------------------------------------------------- |
| `REC-001` | P0/A          | API recipe fixture | `/hobby/recipes` 진입                 | 이름, 분류, 재료를 포함한 레시피 목록이 표시된다.           |
| `REC-002` | P0/A          | 목록               | 이름·재료 검색                        | 일치 항목만 표시되고 입력 초기화 시 전체 목록으로 돌아간다. |
| `REC-003` | P0/A          | 목록               | 레시피 선택                           | 재료, 분량, 단계, 메모를 포함한 상세가 표시된다.            |
| `REC-004` | P1/A          | 상세               | 뒤로 가기                             | 검색어와 목록 scroll/선택 상태가 가능한 범위에서 유지된다.  |
| `REC-005` | P0/A          | API 실패           | 목록과 `/api/hobby-search-index` 요청 | 페이지는 빈 상태, search index는 빈 배열을 반환한다.        |
| `REC-006` | P0/A          | 셸                 | 사이드바·검색에서 레시피 화면 진입    | 정확한 경로와 탭으로 이동한다.                              |
| `REC-007` | P1/N          | 로컬 API+DB        | 실제 목록과 `GET /recipes/:id` 비교   | UI 상세와 API 데이터가 일치하고 잘못된 ID는 404다.          |
| `REC-008` | P2/N          | mobile             | 긴 재료·단계와 검색 조작              | 텍스트와 버튼이 viewport 밖으로 나가지 않는다.              |

현재 자동화 매핑: `hobby-recipes.spec.ts`.

## 11. 게임 센터 공통

| ID         | 우선순위/상태 | 사전조건                         | 절차                           | 기대 결과                                                                        |
| ---------- | ------------- | -------------------------------- | ------------------------------ | -------------------------------------------------------------------------------- |
| `GAME-001` | P0/A          | `/game`                          | 3개 게임 카드 확인             | Sky Drop, Poke Lounge, Wordle 카드와 설명이 표시된다.                            |
| `GAME-002` | P0/A          | Game Center                      | 각 카드 클릭 및 직접 URL 진입  | 대응 게임 화면이 locale을 유지해 열린다.                                         |
| `GAME-003` | P1/N          | Sky Drop 결과 화면               | 점수 0, 양수, 최고점 상태 확인 | 제출·공유·메달·최고점 UI가 조건에 맞게 표시된다.                                 |
| `GAME-004` | P0/P          | 비로그인 Sky Drop 결과           | 점수 제출 실행                 | 로그인 흐름이 시작되고 pending score가 보존된다.                                 |
| `GAME-005` | P0/P          | 로그인 Sky Drop 결과             | 점수 제출 후 재클릭            | API 요청은 한 번만 성공하고 제출 완료 상태가 유지된다.                           |
| `GAME-006` | P1/P          | 저장된 Sky Drop/Poke Lounge 결과 | 공유 실행                      | result ID를 포함한 share URL이 생성되고 clipboard/Web Share fallback이 동작한다. |
| `GAME-007` | P1/A          | ranking API 실패                 | 게임 ready 화면 진입           | 화면이 깨지지 않고 빈 ranking 상태를 표시한다.                                   |
| `GAME-008` | P1/N          | 저장된 ranking                   | 게임 ready 화면 진입           | gameType별 상위 순위와 본인 최고점이 정확하다.                                   |
| `GAME-009` | P1/N          | pending score storage            | 결과 후 reload/login           | 대기 점수가 복원되고 중복 제출 없이 이어진다.                                    |

현재 자동화 매핑: `hobby-games.spec.ts`, `core-routes.spec.ts`, `error-fallback.spec.ts`. 공통 결과 화면의 실제 로그인·제출·공유는 신규 통합 자동화가 필요하다.

## 12. Sky Drop

| ID        | 우선순위/상태 | 사전조건           | 절차                             | 기대 결과                                                          |
| --------- | ------------- | ------------------ | -------------------------------- | ------------------------------------------------------------------ |
| `SKY-001` | P0/P          | ready 화면         | ranking 로딩 후 Start            | Phaser canvas가 로드되고 score 0으로 게임이 시작된다.              |
| `SKY-002` | P0/N          | 게임 시작          | Q/W/E 키로 각 column 조작        | 해당 column의 pickup/putdown 동작만 실행된다.                      |
| `SKY-003` | P1/N          | touch 환경         | 세 column을 touch                | 키보드와 동일한 조작 결과가 발생한다.                              |
| `SKY-004` | P1/N          | 매칭 가능한 block  | 같은 종류를 조합                 | block이 제거되고 규칙에 맞는 점수·floating text·효과음이 발생한다. |
| `SKY-005` | P1/N          | 매칭 불가 block    | 내려놓기                         | 점수가 증가하지 않고 board 상태만 갱신된다.                        |
| `SKY-006` | P0/N          | board 포화 fixture | 더 이상 배치할 수 없는 상태 생성 | game over가 한 번 발생하고 최종 점수가 결과 화면에 전달된다.       |
| `SKY-007` | P0/N          | 결과 화면          | Restart                          | 새 scene에서 board, elapsed state, score가 초기화된다.             |
| `SKY-008` | P0/N          | ready/결과         | Exit 또는 Dashboard              | Game Center로 돌아가고 Phaser instance가 정리된다.                 |
| `SKY-009` | P1/N          | resize             | desktop 크기를 연속 변경         | canvas와 UI가 컨테이너에 맞고 input 좌표가 어긋나지 않는다.        |
| `SKY-010` | P1/N          | audio 허용/차단    | 첫 입력 전후 효과음 확인         | 브라우저 autoplay 정책을 위반하지 않고 입력 후 audio가 재생된다.   |
| `SKY-011` | P1/N          | 로그인 API         | game over 후 제출·공유           | `SKY_DROP` 점수가 저장되고 ranking/share 상세에 반영된다.          |
| `SKY-012` | P2/N          | Firefox/WebKit     | 핵심 플레이 1회                  | canvas, keyboard, audio, 결과 전환이 Chromium과 동일하다.          |

현재 자동화는 진입과 공통 화면 중심이다. 실제 Phaser board 플레이 시나리오는 신규 test hook 또는 deterministic seed가 필요하다.

## 13. Wordle

| ID         | 우선순위/상태 | 사전조건              | 절차                                      | 기대 결과                                                                                   |
| ---------- | ------------- | --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `WORD-001` | P0/A          | word API 성공         | 화면 진입                                 | loading 후 정답 길이에 맞는 board와 keyboard가 표시된다.                                    |
| `WORD-002` | P0/A          | board 활성            | 물리 키보드로 영문 입력, Backspace, Enter | tile 입력·삭제·제출이 focus 없이 동작한다.                                                  |
| `WORD-003` | P0/A          | board 활성            | 화면 keyboard만 사용                      | mouse/touch만으로 동일한 입력과 제출이 가능하다.                                            |
| `WORD-004` | P0/N          | 길이 미달             | Enter                                     | API를 호출하지 않고 길이 안내를 표시한다.                                                   |
| `WORD-005` | P0/A          | dictionary 미등록     | 유효 길이 단어 제출                       | invalid word 안내 후 현재 row가 수정 가능하다.                                              |
| `WORD-006` | P0/N          | 정답 fixture          | 정답 제출                                 | correct tile과 성공 toast가 표시되고 추가 입력은 막힌다.                                    |
| `WORD-007` | P0/N          | 오답 fixture          | 모든 row 소진                             | 마지막 row와 정답을 포함한 실패 toast가 표시되고 추가 입력은 막힌다.                        |
| `WORD-008` | P1/N          | 중복 문자 정답        | 같은 문자가 여러 번 포함된 guess          | correct/present/absent 수가 Wordle 규칙에 맞다.                                             |
| `WORD-009` | P1/N          | 제출 animation        | 빠른 연속 입력                            | 검증 중 다음 row 입력이나 중복 API 요청이 발생하지 않는다.                                  |
| `WORD-010` | P0/A          | word/check API 실패   | 로딩 또는 제출                            | 서버 이전 안내 toast를 표시하고 앱 전체가 500이 되지 않는다.                                |
| `WORD-011` | P0/N          | 플레이 중             | header Restart                            | 별도 중복 요청 없이 새 단어를 불러오고 board와 keyboard 상태를 초기화한다.                  |
| `WORD-012` | P1/N          | 완료 상태             | header Restart                            | 성공/실패 상태가 지워지고 새 단어로 플레이가 재개된다.                                      |
| `WORD-013` | P1/N          | 임의 상태             | header 공유                               | Wordle 안내 문구와 현재 페이지 URL이 공유되며 정답이나 내부 debug answer를 노출하지 않는다. |
| `WORD-014` | P1/N          | reload                | 진행 중/완료 후 새로고침                  | 명시된 persistence 정책대로 상태가 유지되거나 새 게임으로 일관되게 초기화된다.              |
| `WORD-015` | P2/N          | Firefox/WebKit/mobile | keyboard와 touch 입력                     | key event, tile animation, modal이 브라우저별로 동작한다.                                   |

현재 자동화 매핑: `keyboard-only.spec.ts`, `error-fallback.spec.ts`, `wordle.e2e-spec.ts`. 승리·패배와 중복 문자 UI 자동화는 보강 대상이다.

## 14. Poke Lounge: 진입·월드·로컬 상태

| ID               | 우선순위/상태 | 사전조건                      | 절차                                       | 기대 결과                                                           |
| ---------------- | ------------- | ----------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| `POKE-ENTRY-001` | P0/A          | `ANON`                        | Game Center에서 Poke Lounge 진입           | 팬 게임 안내, mode 선택, room entry가 컨테이너 안에 표시된다.       |
| `POKE-ENTRY-002` | P0/A          | entry                         | Solo 선택 후 스타터 선택                   | local player가 생성되고 world canvas로 진입한다.                    |
| `POKE-ENTRY-003` | P1/N          | starter 화면                  | 각 스타터를 개별 선택                      | 종족, 초기 level, move, stats, IV가 선택 종족에 맞게 저장된다.      |
| `POKE-ENTRY-004` | P1/N          | starter 화면                  | 중복 클릭/뒤로 가기                        | player가 중복 생성되지 않고 이전 단계로 안전하게 돌아간다.          |
| `POKE-WORLD-001` | P0/A          | world                         | 방향키/WASD 이동                           | tile 단위 이동, camera, player animation, collision이 일치한다.     |
| `POKE-WORLD-002` | P1/A          | world probe                   | 상점 NPC 상호작용, 구매·취소               | 돈과 inventory가 조건에 맞게 변하고 부족한 돈은 거부된다.           |
| `POKE-WORLD-003` | P1/A          | world probe                   | 회복 NPC 상호작용                          | party HP, PP, 상태 이상이 회복되고 안내가 표시된다.                 |
| `POKE-WORLD-004` | P1/A          | party/PC fixture              | PC 열기, 보관, 인출, 교체                  | 마지막 party 보관과 party capacity 규칙이 지켜진다.                 |
| `POKE-WORLD-005` | P1/A          | party fixture                 | 좌측 party slot 선택                       | 포켓몬 상세 panel에 stats, IV, move, 상태가 표시된다.               |
| `POKE-WORLD-006` | P1/A          | inventory fixture             | 아이템 사용                                | 대상과 효과가 맞고 소비 수량이 한 번만 감소한다.                    |
| `POKE-WORLD-007` | P1/A          | world                         | 단축키, dice control, 설정 panel 실행      | 각 interaction이 한 번만 동작하고 이동 input과 충돌하지 않는다.     |
| `POKE-WORLD-008` | P1/N          | 모든 party faint              | 이동 및 grass 진입                         | 이동은 가능하지만 야생 전투는 시작하지 않는다.                      |
| `POKE-WORLD-009` | P1/A          | desktop                       | Esc 설정, fullscreen fallback              | 설정 panel이 열리고 fullscreen 미지원 환경에서 fallback이 실행된다. |
| `POKE-WORLD-010` | P1/A          | mobile                        | canvas, fullscreen CTA, entry/starter 확인 | 360px에서도 가로 overflow 없이 조작 가능하다.                       |
| `POKE-STATE-001` | P0/A          | 유효 session snapshot         | reload/remount                             | 현재 local player와 party/PC/inventory가 한 번만 hydrate된다.       |
| `POKE-STATE-002` | P0/A          | unknown version/오염 snapshot | 진입                                       | 위험 key와 잘못된 값은 폐기되고 안전한 초기 상태를 사용한다.        |
| `POKE-STATE-003` | P1/A          | 유효 snapshot                 | sanitize                                   | local player만 보존되고 IV와 유효 필드는 유지된다.                  |

현재 자동화 매핑: `poke-lounge.spec.ts`, `poke-lounge-state-hydration.spec.ts`.

## 15. Poke Lounge: 야생 전투·성장·오디오

| ID                | 우선순위/상태 | 사전조건                   | 절차                               | 기대 결과                                                             |
| ----------------- | ------------- | -------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `POKE-BATTLE-001` | P0/A          | encounter rate 1           | grass tile 이동                    | battle transition 후 선택된 species로 BattleScene이 열린다.           |
| `POKE-BATTLE-002` | P0/A          | battle                     | Fight 선택 후 move 선택            | command menu가 move menu로 전환되고 PP 0 move는 막힌다.               |
| `POKE-BATTLE-003` | P1/A          | 고정 seed                  | move turn 해결                     | priority, speed rank, 명중, 타입 상성, 상대 move가 규칙대로 계산된다. |
| `POKE-BATTLE-004` | P1/A          | 상태 move fixture          | 화상·마비·독·연막 적용             | 상태 배지, speed/명중 변화, turn-end damage가 정확하다.               |
| `POKE-BATTLE-005` | P1/A          | item fixture               | battle item 사용                   | item 효과와 상대 turn, turn-end damage가 모두 처리된다.               |
| `POKE-BATTLE-006` | P0/A          | victory fixture            | 상대 HP 0까지 진행                 | victory result, 경험치, level, field 복귀 상태가 일치한다.            |
| `POKE-BATTLE-007` | P0/A          | defeat fixture             | party 전멸                         | defeat result와 field 상태가 표시되고 즉시 재조우하지 않는다.         |
| `POKE-BATTLE-008` | P1/A          | level-up evolution fixture | victory                            | 진화 species와 재계산 stats가 result와 party에 반영된다.              |
| `POKE-BATTLE-009` | P1/A          | move 4개+신규 학습         | level-up                           | 잊을 move 선택 전 학습이 완료되지 않고 선택 후 정확히 교체된다.       |
| `POKE-BATTLE-010` | P1/A          | party full                 | 포획 성공                          | 포획 포켓몬은 PC box에 저장되고 party는 유지된다.                     |
| `POKE-BATTLE-011` | P1/N          | party 여유                 | 포획 성공                          | 포획 포켓몬이 party에 추가되고 중복 저장되지 않는다.                  |
| `POKE-BATTLE-012` | P1/A          | battle animation           | transition·피격·HP 감소 확인       | animation 순서가 맞고 command 입력은 animation 동안 막힌다.           |
| `POKE-AUDIO-001`  | P1/A          | audio manifest 사용        | 첫 사용자 입력, world, battle 진입 | UI SFX, field BGM, battle BGM 파일이 200으로 요청된다.                |
| `POKE-AUDIO-002`  | P2/N          | scene 반복 전환            | world↔battle 여러 번               | BGM이 중복 재생되지 않고 scene 종료 시 정리된다.                      |

현재 자동화 매핑: `poke-lounge.spec.ts`, `poke-lounge:audio:verify`.

## 16. Poke Lounge: 로컬 룸·토너먼트

| ID               | 우선순위/상태 | 사전조건        | 절차                          | 기대 결과                                                                    |
| ---------------- | ------------- | --------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `POKE-LOCAL-001` | P0/A          | `network=local` | 방 생성                       | room code와 URL이 생성되고 host가 참가자 목록에 표시된다.                    |
| `POKE-LOCAL-002` | P0/A          | 생성 room       | 두 번째 context에서 code 입력 | guest가 같은 room state를 보고 서로 다른 identity를 유지한다.                |
| `POKE-LOCAL-003` | P1/A          | room 설정       | tournament round 시간 선택    | 선택 시간이 URL/state와 round timer에 반영된다.                              |
| `POKE-LOCAL-004` | P1/A          | room            | 공유 링크 복사                | room code를 포함한 URL이 생성된다.                                           |
| `POKE-LOCAL-005` | P0/A          | 참가 중         | guest/host 순서로 leave       | 참가자 목록과 phase가 정리되고 page가 entry로 돌아간다.                      |
| `POKE-LOCAL-006` | P1/A          | roundMs=1000    | timer 만료 대기               | local room이 tournament phase로 전환된다.                                    |
| `POKE-LOCAL-007` | P1/A          | solo            | 같은 시간 대기                | solo는 tournament phase로 전환되지 않는다.                                   |
| `POKE-LOCAL-008` | P1/A          | tournament 종료 | 최종 result 도달, 점수 제출   | 사용자 확인 전 일반 점수 제출이 발생하지 않고 명시적 제출 후 한 번 전송된다. |
| `POKE-LOCAL-009` | P2/N          | 3명 이상        | 참가·ready·round 진행         | casual tournament 정책대로 동작하고 verified ranking에는 포함되지 않는다.    |

현재 자동화 매핑: `poke-lounge.spec.ts`.

## 17. Poke Lounge: 인증 저장·복원

| ID              | 우선순위/상태 | 사전조건        | 절차                             | 기대 결과                                                   |
| --------------- | ------------- | --------------- | -------------------------------- | ----------------------------------------------------------- |
| `POKE-SAVE-001` | P0/A          | `USER_A`        | 첫 진입                          | ID token으로 GET state가 끝나기 전 PUT을 시작하지 않는다.   |
| `POKE-SAVE-002` | P0/A          | 저장 없음       | GET 404                          | 빈 원격 상태로 정규화하고 local snapshot으로 시작한다.      |
| `POKE-SAVE-003` | P0/A          | 원격 state 있음 | 진입                             | 원격 local-player state가 Phaser 시작 전에 hydrate된다.     |
| `POKE-SAVE-004` | P0/A          | state 변경      | 이동/party 변경 후 debounce 대기 | versioned JSON snapshot을 PUT하고 불필요한 중복 PUT이 없다. |
| `POKE-SAVE-005` | P1/A          | PUT 진행 중     | unmount/remount                  | 마지막 snapshot flush 후 다음 hydration이 순서를 지킨다.    |
| `POKE-SAVE-006` | P1/A          | StrictMode      | mount cleanup 재실행             | 이전 flush 완료 전 다음 GET/PUT이 경합하지 않는다.          |
| `POKE-SAVE-007` | P1/A          | token A→B 전환  | A PUT 지연, B 진입               | A flush 후 B state를 조회하고 사용자 상태가 섞이지 않는다.  |
| `POKE-SAVE-008` | P1/A          | GET 실패        | local 상태 변경                  | 실패 직후 원격 PUT으로 서버 상태를 덮어쓰지 않는다.         |
| `POKE-SAVE-009` | P0/A          | `ANON`          | 플레이와 unmount                 | 원격 요청 없이 sessionStorage만 사용한다.                   |
| `POKE-SAVE-010` | P1/N          | 로컬 API+DB     | 저장 후 API/Web 재시작           | 새 프로세스에서도 같은 계정 상태가 복원된다.                |

현재 자동화 매핑: `poke-lounge-autosave.spec.ts`. `POKE-SAVE-010`은 실제 PostgreSQL 통합 시나리오로 추가해야 한다.

## 18. Poke Lounge: 서버 룸·2인 권위 경쟁전

| ID             | 우선순위/상태 | 사전조건                          | 절차                            | 기대 결과                                                                              |
| -------------- | ------------- | --------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `POKE-SRV-001` | P0/A          | `USER_A`                          | server room 생성                | UUID command header로 room이 생성되고 code가 URL에 반영된다.                           |
| `POKE-SRV-002` | P0/A          | `USER_B`, room code               | join                            | 두 context가 서로 다른 session/identity로 같은 public snapshot을 본다.                 |
| `POKE-SRV-003` | P0/A          | 두 사용자                         | 각자 competitive seat bind      | ID token은 메모리에만 있고 두 계정이 각 seat에 한 번만 연결된다.                       |
| `POKE-SRV-004` | P0/A          | 두 seat eligible                  | assignment 수신                 | host 여부와 무관하게 두 사용자 모두 같은 match/turn으로 battle을 시작한다.             |
| `POKE-SRV-005` | P1/A          | 익명 또는 중복 계정               | seat bind                       | competitive를 열지 않고 casual world를 유지한다.                                       |
| `POKE-SRV-006` | P1/A          | 세 번째 참가자                    | join/bind                       | active participant가 3명 이상이면 competitive assignment를 만들지 않는다.              |
| `POKE-SRV-007` | P0/A          | 자기 turn                         | move 선택                       | UUIDv4 action이 한 번 제출되고 waiting 상태로 전환된다.                                |
| `POKE-SRV-008` | P0/A          | switch 가능                       | switch 선택                     | 선택 slot만 제출되고 현재/faint slot은 제출되지 않는다.                                |
| `POKE-SRV-009` | P1/A          | 두 action                         | 동시에 action 제출              | 서버가 한 turn만 결정적으로 resolve하고 새 revision을 broadcast한다.                   |
| `POKE-SRV-010` | P1/A          | 400 응답                          | action 제출                     | fresh projection 후 입력이 다시 열리고 잘못된 local result를 만들지 않는다.            |
| `POKE-SRV-011` | P1/A          | stale turn 409                    | action 제출                     | REST snapshot으로 resync하고 새 상태를 기준으로 입력한다.                              |
| `POKE-SRV-012` | P1/A          | network 실패                      | 같은 action 재시도              | 동일 command UUID를 재사용하고 서버에서 중복 처리되지 않는다.                          |
| `POKE-SRV-013` | P1/A          | 연속 transport 실패               | action 제출                     | capped retry 후 REST 복구하고 새 사용자 입력에 새 UUID를 사용한다.                     |
| `POKE-SRV-014` | P1/A          | response parsing 실패             | 성공 응답 처리                  | mutation을 중복 전송하지 않고 projection recovery로 전환한다.                          |
| `POKE-SRV-015` | P1/A          | socket disconnect                 | 연결 복구                       | 같은 socket identity로 REST recovery 후 재구독한다.                                    |
| `POKE-SRV-016` | P1/A          | socket/REST 경합                  | newer socket 후 stale REST 도착 | 높은 revision만 적용되어 화면이 과거로 돌아가지 않는다.                                |
| `POKE-SRV-017` | P1/A          | submittedPlayerIds 포함 snapshot  | reconnect                       | 자기 waiting 상태를 복원하고 중복 action을 막는다.                                     |
| `POKE-SRV-018` | P1/A          | malformed projection              | socket 수신                     | battle을 열지 않고 schema rejection 후 REST recovery한다.                              |
| `POKE-SRV-019` | P1/A          | participant/HP/PP 위조 projection | 수신                            | parser가 거부하고 prototype pollution이나 과대 record를 적용하지 않는다.               |
| `POKE-SRV-020` | P0/A          | terminal turn                     | 마지막 action 제출              | winner/loser와 score는 서버 projection만 사용한다.                                     |
| `POKE-SRV-021` | P0/A          | terminal                          | 결과 화면 확인                  | generic score API나 client-asserted tournament result를 전송하지 않는다.               |
| `POKE-SRV-022` | P0/N          | 로컬 API+DB                       | match 종료 후 ranking 조회      | winner 100, loser 50의 verified history가 각각 한 번 저장되고 공개 ranking에 반영된다. |
| `POKE-SRV-023` | P1/A          | create 직후 unmount               | 응답 전/후 leave                | 실제 생성 room에 leave를 정확히 한 번 전송한다.                                        |
| `POKE-SRV-024` | P1/A          | party 변경                        | connect 및 party update         | party snapshot이 직렬화되어 mutation queue 순서대로 전송된다.                          |
| `POKE-SRV-025` | P1/A          | revision/idempotency conflict     | mutation                        | conflict snapshot만 적용하고 command를 자동 재실행하지 않는다.                         |
| `POKE-SRV-026` | P1/N          | API 프로세스 재시작               | active room/match 재조회        | room, assignment, action receipt가 PostgreSQL에서 복원된다.                            |
| `POKE-SRV-027` | P2/N          | 두 실제 browser                   | 전체 경쟁 match 실행            | 서로의 turn/waiting/HP/PP/result가 실시간으로 동일하게 보인다.                         |

현재 자동화 매핑: `poke-lounge-multiplayer.spec.ts`, `poke-lounge-room.e2e-spec.ts`, `poke-lounge-competitive.repository.integration-spec.ts`. `POKE-SRV-022`, `026`, `027`은 Web+실 API+DB를 묶는 상위 E2E suite로 추가해야 한다.

## 19. 점수·랭킹·공유 상세

| ID          | 우선순위/상태 | 사전조건                     | 절차                    | 기대 결과                                                                    |
| ----------- | ------------- | ---------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `SCORE-001` | P0/P          | 로그인, 게임 결과            | 점수 제출               | gameType, score, source가 API 계약에 맞고 result ID가 반환된다.              |
| `SCORE-002` | P1/N          | 동일 결과                    | 제출 재시도             | idempotency 또는 UI guard로 중복 history가 생기지 않는다.                    |
| `SCORE-003` | P0/A          | ranking API 실패             | ranking 화면            | 빈 상태로 fallback하고 page 500을 만들지 않는다.                             |
| `SCORE-004` | P0/N          | `DB_GAME`                    | gameType별 ranking 조회 | 사용자별 최고점, 정렬, 공개 projection만 반환된다.                           |
| `SCORE-005` | P0/A          | 유효 share ID                | `/share/:id` 직접 진입  | 게임명, 점수, 사용자, 생성 시각이 표시되고 탭 이름에 UUID가 노출되지 않는다. |
| `SCORE-006` | P0/A          | 잘못된 ID/404                | share 직접 진입         | 서버 예외 대신 404 복구 화면을 표시한다.                                     |
| `SCORE-007` | P1/A          | API 530/fetch 실패           | share 직접 진입         | recoverable fallback으로 처리한다.                                           |
| `SCORE-008` | P1/A          | API 500                      | share 직접 진입         | 실제 server error를 조용히 404로 숨기지 않고 오류로 분류한다.                |
| `SCORE-009` | P0/N          | Poke casual/verified fixture | 공개 ranking 조회       | verified-room 결과만 포함되고 client-asserted 결과는 제외된다.               |
| `SCORE-010` | P1/N          | share UI                     | 링크 복사·QR·Web Share  | canonical share URL이 모든 방식에서 동일하다.                                |

현재 자동화 매핑: `api-read-error.spec.ts`, `error-fallback.spec.ts`, `not-found-recovery.spec.ts`, `server-route-fallback.spec.ts`, `history-tabs.spec.ts`, API `game-result-trust.integration-spec.ts`.

## 20. 인증과 세션

| ID         | 우선순위/상태 | 사전조건               | 절차                         | 기대 결과                                                        |
| ---------- | ------------- | ---------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `AUTH-001` | P0/M          | 운영 OAuth, `USER_A`   | Google 로그인                | callback 후 session이 생성되고 원래 화면으로 복귀한다.           |
| `AUTH-002` | P0/M          | 로그인 상태            | 새로고침·새 탭               | session과 사용자 UI가 유지된다.                                  |
| `AUTH-003` | P0/M          | 로그인 상태            | 로그아웃                     | session cookie가 제거되고 보호 API 요청에 token을 보내지 않는다. |
| `AUTH-004` | P0/A          | 유효 idToken           | token helper 실행            | JWT exp를 계산하고 API 제출 token으로 반환한다.                  |
| `AUTH-005` | P0/A          | 만료/갱신 실패 idToken | API 작업                     | 만료 token과 accessToken fallback을 사용하지 않는다.             |
| `AUTH-006` | P0/N          | 보호 API               | token 없음/잘못된 token 요청 | 401이며 사용자 간 데이터가 노출되지 않는다.                      |
| `AUTH-007` | P1/N          | `USER_A`→`USER_B`      | 같은 browser에서 계정 전환   | 저장·pending score·Poke state가 계정 간 섞이지 않는다.           |
| `AUTH-008` | P1/N          | OAuth 취소/오류        | 로그인 시도                  | 원래 화면에서 재시도 가능한 오류 안내를 표시한다.                |

현재 자동화 매핑: `auth-token.spec.ts`, API `google-auth.guard.spec.ts`. 실제 Google OAuth는 운영 수동 smoke 또는 별도 테스트 OAuth 프로젝트가 필요하다.

## 21. API·PostgreSQL·Socket 통합

| ID        | 우선순위/상태 | 사전조건             | 절차                                    | 기대 결과                                                            |
| --------- | ------------- | -------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `API-001` | P0/A          | API 실행             | `GET /`, `GET /health`                  | 200과 서비스 상태를 반환한다.                                        |
| `API-002` | P0/A          | API 실행             | `GET /api-json`                         | deploy-critical endpoint와 enum이 있고 cache되지 않는다.             |
| `API-003` | P0/A          | source clean         | OpenAPI와 Web type 생성                 | 생성 후 tracked diff가 없다.                                         |
| `API-004` | P0/N          | recipe fixture       | 목록·상세·없는 ID 조회                  | 200 목록/상세와 404가 계약대로 반환된다.                             |
| `API-005` | P0/N          | espresso fixture     | bean 목록·상세·없는 ID 조회             | 응답 projection과 404가 계약대로 반환된다.                           |
| `API-006` | P0/A          | Wordle DB            | valid/invalid/짧음/김/비영문 check      | 200 또는 400 validation이 계약대로 동작한다.                         |
| `API-007` | P0/N          | Wordle DB            | `GET /wordle/word` 반복                 | 허용 길이 영단어를 반환하고 민감한 답 데이터가 추가 노출되지 않는다. |
| `API-008` | P0/N          | 인증 계정            | game state PUT→GET                      | versioned snapshot이 계정별로 round-trip된다.                        |
| `API-009` | P0/N          | 다른 계정            | `USER_A` state를 `USER_B`로 조회        | 다른 사용자의 state가 반환되지 않는다.                               |
| `API-010` | P0/A          | room API             | 모든 mutation header 누락/오염          | command ID와 revision validation이 요청을 거부한다.                  |
| `API-011` | P0/A          | room API+DB          | create/join/ready/snapshot/result/leave | revision·expiry가 증가하고 session은 public 응답에서 redaction된다.  |
| `API-012` | P0/A          | 같은 command         | 요청 replay와 payload 변경 replay       | 동일 요청은 같은 receipt, 변경 요청은 conflict다.                    |
| `API-013` | P1/A          | 두 writer            | 같은 revision에 동시 mutation           | 하나만 commit되고 다른 요청은 conflict snapshot을 받는다.            |
| `API-014` | P1/A          | room expiry          | waiting/completed/closed 시간 진행      | strict expiry room만 purge되고 receipt가 cascade 삭제된다.           |
| `API-015` | P0/A          | Socket 두 client     | 권한 session으로 subscribe              | 한 committed revision을 두 client가 받고 잘못된 session은 거부된다.  |
| `API-016` | P0/A          | 경쟁 match           | seat bind/action/terminal               | assignment, receipt, history가 transaction 단위로 저장된다.          |
| `API-017` | P1/A          | API 재시작           | room/match/action 재조회                | 메모리 상태에 의존하지 않고 DB에서 복원된다.                         |
| `API-018` | P0/A          | fresh DB             | migration chain 실행                    | canonical schema, enum, index, extension이 생성된다.                 |
| `API-019` | P1/A          | partial/mismatch DB  | baseline migration                      | 자동 수리나 데이터 삭제 없이 명시적으로 실패한다.                    |
| `API-020` | P1/N          | RAG origin allowlist | 허용/비허용 Origin으로 chat             | 허용 origin만 성공하고 비허용 origin은 명확히 거부된다.              |

현재 자동화 매핑: `apps/api/test` 전체와 API unit specs. Recipe, Espresso, game state, RAG의 실제 HTTP E2E는 보강해야 한다.

## 22. 오류 복구·보안·비기능

| ID          | 우선순위/상태 | 사전조건             | 절차                                              | 기대 결과                                                             |
| ----------- | ------------- | -------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| `ERR-001`   | P0/A          | API read             | 404, 530, network failure, 500 각각 주입          | recoverable 오류만 fallback하고 500은 숨기지 않는다.                  |
| `ERR-002`   | P1/N          | 느린 네트워크        | 주요 목록/API를 지연                              | loading 상태가 보이고 버튼 중복 제출이 막힌다.                        |
| `ERR-003`   | P1/N          | offline              | 게임 중 네트워크 전환                             | 로컬 플레이는 유지되고 원격 기능은 재시도 가능한 안내를 표시한다.     |
| `SEC-001`   | P0/N          | 운영/로컬            | security header 검사                              | CSP, frame, content type, referrer 정책이 route 성격에 맞다.          |
| `SEC-002`   | P0/N          | 보호 요청            | token/session/room credential을 URL·DOM·로그 검사 | credential이 public snapshot, query, console에 노출되지 않는다.       |
| `SEC-003`   | P1/A          | 악성 room projection | prototype key/oversized payload 수신              | parser가 적용 전에 거부한다.                                          |
| `A11Y-001`  | P0/A          | Wordle               | Tab, Shift+Tab, Enter, Space만 사용               | 핵심 입력·제출·restart가 가능하고 focus가 보인다.                     |
| `A11Y-002`  | P1/N          | 전체 주요 화면       | axe 기반 WCAG 검사                                | critical/serious violation이 없다.                                    |
| `A11Y-003`  | P1/N          | dialog/panel         | 키보드로 열기·닫기                                | focus trap, Escape, trigger 복귀가 동작한다.                          |
| `A11Y-004`  | P1/N          | 결과·toast·loading   | screen reader semantics 검사                      | 상태 변경이 적절한 live region과 label로 전달된다.                    |
| `MOB-001`   | P0/A          | 360/390/430          | 전체 주요 route 진입                              | 메뉴 trigger 규칙과 viewport overflow가 기준에 맞다.                  |
| `MOB-002`   | P1/N          | mobile keyboard      | 검색·RAG 입력                                     | virtual keyboard로 CTA가 가려지지 않고 scroll로 접근 가능하다.        |
| `VIS-001`   | P1/A          | 고정 viewport/font   | 홈, Blog, Dashboard, Game, Package screenshot     | 승인된 baseline과 의미 있는 차이가 없다.                              |
| `VIS-002`   | P1/A          | 주요 route           | 초기 load CLS 측정                                | 문서화된 기준 이하이고 이미지·canvas가 뒤늦게 레이아웃을 밀지 않는다. |
| `PERF-001`  | P2/N          | production build     | 주요 route navigation 측정                        | 심각한 long task, 무한 request, 메모리 증가가 없다.                   |
| `PERF-002`  | P2/N          | 게임 반복            | scene 진입/종료 10회                              | canvas, audio, key/socket listener 개수가 누적되지 않는다.            |
| `AN-001`    | P1/A          | GA env 있음          | 페이지 진입                                       | GA script가 한 번 로드되고 설정이 없으면 로드되지 않는다.             |
| `AN-002`    | P1/A          | GTM env 있음         | 페이지 진입                                       | GTM script와 noscript fallback이 표시되고 중복 삽입되지 않는다.       |
| `META-001`  | P2/N          | 운영 URL             | sitemap, robots, canonical, OG image 조회         | 공개 route와 metadata가 운영 URL 기준으로 유효하다.                   |
| `ASSET-001` | P0/N          | 운영 배포            | 주요 image/audio/font 요청 관찰                   | 404, MIME 오류, mixed content가 없다.                                 |

현재 자동화 매핑: `api-read-error.spec.ts`, `mobile-behavior.spec.ts`, `layout-shift.spec.ts`, `visual-regression.spec.ts`, `keyboard-only.spec.ts`, `google-analytics.spec.ts`, `google-tag-manager.spec.ts`.

## 23. 실행 세트

### 23.1 PR P0 세트

1. API contract, typecheck, lint, knip, build.
2. API unit 및 PostgreSQL migration/E2E.
3. Chromium에서 `NAV`, `I18N`, 주요 route, API fallback, 각 게임 진입.
4. Poke Lounge starter→world→battle 한 경로와 server room 핵심 action.
5. 실패 시 merge 금지.

현재 PR workflow는 `i18n-integrity`, `hobby-games`, `keyboard-only`만 focused 실행한다. 전체 기능 목표에는 부족하므로 다음 파일을 P0 분할 job으로 추가하는 것을 권장한다.

```txt
core-routes.spec.ts
not-found-recovery.spec.ts
server-route-fallback.spec.ts
poke-lounge.spec.ts --grep "solo 선택|wild-victory|network=local"
poke-lounge-multiplayer.spec.ts --grep "server room create|authoritative move|terminal"
```

### 23.2 일일 P1 세트

```bash
pnpm e2e
pnpm test:api:e2e
TEST_DATABASE_URL=postgresql://<user>@127.0.0.1:5432/vscoke_web_test pnpm e2e:integration
```

Chromium 전체 suite와 실제 PostgreSQL integration을 실행한다. 외부 운영 API에 의존하지 않도록 로컬 API와 테스트 DB를 사용한다.

### 23.3 릴리즈 후보 세트

1. `pnpm e2e:cross-browser`로 Chromium, Firefox, WebKit 실행.
2. mobile 360, 390, 430 viewport 실행.
3. `USER_A`, `USER_B`를 이용한 실제 2인 Poke Lounge 경쟁 match.
4. 실제 Google OAuth 로그인·로그아웃.
5. Vercel production과 Ubuntu API smoke.
6. visual baseline 및 CLS 확인.
7. 운영 console error, failed request, CORS, Socket reconnect 확인.

## 24. 자동화 구현 순서

| 순서 | 작업                                         | 이유                                                |
| ---- | -------------------------------------------- | --------------------------------------------------- |
| 1    | Sky Drop deterministic play hook 및 승패 E2E | 현재 실제 플레이 검증이 가장 부족함                 |
| 2    | Wordle 승리·패배·중복 문자 E2E               | 핵심 규칙 UI 누락 보완                              |
| 3    | 점수 제출·랭킹·공유 Web+API 통합             | 게임 공통 사용자 가치 검증                          |
| 4    | Recipe/Espresso/Game State/RAG HTTP E2E      | controller별 계약 공백 보완                         |
| 5    | Poke Lounge 두 browser+실 API+DB 상위 E2E    | route interception과 repository test 사이 공백 제거 |
| 6    | 전체 화면 axe와 metadata/asset smoke         | 비기능 release 기준 완성                            |

test hook은 production 동작을 바꾸지 않는 `e2e` query 또는 test-only adapter로 제한한다. 결과를 직접 주입해 화면만 통과시키기보다 seed, clock, encounter/collision 조건을 제어해 실제 domain logic을 실행해야 한다.

## 25. 실패 증적과 분류

각 실패는 다음 정보를 남긴다.

| 항목        | 내용                                              |
| ----------- | ------------------------------------------------- |
| Scenario ID | 이 문서의 고유 ID                                 |
| Commit      | 전체 SHA                                          |
| 환경        | local UI, local integration, preview, production  |
| 브라우저    | 이름, 버전, viewport                              |
| 데이터      | fixture/계정/room code의 비밀 제외 식별자         |
| 기대/실제   | 상태 코드, 화면 상태, revision 등 구체값          |
| artifact    | trace, screenshot, video, server log, request log |
| 재현성      | 1회성, 반복, 특정 순서 의존                       |

실패 분류:

- `PRODUCT`: 구현 결함 또는 회귀.
- `TEST`: selector, timing, fixture, assertion 결함.
- `ENV`: DB, OAuth, 외부 API, DNS, 브라우저 설치 문제.
- `FLAKY`: 동일 commit/환경에서 성공과 실패가 반복됨.
- `KNOWN`: 승인된 제약이며 issue와 만료일이 있음.

flaky 테스트는 단순 retry 성공으로 닫지 않는다. 최초 실패 trace를 확인하고 원인을 기록한다.

## 26. 완료 기준

전체 기능 E2E 검증 완료는 다음 조건을 모두 만족해야 한다.

1. 모든 `P0` 시나리오가 Chromium과 API 통합 환경에서 통과한다.
2. 사용자 입력이 있는 모든 공개 화면에 최소 한 개의 정상 경로 E2E가 있다.
3. 각 외부 경계인 API, OAuth, PostgreSQL, Socket.IO, clipboard/share에 정상·실패 경로가 있다.
4. Sky Drop, Wordle, Poke Lounge가 각각 실제 시작→플레이→종료→재시작 흐름을 통과한다.
5. Poke Lounge는 익명 solo, local room, 인증 2인 server competition을 각각 통과한다.
6. ko-KR, en-US, ja-JP route와 360/390/430 mobile 레이아웃이 통과한다.
7. Firefox와 WebKit에서 P0 핵심 경로가 통과한다.
8. critical 접근성 오류, console error, 예상하지 않은 4xx/5xx, 정적 asset 404가 없다.
9. 실패 artifact와 실행 결과가 commit SHA 기준으로 보존된다.
10. 미자동화 또는 수동 항목은 담당자, 실행일, 결과가 릴리즈 기록에 남는다.

## 27. 현재 결론

현재 저장소는 route, 다국어, 취미 화면, 오류 fallback, Poke Lounge domain/저장/멀티플레이에 강한 자동화 기반이 있다. 반면 Sky Drop의 실제 플레이, Wordle 완주, 공통 점수 제출·공유, Recipe/Espresso의 실제 HTTP 계약, Google OAuth, Web+실 API+DB를 묶은 2인 Poke Lounge 경쟁전은 전체 기능 E2E 관점에서 보강이 필요하다.

따라서 기존 `pnpm e2e` 통과만으로 "모든 기능 테스트 완료"라고 판정하지 않는다. 이 문서의 `N`과 `P` 항목을 자동화하거나 릴리즈 후보 수동 결과로 증명한 뒤 완료로 판정한다.
