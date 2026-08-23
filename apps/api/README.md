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

룸 상태는 PostgreSQL의 `poke_lounge_room` JSONB snapshot, monotonic `revision`, TTL과 `poke_lounge_room_command` 영수증으로 유지된다. mutation은 같은 트랜잭션에서 revision 비교, 상태 저장, 명령 영수증 저장을 완료한다. API 프로세스 재시작 뒤에도 room과 idempotent response가 복구되며 Redis나 메모리 fallback은 없다.

- `POST /poke-lounge/rooms`와 `POST /poke-lounge/rooms/:roomCode/{join,ready,party-snapshot,result,leave}`는 `X-Idempotency-Key: <UUID v4>`와 `If-Match-Revision: <non-negative integer>`를 각각 정확히 한 번 요구한다. create의 revision은 `0`이어야 한다.
- `GET /poke-lounge/rooms/:roomCode?afterRevision=<revision>`은 초기 hydration과 Socket 장애 복구용 committed snapshot을 반환한다.
- Socket.IO namespace `/poke-lounge`는 `room.subscribe`를 받고 `room.snapshot` 또는 `room.revision-conflict`를 보낸다. 구독에는 `roomCode`, `playerId`, `sessionId`, `afterRevision`이 필요하다.
- `POST /poke-lounge/rooms/:roomCode/competitive-seat`와 `POST /poke-lounge/rooms/:roomCode/matches/:matchId/actions`는 `Authorization: Bearer <Google ID token>` 인증이 필요하다.
- 경쟁 좌석은 서로 다른 인증 계정 두 개에만 배정된다. 각 계정은 자기 player action만 제출하고, 서버가 `@vscoke/poke-lounge-battle`의 seed/state/turn을 전진시킨다.
- casual room `POST .../result`와 일반 `POST /game/result`는 client-asserted unranked 경로다. 서버 경쟁 room의 결과를 일반 score 제출로 대체하지 않는다.

랭킹 정책은 [Game Score Policy](../../docs/game-score-policy.md)를 따른다.

Resume RAG와 메인 채팅의 동작·환경 변수·검증 기준은
[메인 채팅 AI 사용 지침](../../docs/main-chat-ai-usage-guide.md)을 따른다.

## 배포

배포 구조와 환경은 [Deployment and Environment Plan](../../docs/deployment-and-env.md), 실행 절차는
[DEPLOY.md](DEPLOY.md), 장애 대응은 [Operations Runbook](../../docs/operations-runbook.md)을 따른다.
