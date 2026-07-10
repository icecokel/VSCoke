# Local Development

이 문서는 VSCoke monorepo를 로컬에서 실행하고 검증하는 기준을 정리한다.

## 기본 전제

- Node.js 20 이상을 사용한다.
- 패키지 매니저는 루트 `package.json`의 `packageManager`에 맞춰 `pnpm@9.12.0`을 사용한다.
- 모든 명령은 별도 안내가 없으면 저장소 루트에서 실행한다.

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install
```

## 앱 구조

```txt
apps/web -> Next.js frontend
apps/api -> NestJS backend
```

루트 스크립트는 workspace 명령을 감싸는 진입점이다.

| 목적              | 명령                      |
| ----------------- | ------------------------- |
| 웹 개발           | `pnpm dev:web`            |
| API 개발          | `pnpm dev:api`            |
| 전체 빌드         | `pnpm build`              |
| 웹 빌드           | `pnpm build:web`          |
| API 빌드          | `pnpm build:api`          |
| 웹 lint           | `pnpm lint:web`           |
| 전체 lint         | `pnpm lint`               |
| 웹 타입 체크      | `pnpm type:check:web`     |
| API test          | `pnpm test:api`           |
| API E2E test      | `pnpm test:api:e2e`       |
| OpenAPI 타입 생성 | `pnpm generate:types`     |
| API 계약 확인     | `pnpm check:api-contract` |
| 웹 E2E            | `pnpm e2e`                |
| 웹 E2E smoke      | `pnpm e2e:smoke`          |
| unused code check | `pnpm knip`               |

## 환경 변수 준비

환경 변수 파일은 Git에 커밋하지 않는다. 예시는 각 앱의 `.env.example`을 기준으로 한다.

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

웹에서 API를 호출하려면 `NEXT_PUBLIC_API_URL`이 필요하다.

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

운영 API를 바라보며 웹만 개발할 때는 다음 값을 사용할 수 있다.

```env
NEXT_PUBLIC_API_URL=https://api.icecoke.kr
```

API는 DB, Google OAuth, 알림 설정을 `apps/api/.env`에서 읽는다. 운영 값은 Ubuntu host의 API `.env`에서 별도로 관리한다.

Resume RAG chat을 로컬 API에서 실제로 호출하려면 `RAG_CHAT_PROVIDER`, `RAG_CODEX_APP_SERVER_URL`, `RAG_CODEX_CWD`, `RAG_PUBLIC_CHAT_ORIGINS`도 확인한다. 운영 chat은 DB 텍스트 검색과 Codex app-server 답변 생성을 사용하며 OpenAI/API 임베딩 키를 필수로 요구하지 않는다.

## 웹만 실행

운영 API를 바라보며 웹을 확인할 때 사용한다.

```bash
pnpm dev:web
```

확인 주소:

```txt
http://localhost:3000
```

웹 빌드만 확인할 때:

```bash
pnpm build:web
```

API가 없어도 빌드만 확인해야 하면 `NEXT_PUBLIC_API_URL`에 임시 URL을 넣어 실행할 수 있다.

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 pnpm build:web
```

## API만 실행

API 개발 서버:

```bash
PORT=3001 pnpm dev:api
```

Swagger 확인:

```txt
http://localhost:3001/api
http://localhost:3001/api-json
```

주요 API surface:

| 영역            | endpoint                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Health          | `GET /health`                                                                                        |
| Hobby           | `GET /recipes`, `GET /recipes/:id`, `GET /espresso-history/beans`, `GET /espresso-history/beans/:id` |
| Game            | `POST /game/result`, `GET /game/ranking`, `GET /game/result/:id`, `GET/PUT /game/poke-lounge/state`  |
| Poke Lounge     | `/poke-lounge/rooms/**`                                                                              |
| Resume question | `POST /resume-rag/chat`                                                                              |
| Wordle          | `GET /wordle/word`, `POST /wordle/check`                                                             |

API 빌드:

```bash
pnpm build:api
```

API 테스트:

```bash
pnpm test:api
```

## 웹과 API 같이 실행

터미널을 두 개 사용한다.

터미널 1:

```bash
PORT=3001 pnpm dev:api
```

터미널 2:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev:web
```

이 방식은 프론트가 로컬 NestJS API를 직접 호출한다.

## DB tunnel

운영 DB는 Ubuntu host 안의 PostgreSQL을 기준으로 한다. Mac에서 DB 확인이 필요하면 Cloudflare Access TCP tunnel을 먼저 띄운다.

```bash
pnpm --filter @vscoke/api db:tunnel
```

터널 실행에는 `apps/api/.env`의 `CLOUDFLARE_DB_HOST`와 `DB_PORT`가 필요하다. 터널을 띄운 터미널은 유지하고, 다른 터미널에서 API 실행이나 DB 확인을 진행한다.

```txt
Mac localhost:5432 -> cloudflared access tcp -> PostgreSQL on Ubuntu host
```

## API 타입 갱신

프론트 타입은 현재 커밋의 API controller/DTO에서 생성한 로컬 OpenAPI JSON에서 생성한다. 운영 `https://api.icecoke.kr/api-json`은 배포된 API 확인용이며, 개발/CI 타입 생성 기준으로 사용하지 않는다.

```bash
pnpm generate:types
```

API DTO나 controller 응답이 바뀌면 다음 순서로 확인한다.

1. `pnpm generate:types`를 실행해 `apps/api/openapi.json`과 `apps/web/src/types/api.d.ts`를 갱신한다.
2. 생성된 OpenAPI 계약과 타입 diff를 확인한다.
3. 프론트 서비스와 화면 사용처를 함께 수정한다.
4. `pnpm check:api-contract`로 생성 파일 누락 갱신이 없는지 확인한다.

## 검증 명령

작업 종류에 따라 필요한 검증만 선택한다.

```bash
pnpm lint
pnpm build
pnpm test:api
pnpm e2e:smoke
```

API 배포 후 공개 endpoint를 확인할 때:

```bash
pnpm smoke:api:remote
```

## Git hook과 PR 검증

로컬 hook은 Husky로 관리한다.

| Hook         | 실행 내용                                                          |
| ------------ | ------------------------------------------------------------------ |
| `pre-commit` | staged 파일에 `lint-staged` 실행                                   |
| `commit-msg` | 한국어 커밋 메시지 규칙 검증                                       |
| `pre-push`   | `pnpm type:check:web`, `pnpm lint`, `pnpm build`, `pnpm e2e:smoke` |

PR 자동 검증은 `.github/workflows/pull-request-check.yml`에서 실행한다.

| Job | 검증                                                                    |
| --- | ----------------------------------------------------------------------- |
| API | API lint, unit test, E2E test, build                                    |
| Web | API contract diff, typecheck, lint, knip, build, focused Playwright E2E |

현재 PR focused E2E는 `i18n-integrity`, `hobby-games`, `keyboard-only`를 Chromium에서 실행한다. 전체 Playwright 회귀가 필요하면 로컬에서 `pnpm e2e` 또는 `pnpm e2e:cross-browser`를 별도로 실행한다.

## 자주 생기는 문제

`NEXT_PUBLIC_API_URL environment variable is not defined`가 나오면 웹 환경 변수 파일이나 실행 명령에 `NEXT_PUBLIC_API_URL`을 추가한다.

API가 DB에 붙지 못하면 `apps/api/.env`의 DB 값과 tunnel 실행 여부를 먼저 확인한다.

웹에서 CORS 에러가 나오면 API의 `CORS_ORIGINS`에 현재 웹 origin이 포함되어 있는지 확인한다.

Swagger 타입이 프론트 코드와 맞지 않으면 운영 Swagger가 아니라 현재 커밋의 controller/DTO에서 `pnpm generate:types`를 다시 실행했는지, `apps/api/openapi.json`과 `apps/web/src/types/api.d.ts` diff가 함께 반영됐는지 확인한다.
