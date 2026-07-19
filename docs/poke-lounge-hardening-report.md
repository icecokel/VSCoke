# Poke Lounge Hardening Report

확인 기준일: 2026-07-16

구현 기준: 현재 작업 트리. 아래 브라우저 artifact의 base commit은 `e9abbb36`이다.

## 결론

Poke Lounge의 저장 hydration, room durability, committed transport, 2~6인 canonical bracket, 순차 2인 authority match, verified-only ranking과 migration/CI 기반은 구현됐다. 공개 배포 상태는 별도 provenance 문제로 **BLOCKED**이며 기술 완료는 asset 권리 승인이 아니다.

### Historical S1 correction: HXN3RA is not release evidence

`HXN3RA`는 서버와 DB 관점에서는 첫 authority match terminal, bracket 전진, round 2 assignment가 올바르게 commit된 **PASS**였다. 하지만 브라우저 수렴은 **FAIL (S1)** 이었다. seed 4는 이전 BattleScene에서 `result = null`인 대기 상태에 남았고, seed 5는 이전 match의 승리 결과를 보았지만 ended confirmation이 조기 반환되어 WorldScene과 다음 assignment로 진행하지 못했다.

당시 C3/C4/C5는 REST room을 다섯 tester의 상태처럼 기록해 browser scene, battle result, active competitive match를 증명하지 못했다. 따라서 그 PASS는 false positive이며, `HXN3RA`는 backend/DB PASS · client convergence S1 FAIL로만 보관한다. 아래 targeted/release run의 C3T/C4T context 증거만 이 수정의 release 판정 근거다.

## 현재 데이터 흐름

로그인 Web은 Phaser와 autosave를 시작하기 전에 bearer 인증으로 `GET /game/poke-lounge/state`를 호출한다. 응답은 `version: 1`, `game: "poke-lounge"` snapshot으로 검증·sanitize한 뒤 local-player store에 한 번에 hydrate한다. 서버 snapshot이 없거나 사용자가 익명이면 versioned `sessionStorage` snapshot이 fallback이다. 인증 GET이 실패하면 local fallback으로 게임을 열되 원격 PUT autosave는 retry 전까지 시작하지 않는다. token 변경과 실제 unmount/remount 사이에는 모듈 범위 lifecycle barrier를 공유하므로 이전 인스턴스의 진행 중 PUT과 final PUT이 끝난 뒤 새 GET을 시작한다. legacy `localStorage` key는 제거된다.

서버 room은 API 프로세스 Map이 아니라 PostgreSQL에 저장된다.

- `poke_lounge_room`: JSONB aggregate, monotonic revision, TTL, 생성/수정 시각
- `poke_lounge_room_command`: actor/idempotency key, request hash, response snapshot/revision receipt
- mutation transaction: room load, receipt/hash 확인, expected revision 비교, revision 증가, snapshot/receipt 저장, commit
- same-key same-request retry: durable response replay
- same-key changed-request 또는 stale revision: conflict

Web은 REST GET으로 initial/current snapshot을 읽고 Socket.IO `/poke-lounge`의 committed `room.snapshot`을 적용한다. 정상 연결 중 750 ms polling은 없다. terminal commit 뒤의 public snapshot은 서로 다른 두 역할을 함께 담는다. `competitiveTransitions`는 완료된 이전 assignment의 terminal event/revision과 projection이고, optional `competitive`는 현재 assignment만 나타낸다. `competitive`가 없는 경우는 생략하며 `null`로 대체하지 않는다.

서버는 terminal metadata, bracket 전진, 다음 assignment, 적용 가능한 receipt를 한 transaction으로 commit하고 commit 뒤에 composite snapshot 하나만 발행한다. recovery GET 또는 Socket subscribe에 `afterRevision`이 있으면 해당 terminal cursor 이후의 완료 transition을 revision/event ID 순으로 최대 8개 반환한다. 초기 GET/subscription에는 과거 transition을 넣지 않는다.

Web transport는 current assignment와 최근 terminal transition cache를 분리한다. transition은 listener 유무와 관계없이 event ID/match ID로 dedup·cache하고, terminal을 먼저 적용한 뒤에만 `lastAppliedTerminalRevision`을 전진시킨다. 같은 페이지의 Socket reconnect와 mismatch recovery는 이 terminal cursor를 `afterRevision`으로 유지한다. full page reload는 initial room revision에서 새 baseline을 만든다. malformed/mismatched transition은 cursor를 전진시키지 않고 bounded recovery를 다시 요청한다.

Web CSP의 `connect-src`는 허용된 HTTP(S) API origin과 이에 대응하는 WS(S) origin을 함께 생성한다. 이로써 Socket.IO WebSocket transport가 CSP에 막히지 않으며, HTTP(S)가 아닌 API scheme은 허용 목록에 넣지 않는다.

`WorldScene`은 Phaser orchestration을 유지하고 다음 collaborator를 조합한다.

- `world-scene-hud.ts`
- `world-scene-interactions.ts`
- `world-scene-tournament.ts`
- `world-scene-encounters.ts`

## 경쟁 권위 모델과 다인 bracket

서버 room은 2~6인 공통 bracket을 canonical snapshot으로 보관한다. Web은 이 bracket을 검증·표시하며 참가자 배열로 다시 계산하지 않는다. 5인 첫 round는 `seed 4 vs 5`, `seed 1/3/2 bye`이고 서버가 한 번에 하나의 2인 match만 활성화한다. stable bracket match ID와 DB authority UUID `matchId`는 별도 값이다.

공개 랭킹 대상 `ranked-head-to-head` match는 정확히 두 개의 서로 다른 participant/session과 서로 다른 인증 계정 두 개를 요구한다. 다인 bracket에서 두 좌석이 바인딩된 match는 `tournament-unranked` kind로 같은 서버 권위 엔진을 사용한다. terminal과 bracket 전진은 같은 transaction에서 반영하지만 `game_history`를 쓰지 않는다. authority가 준비되지 않은 match는 casual `/result`로 진행하며 역시 공개 랭킹 근거가 아니다.

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

### 5인 실제 통합 게이트

2026-07-16 최종 게이트는 mock room/action transport 없이 실제 Nest API, PostgreSQL과 Socket.IO를 사용했다. 단일 Playwright test가 아래 다섯 격리 context를 동시에 열었다.

| 테스터 | 엔진/화면               | 입력     | 첫 round 역할         |
| ------ | ----------------------- | -------- | --------------------- |
| 1      | Desktop Chromium        | keyboard | host, seed 1 bye      |
| 2      | Desktop Firefox         | keyboard | seed 2 bye, cold reload |
| 3      | Desktop WebKit          | keyboard | seed 3 bye            |
| 4      | Mobile Chromium/Pixel 7 | touch    | seed 4 first match    |
| 5      | Mobile WebKit/iPhone 13 | touch    | seed 5 first match    |

검증 checkpoint는 C0 다섯 identity/participant, C1 `seed 4 vs 5`와 `seed 1/3/2 bye`, C2 실제 touch authority action, C3T 두 first-match participant의 old-match terminal/result 선관측, C4T 다음 assignment scene/store 수렴, C5 DB/REST/Socket 최종 단언이다. 모바일 전투는 active slot HP와 생존 slot을 서버의 최신 authority projection에서 읽고 실제 방향키/A/B touch control로 강제 교체까지 진행한다.

targeted-18과 이후 세 fresh release run은 workers 1, retries 0으로 모두 통과했다. release run은 매번 별도 run ID, fresh room/DB reset, API process, Web process, Next dist/artifact lifecycle을 사용했다.

| run ID | 테스터 PASS | action 수 (move/switch) | 강제 교체 (client/DB) | C3T/C4T 기록 | 결과 |
| --- | ---: | ---: | ---: | ---: | --- |
| `terminal-convergence-targeted-18` | 5/5 | 30 (15/15) | 1/15 | 10/5 | PASS |
| `terminal-convergence-release-01` | 5/5 | 34 (19/15) | 1/15 | 10/5 | PASS |
| `terminal-convergence-release-02` | 5/5 | 32 (17/15) | 1/15 | 10/5 | PASS |
| `terminal-convergence-release-03` | 5/5 | 34 (19/15) | 1/15 | 10/5 | PASS |

네 run 모두 seat 5, distinct account 5, `game_history` 0, completed match 1, pending next match 1, network error 0을 기록했다. C3T는 seed 4/5의 pre-confirm terminal과 post-confirm record를 포함해 run당 10건, C4T는 다섯 context의 다음 assignment 판정으로 run당 5건을 남겼다. seed 1/5의 next BattleScene launch는 각각 1회이고 seed 2/3/4는 0회였다. Firefox full reload와 same-page Socket reconnect gate도 매 run PASS였다.

Clean committed contract gate는 **pending local commit**이다. 현재 worktree의 생성 OpenAPI/Web type 파일이 clean하지 않아 `pnpm check:api-contract`는 실행하지 않았으며, 의도한 contract 변경을 commit한 뒤 clean 상태에서 별도로 실행해야 한다.

각 run에는 environment, runner/API log, matrix, DB/Socket checkpoint, network error, forced-switch, client terminal convergence, 다섯 tester Markdown, 다섯 screenshot artifact가 있다. 각 artifact에서 connection URL/userinfo, password value, DB username, bearer/ID token/session, raw Socket payload를 검색한 결과는 항목별 0건이었다. Mobile WebKit probe는 `maxTouchPoints = 0`이어도 iPhone user agent와 coarse pointer가 true라 touch UI가 표시됐고 실제 WebKit touch 전투가 통과했다.

```bash
pnpm test:poke-lounge-battle
pnpm test:api
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @vscoke/api migration:run:test
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm test:api:e2e
pnpm check:api-contract
pnpm type:check:web
pnpm lint
pnpm build
pnpm --filter @vscoke/web e2e -- tests/e2e/poke-lounge-autosave.spec.ts tests/e2e/poke-lounge-state-hydration.spec.ts tests/e2e/poke-lounge-multiplayer.spec.ts --project=chromium
PLAYWRIGHT_ENABLE_CROSS_BROWSER=1 pnpm --dir apps/web exec playwright test tests/e2e/poke-lounge-mobile.spec.ts --project=webkit-mobile-lg --list
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @vscoke/web e2e:integration -- tests/e2e/poke-lounge-five-player-tournament.spec.ts
```

5인 브라우저 검증은 단일 Playwright test가 세 browser engine에서 다섯 격리 context를 직접 연다. 테스트 전용 Nest bootstrap만 `e2e-user-1`부터 `e2e-user-5` identity를 제공하며 production bootstrap에는 우회 로직을 추가하지 않는다. runner, migration, API, Web, Playwright 환경은 분리한다. 테스트 DB URL은 migration에만, 파생 DB 접속 변수는 API에만 전달하며 Web과 Playwright child는 DB 변수·URL·비밀번호를 받지 않는다. Playwright의 DB 단언은 테스트 전용 API endpoint를 통해서만 수행한다. API production build는 이 bootstrap을 제외하고 dist에서 파일명, 정적 token과 `__e2e` endpoint 문자열을 재검사한다. 각 실행은 환경 JSON, DB/Socket checkpoint, 네트워크 오류, 스크린샷과 테스터별 Markdown을 `output/playwright/poke-lounge-five-player/<run-id>/`에 남긴다. 파일로 저장하는 runner/API 로그에서는 테스트 DB URL·비밀번호와 E2E token/session을 redaction한다.

Known constraints:

- 공개 랭킹을 만드는 verified model은 정확히 두 인증 계정의 `ranked-head-to-head`만 지원한다.
- multi tournament authority는 서버 전투 결과를 사용하지만 의도적으로 unranked다.
- anonymous, casual tournament와 solo는 client-asserted unranked다.
- PostgreSQL은 room/receipt source of truth지만 multi-instance Socket fan-out adapter는 없다.
- 운영형 lobby/matchmaking UX는 구현 범위가 아니다.
- 운영 migration은 자동 deploy step이 아니라 수동 maintenance posture다.
- provenance checker는 명시적 strict 환경에서만 release blocker다.

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
- `pnpm check:poke-lounge-provenance`: 오디오 9개 행은 CC0 교체 후 승인됐고, 나머지 57개 비오디오 항목 때문에 의도대로 실패

로컬 database 재검증은 Homebrew PostgreSQL 17.10에서 수행했다. PR workflow의 PostgreSQL 16 service와 pgvector 설치 절차는 유지되며, 버전별 migration 근거는 [Stage 4B 검증 기록](./poke-lounge-stage-4b-report.md)과 CI에서 함께 확인한다.

## Release 상태

[Poke Lounge Release Gate](./poke-lounge-release-gate.md)의 provenance 상태는 계속 `UNRESOLVED`다. 기본 Vercel 빌드는 이 상태로 자동 차단하지 않지만, 이는 법률 결론이나 권리 승인이 아니다. 런타임 오디오는 CC0 소스로 교체했으며 Pokémon 이름/표장, ROM-derived data, 출처 불명 sprite/texture/map, ported code의 권리 상태는 owner/legal review가 필요하다.

기존 hardening 범위의 계획 대비 상태는 [Poke Lounge Hardening Implementation Plan](./superpowers/plans/2026-07-10-poke-lounge-hardening.md)에 기록한다. 이번 terminal client convergence 수정의 Tasks 0~6 완료 상태와 release 근거는 [Poke Lounge Terminal Client Convergence Fix Implementation Plan](./superpowers/plans/2026-07-16-poke-lounge-terminal-client-convergence-fix.md)에 기록한다.
