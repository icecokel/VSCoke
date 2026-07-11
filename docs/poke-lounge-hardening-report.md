# Poke Lounge Hardening Report

확인 기준일: 2026-07-11

구현 기준: `7d3d102` (`test(poke-lounge):권위 배틀 진입 대기 안정화`)

## 결론

Poke Lounge의 저장 hydration, room durability, committed transport, 정확히 2명의 인증 경쟁 match, verified-only ranking과 migration/CI 기반은 구현됐다. 공개 배포 상태는 별도 provenance 문제로 **BLOCKED**이며 기술 완료는 asset 권리 승인이 아니다.

## 현재 데이터 흐름

로그인 Web은 Phaser와 autosave를 시작하기 전에 bearer 인증으로 `GET /game/poke-lounge/state`를 호출한다. 응답은 `version: 1`, `game: "poke-lounge"` snapshot으로 검증·sanitize한 뒤 local-player store에 한 번에 hydrate한다. 서버 snapshot이 없거나 사용자가 익명이면 versioned `sessionStorage` snapshot이 fallback이다. 인증 GET이 실패하면 local fallback으로 게임을 열되 원격 PUT autosave는 retry 전까지 시작하지 않는다. token 변경과 실제 unmount/remount 사이에는 모듈 범위 lifecycle barrier를 공유하므로 이전 인스턴스의 진행 중 PUT과 final PUT이 끝난 뒤 새 GET을 시작한다. legacy `localStorage` key는 제거된다.

서버 room은 API 프로세스 Map이 아니라 PostgreSQL에 저장된다.

- `poke_lounge_room`: JSONB aggregate, monotonic revision, TTL, 생성/수정 시각
- `poke_lounge_room_command`: actor/idempotency key, request hash, response snapshot/revision receipt
- mutation transaction: room load, receipt/hash 확인, expected revision 비교, revision 증가, snapshot/receipt 저장, commit
- same-key same-request retry: durable response replay
- same-key changed-request 또는 stale revision: conflict

Web은 REST GET으로 initial/current snapshot을 읽고 Socket.IO `/poke-lounge`의 committed `room.snapshot`을 적용한다. reconnect, outage 또는 `room.revision-conflict`에서는 마지막 revision 이후 REST GET으로 복구한다. 정상 연결 중 750 ms polling은 없다.

`WorldScene`은 Phaser orchestration을 유지하고 다음 collaborator를 조합한다.

- `world-scene-hud.ts`
- `world-scene-interactions.ts`
- `world-scene-tournament.ts`
- `world-scene-encounters.ts`

## 경쟁 권위 모델

공개 랭킹 대상 경쟁 match는 정확히 두 개의 서로 다른 participant/session과 서로 다른 인증 계정 두 개를 요구한다. 추가 참가자, 익명 참가자, 기존 multi-player tournament와 solo는 casual unranked 경로다.

두 seat가 바인딩되면 서버가 seed, ruleset version/hash, canonical state와 turn을 보관한다. 각 계정은 자기 player의 현재 turn action만 제출할 수 있다. Web과 API는 workspace package `@vscoke/poke-lounge-battle`의 canonical state, PRNG와 resolver를 공유하지만 권위 state 전진과 terminal 판정은 서버가 수행한다.

terminal 시 서버가 승자 100점, 패자 50점을 확정한다. 다음 항목은 같은 PostgreSQL transaction에서 기록된다.

1. 두 action의 durable receipts
2. match terminal/status/state hash와 history publication mapping
3. 두 `game_history` row의 `resultTrust = 'verified-room'`
4. 서버 생성 `sourceKey = roomId:matchId:userId`

commit 이후에만 Socket snapshot을 발행한다. writer/source 충돌은 전체 transaction을 rollback하고 같은 command retry는 저장된 pending/resolved receipt에서 이어진다. 세부 원자성과 race 검증은 [Poke Lounge Stage 4B Report](./poke-lounge-stage-4b-report.md)에 기록되어 있다.

일반 `POST /game/result`와 casual `POST /poke-lounge/rooms/:roomCode/result`는 언제나 client-asserted unranked다. Web은 server room 결과를 generic score endpoint로 다시 제출하지 않는다. `GET /game/ranking?gameType=POKE_LOUNGE`는 `verified-room` row만 사용자 최고 점수와 등수 계산에 사용하며 응답은 점수, 등수, 생성 시각, 표시 이름만 노출한다. 내부 user 식별자, email, access token, result trust와 source key는 직렬화하지 않는다.

## API와 전송 계약

| 경로                                                         | 인증/입력                  | 역할                                   |
| ------------------------------------------------------------ | -------------------------- | -------------------------------------- |
| `GET /game/poke-lounge/state`                                | bearer 필수                | Phaser 이전 account save hydration     |
| `PUT /game/poke-lounge/state`                                | bearer 필수                | versioned local-player autosave        |
| `POST /poke-lounge/rooms`                                    | idempotency + revision `0` | durable room 생성                      |
| `GET /poke-lounge/rooms/:roomCode?afterRevision=n`           | 공개 room identity         | initial/recovery committed snapshot    |
| `POST /poke-lounge/rooms/:roomCode/join`                     | idempotency + revision     | casual participant 참가                |
| `POST /poke-lounge/rooms/:roomCode/ready`                    | idempotency + revision     | ready mutation                         |
| `POST /poke-lounge/rooms/:roomCode/party-snapshot`           | idempotency + revision     | validated casual party snapshot        |
| `POST /poke-lounge/rooms/:roomCode/result`                   | idempotency + revision     | casual client-asserted unranked result |
| `POST /poke-lounge/rooms/:roomCode/leave`                    | idempotency + revision     | participant leave/forfeit mutation     |
| `POST /poke-lounge/rooms/:roomCode/competitive-seat`         | bearer 필수                | authenticated 2-seat binding           |
| `POST /poke-lounge/rooms/:roomCode/matches/:matchId/actions` | bearer 필수                | own current-turn competitive action    |

Room mutation header는 `X-Idempotency-Key: <canonical UUID v4>`와 `If-Match-Revision: <non-negative safe integer>`를 각각 정확히 한 번 요구한다. Socket namespace `/poke-lounge`는 `{ roomCode, playerId, sessionId, afterRevision }`의 `room.subscribe`를 받고 `room.snapshot`, `room.revision-conflict` 또는 generic subscription rejection을 반환한다.

## Migration과 배포

`CreateLegacyCoreSchema1759999999999`는 strict adopt-or-create baseline이다. legacy core 세 객체가 모두 없으면 canonical schema를 만들고, 모두 있으면 열/타입/nullability/default/PK/FK/index/enum/ledger가 허용된 형태와 정확히 일치할 때만 채택한다. partial/mismatch는 수정 없이 실패하며 `down`은 irreversible이다.

PostgreSQL test data source는 `TEST_DATABASE_URL`을 필수로 요구하고 `_test` database suffix, regular DB URL과의 target 분리, `synchronize: false`를 강제한다. PR API job은 PostgreSQL 16 service와 pgvector를 준비하고 test migration show/run 후 integration/E2E를 실행한다. E2E suite는 같은 격리 DB의 truncate/transaction fixture가 suite 사이에 경합하지 않도록 `--runInBand`로 실행한다.

운영 deploy workflow는 migration을 자동 실행하지 않는다. 최초 onboarding과 후속 migration은 backup, schema/ledger dump, `migration:show`, maintenance window의 수동 `migration:run`, post-run ledger 확인 순서로 수행한다. mismatch를 drop/alter, 자동 repair나 ledger 수동 삽입으로 우회하지 않는다.

## 검증과 제약

구현 단계에서는 shared engine unit, API unit, PostgreSQL integration/E2E, Web type/lint/build, autosave/hydration/multiplayer Playwright와 local OpenAPI contract를 검증했다. 현재 반복 명령은 다음과 같다.

```bash
pnpm test:poke-lounge-battle
pnpm test:api
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test pnpm --filter @vscoke/api migration:run:test
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test pnpm test:api:e2e
pnpm check:api-contract
pnpm type:check:web
pnpm lint
pnpm build
pnpm --filter @vscoke/web e2e -- tests/e2e/poke-lounge-autosave.spec.ts tests/e2e/poke-lounge-state-hydration.spec.ts tests/e2e/poke-lounge-multiplayer.spec.ts --project=chromium
```

Known constraints:

- competitive verified model은 정확히 두 인증 계정만 지원한다.
- anonymous, extra participant, multi tournament와 solo는 client-asserted unranked다.
- PostgreSQL은 room/receipt source of truth지만 multi-instance Socket fan-out adapter는 없다.
- 운영형 lobby/matchmaking UX는 구현 범위가 아니다.
- 운영 migration은 자동 deploy step이 아니라 수동 maintenance posture다.
- provenance checker의 실패는 의도된 release blocker다.

### Final documentation audit

2026-07-11 문서 감사에서 다음 검증을 새로 실행했다.

- `pnpm test:poke-lounge-battle`: 4 suites, 51 tests 통과
- `pnpm test:api -- --runInBand`: 56 suites, 336 tests 통과
- PostgreSQL 17.10 + pgvector 격리 `_test` DB: migration 10개 적용, integration/E2E 9 suites, 71 tests 통과
- `pnpm check:poke-lounge-battle-resolution`: types/runtime workspace resolution 통과
- `pnpm check:api-contract`: OpenAPI와 Web generated type 재생성 후 tracked diff 없음
- `pnpm type:check:web`, `pnpm lint`, `pnpm build`: 통과
- Poke Lounge Chromium E2E: autosave/hydration/game 70 tests와 multiplayer 48 tests 통과; 실제 unmount/remount와 400 응답 후 fresh projection 복구 회귀 포함
- 전체 tracked Markdown/README와 이 보고서의 상대 링크 target 검사: 63 files 통과
- 변경 문서 Prettier와 `git diff --check`: 통과
- `pnpm check:poke-lounge-provenance`: 의도대로 실패; 첫 미승인 항목은 `assets/poke-lounge/audio/audio-manifest.json`

로컬 database 재검증은 Homebrew PostgreSQL 17.10에서 수행했다. PR workflow의 PostgreSQL 16 service와 pgvector 설치 절차는 유지되며, 버전별 migration 근거는 [Stage 4B 검증 기록](./poke-lounge-stage-4b-report.md)과 CI에서 함께 확인한다.

## Release 상태

[Poke Lounge Release Gate](./poke-lounge-release-gate.md)는 계속 `Status: BLOCKED`다. 이 보고서는 법률 결론을 내리지 않는다. Pokémon 이름/표장, ROM-derived audio/data, 출처 불명 sprite/texture/map, ported code의 권리 상태는 owner/legal review가 필요하다. 모든 asset row의 승인 근거와 SHA-256, reviewer/date/attribution, release-owner sign-off가 기록되기 전에는 route와 asset을 공개 배포하지 않는다.

구현 작업의 계획 대비 상태는 [Poke Lounge Hardening Implementation Plan](./superpowers/plans/2026-07-10-poke-lounge-hardening.md)에 기록한다.
