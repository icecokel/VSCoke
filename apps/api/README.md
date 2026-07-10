# VSCoke API

`apps/api`는 VSCoke monorepo의 NestJS 백엔드 앱이다. 웹 앱(`apps/web`)이 사용하는 공개 API, 게임 점수/랭킹, 취미 데이터, Poke Lounge 서버 룸, 이력 RAG chat API를 제공한다.

## 기술 스택

- Node.js 20 이상
- NestJS 11
- TypeScript
- TypeORM + PostgreSQL
- Swagger UI `/api`, OpenAPI JSON `/api-json`
- Winston logging
- Google ID token 인증 guard

## 주요 모듈

| 모듈            | 주요 endpoint                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| App             | `GET /`, `GET /health`                                                                                    |
| Recipe          | `GET /recipes`, `GET /recipes/:id`                                                                        |
| EspressoHistory | `GET /espresso-history/beans`, `GET /espresso-history/beans/:id`                                          |
| Game            | `POST /game/result`, `GET /game/ranking`, `GET /game/result/:id`, `GET/PUT /game/poke-lounge/state`       |
| PokeLounge      | `POST /poke-lounge/rooms`, `GET /poke-lounge/rooms/:roomCode`, room join/ready/snapshot/result/leave APIs |
| Resume RAG      | `POST /resume-rag/chat`                                                                                   |
| Wordle          | `GET /wordle/word`, `POST /wordle/check`                                                                  |

## 로컬 준비

저장소 루트에서 의존성을 설치한다.

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install
```

환경 변수는 예시 파일을 복사해 구성한다.

```bash
cp apps/api/.env.example apps/api/.env
```

최소 실행 값:

```env
GOOGLE_CLIENT_ID=replace-with-google-client-id
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=replace-with-db-password
DB_DATABASE=vscoke
DB_SYNCHRONIZE=false
```

개발 환경에서만 인증 우회를 쓸 경우:

```env
ENABLE_DEV_AUTH_BYPASS=true
DEV_AUTH_TOKEN=replace-with-local-token
```

운영 환경 변수 기준은 [Deployment and Environment Plan](../../docs/deployment-and-env.md)을 따른다.

## 실행 명령

루트에서 실행:

```bash
PORT=3001 pnpm dev:api
pnpm build:api
pnpm test:api
pnpm test:api:e2e
```

API 앱 필터를 직접 사용할 수도 있다.

```bash
pnpm --filter @vscoke/api start:dev
pnpm --filter @vscoke/api build
pnpm --filter @vscoke/api test
pnpm --filter @vscoke/api test:e2e
```

Swagger 확인:

```txt
http://localhost:3001/api
http://localhost:3001/api-json
```

## OpenAPI 계약

프론트 타입은 현재 커밋의 controller/DTO에서 생성한 로컬 OpenAPI 계약을 기준으로 한다.

```bash
pnpm generate:types
pnpm check:api-contract
```

`pnpm generate:types`는 `apps/api/openapi.json`을 생성하고 `apps/web/src/types/api.d.ts`를 갱신한다. API DTO나 controller 응답이 바뀌면 두 파일의 diff를 함께 확인한다.

## DB와 migration

운영에서는 `DB_SYNCHRONIZE=false`를 유지하고 schema 변경은 TypeORM migration으로 반영한다.

```bash
pnpm --filter @vscoke/api migration:create src/migrations/<kebab-summary>
pnpm --filter @vscoke/api migration:generate src/migrations/<kebab-summary>
pnpm --filter @vscoke/api migration:show
pnpm --filter @vscoke/api migration:run
pnpm --filter @vscoke/api migration:revert
```

Mac 로컬에서 운영 DB 확인이 필요하면 Cloudflare Access TCP tunnel을 먼저 실행한다.

```bash
pnpm --filter @vscoke/api db:tunnel
```

## Resume RAG 운영 메모

운영 chat은 `resume_source_items`의 DB 텍스트를 keyword/text search로 검색하고, 검색된 근거를 Codex app-server에 전달해 답변만 생성한다. 운영 chat runtime에는 OpenAI/API 임베딩 키가 필요하지 않다.

필수 기준값:

```env
RAG_CHAT_PROVIDER=codex-app-server
RAG_CODEX_APP_SERVER_URL=ws://127.0.0.1:14561
RAG_CODEX_CWD=/home/icenux/projects/vscoke-api
RAG_PUBLIC_CHAT_ORIGINS=https://vscoke.vercel.app
```

## 배포

API는 `.github/workflows/deploy-api.yml`이 Ubuntu host의 GitHub Actions self-hosted runner에서 배포한다.

- 배포 경로: `/home/icenux/projects/vscoke-api`
- PM2 앱 이름: `vscoke-api`
- entrypoint: `apps/api/dist/src/main.js`
- 공개 health: `https://api.icecoke.kr/health`

세부 절차는 [DEPLOY.md](DEPLOY.md)와 [Operations Runbook](../../docs/operations-runbook.md)을 따른다.
