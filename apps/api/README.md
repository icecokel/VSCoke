# VSCoke API

`apps/api`는 VSCoke monorepo의 NestJS 백엔드 앱이다. 웹 앱(`apps/web`)이 사용하는 공개 API, 게임 점수/랭킹, 취미 데이터, Poke Lounge 서버 룸, 이력 RAG chat API를 제공한다.

## 기술 스택

- Node.js 20 이상
- NestJS 11
- TypeScript
- TypeORM + PostgreSQL, Redis
- Swagger UI `/api`, OpenAPI JSON `/api-json`
- Winston logging
- Google ID token 인증 guard

## 주요 모듈

| 모듈            | 주요 endpoint                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| App             | `GET /`, `GET /health`                                                                                              |
| Recipe          | `GET /recipes`, `GET /recipes/:id`                                                                                  |
| EspressoHistory | `GET /espresso-history/beans`, `GET /espresso-history/beans/:id`                                                    |
| Game            | `POST /game/result`, `GET /game/ranking`, `GET /game/result/:id`, `GET/PUT /game/poke-lounge/state`                 |
| PokeLounge      | transient room commands, competitive seat/action APIs, `GET /poke-lounge/rooms/:roomCode`, Socket.IO `/poke-lounge` |
| Resume RAG      | `POST /resume-rag/chat`                                                                                             |
| Wordle          | `GET /wordle/word`, `POST /wordle/check`                                                                            |

## 로컬 실행

설치, 환경 변수, 실행과 검증 명령은 [Local Development](../../docs/local-development.md#api만-실행)를
따른다. API 환경 변수의 실제 목록은 `.env.example`에서 확인한다.

## OpenAPI 계약

프론트 타입은 현재 커밋의 controller/DTO에서 생성한 로컬 OpenAPI 계약을 기준으로 한다. 갱신
절차는 [Local Development의 API 타입 갱신](../../docs/local-development.md#api-타입-갱신)을
따른다.

## DB와 migration

운영에서는 `DB_SYNCHRONIZE=false`를 유지하고 schema 변경은 TypeORM migration으로 반영한다.
생성, dry run, 운영 반영과 rollback은 [API 배포 가이드](DEPLOY.md#3-db-schema-변경)를 따른다.

## Poke Lounge 계약

Poke Lounge의 방, 경쟁전, 명령 영수증과 로그인 계정 진행 상태는 Redis TTL 데이터다. 방 mutation은 Lua compare-and-set으로 revision, snapshot과 영수증을 원자적으로 갱신한다. API 프로세스가 재시작되어도 TTL 안에서는 복구되지만 Redis 데이터가 만료되면 복구하지 않으며 PostgreSQL에는 Poke Lounge 플레이 상태나 결과를 새로 저장하지 않는다.

- `POST /poke-lounge/rooms`와 `POST /poke-lounge/rooms/:roomCode/{join,ready,party-snapshot,result,leave}`는 `X-Idempotency-Key: <UUID v4>`와 `If-Match-Revision: <non-negative integer>`를 각각 정확히 한 번 요구한다. create의 revision은 `0`이어야 한다.
- `GET /poke-lounge/rooms/:roomCode?afterRevision=<revision>`은 초기 hydration과 Socket 장애 복구용 committed snapshot을 반환한다.
- Socket.IO namespace `/poke-lounge`는 `room.subscribe`를 받고 `room.snapshot` 또는 `room.revision-conflict`를 보낸다. 구독에는 `roomCode`, `playerId`, `sessionId`, `afterRevision`이 필요하다.
- `POST /poke-lounge/rooms/:roomCode/competitive-seat`와 `POST /poke-lounge/rooms/:roomCode/matches/:matchId/actions`는 `Authorization: Bearer <Google ID token>` 인증이 필요하다.
- 경쟁 좌석은 서로 다른 인증 계정 두 개에만 배정된다. 각 계정은 자기 player action만 제출하고, 서버가 `@vscoke/poke-lounge-battle`의 seed/state/turn을 전진시킨다.
- casual room `POST .../result`는 현재 방 안에서만 사용하는 unranked 경로다. 일반 `POST /game/result`는 Poke Lounge 결과를 거절하고 공개 Poke Lounge 랭킹은 빈 배열을 반환한다.

랭킹 정책은 [Game Score Policy](../../docs/game-score-policy.md)를 따른다.

Resume RAG와 메인 채팅의 동작·환경 변수·검증 기준은
[메인 채팅 AI 사용 지침](../../docs/main-chat-ai-usage-guide.md)을 따른다.

## 배포

배포 구조와 환경은 [Deployment and Environment Plan](../../docs/deployment-and-env.md), 실행 절차는
[DEPLOY.md](DEPLOY.md), 장애 대응은 [Operations Runbook](../../docs/operations-runbook.md)을 따른다.
