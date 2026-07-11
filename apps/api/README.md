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

| 모듈            | 주요 endpoint                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| App             | `GET /`, `GET /health`                                                                                            |
| Recipe          | `GET /recipes`, `GET /recipes/:id`                                                                                |
| EspressoHistory | `GET /espresso-history/beans`, `GET /espresso-history/beans/:id`                                                  |
| Game            | `POST /game/result`, `GET /game/ranking`, `GET /game/result/:id`, `GET/PUT /game/poke-lounge/state`               |
| PokeLounge      | durable room commands, competitive seat/action APIs, `GET /poke-lounge/rooms/:roomCode`, Socket.IO `/poke-lounge` |
| Resume RAG      | `POST /resume-rag/chat`                                                                                           |
| Wordle          | `GET /wordle/word`, `POST /wordle/check`                                                                          |

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
pnpm test:poke-lounge-battle
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

`CreateLegacyCoreSchema1759999999999`는 legacy core 객체가 모두 없을 때만 canonical schema를 만들고, 모두 있을 때는 정확히 일치하는 schema만 migration ledger에 채택한다. 일부 객체만 있거나 schema/ledger가 다르면 자동 수리 없이 실패한다. 이 baseline의 `down`은 기존 데이터 삭제를 막기 위해 의도적으로 실패한다.

PostgreSQL 테스트에는 운영 DB와 분리된 `TEST_DATABASE_URL`이 필수다. 데이터베이스 이름은 `_test`로 끝나야 하고 `DATABASE_URL`, `DB_URL`, `DB_DATABASE`와 같은 대상을 가리킬 수 없다. CI는 PostgreSQL 16 service에서 test migration을 먼저 실행한 뒤 integration/E2E를 수행한다. 운영 배포 workflow는 migration을 자동 실행하지 않으며, backup과 ledger 확인 후 maintenance window에서 수동 실행한다.

## Poke Lounge 계약

룸 상태는 PostgreSQL의 `poke_lounge_room` JSONB snapshot, monotonic `revision`, TTL과 `poke_lounge_room_command` 영수증으로 유지된다. mutation은 같은 트랜잭션에서 revision 비교, 상태 저장, 명령 영수증 저장을 완료한다. API 프로세스 재시작 뒤에도 room과 idempotent response가 복구되며 Redis나 메모리 fallback은 없다.

- `POST /poke-lounge/rooms`와 `POST /poke-lounge/rooms/:roomCode/{join,ready,party-snapshot,result,leave}`는 `X-Idempotency-Key: <UUID v4>`와 `If-Match-Revision: <non-negative integer>`를 각각 정확히 한 번 요구한다. create의 revision은 `0`이어야 한다.
- `GET /poke-lounge/rooms/:roomCode?afterRevision=<revision>`은 초기 hydration과 Socket 장애 복구용 committed snapshot을 반환한다.
- Socket.IO namespace `/poke-lounge`는 `room.subscribe`를 받고 `room.snapshot` 또는 `room.revision-conflict`를 보낸다. 구독에는 `roomCode`, `playerId`, `sessionId`, `afterRevision`이 필요하다.
- `POST /poke-lounge/rooms/:roomCode/competitive-seat`와 `POST /poke-lounge/rooms/:roomCode/matches/:matchId/actions`는 `Authorization: Bearer <Google ID token>` 인증이 필요하다.
- 경쟁 좌석은 서로 다른 인증 계정 두 개에만 배정된다. 각 계정은 자기 player action만 제출하고, 서버가 `@vscoke/poke-lounge-battle`의 seed/state/turn을 전진시킨다.
- casual room `POST .../result`와 일반 `POST /game/result`는 client-asserted unranked 경로다. 서버 경쟁 room의 결과를 일반 score 제출로 대체하지 않는다.

상세 데이터 흐름과 운영 제약은 [Poke Lounge Hardening Report](../../docs/poke-lounge-hardening-report.md), 랭킹 정책은 [Game Score Policy](../../docs/game-score-policy.md)를 따른다.

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
