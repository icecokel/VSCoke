# Poke Lounge Stage 4B Report

확인 기준일: 2026-07-11

## 범위

Stage 4B는 서버 경쟁 액션 엔진이 확정한 종료 결과와 공개 랭킹 이력을 하나의 PostgreSQL 트랜잭션으로 연결한다. 클라이언트의 승자, 패자, 점수, 신뢰도, source key는 입력으로 사용하지 않는다. 캐주얼 `POST /poke-lounge/rooms/:roomCode/result`와 일반 `POST /game/result`는 기존처럼 `client-asserted`이며 검증 이력을 발행하지 않는다.

## 원자적 종료 발행

두 번째 액션이 턴을 해결하고 서버 엔진이 `terminal`을 반환하면 같은 `EntityManager` 트랜잭션에서 다음 항목을 처리한다.

1. 서버 엔진의 두 참가자와 경쟁 매치에 바인딩된 서로 다른 두 계정을 대조한다.
2. 승자 100점, 패자 50점을 `VerifiedPokeLoungeHistoryWriter`로 기록한다.
3. source key를 `roomId:matchId:userId`로 서버에서 생성한다.
4. 매치의 상태, 해시, 종료 사유, 완료 시각과 `historyIdByAccountId` JSONB 감사 매핑을 저장한다.
5. 해당 턴의 두 액션 영수증을 동일한 해결 응답으로 확정한다.

writer 오류나 source key 충돌은 전체 트랜잭션을 롤백한다. 이 경우 첫 영수증은 기존 pending 상태로 남고 두 번째 영수증, 종료 상태, 감사 매핑, 검증 이력은 저장되지 않으며 Socket 이벤트도 발행되지 않는다. 같은 명령 재시도는 정상 완료할 수 있고, 완료 후 명령 재전송이나 프로세스 재시작 후 재전송은 저장된 영수증을 반환하므로 이력을 다시 발행하지 않는다.

PostgreSQL 통합 테스트는 승자 계정 source key에 패자 점수 50을 미리 저장한 뒤 terminal 액션을 제출한다. 이 경우 기존 pending 영수증 한 건, active 매치, 기존 충돌 이력 한 건만 유지되고 room revision, terminal, publication mapping, 두 번째 영수증과 Socket 이벤트는 변경되지 않는다. 기존 이력을 서버 점수 100으로 교정한 뒤 같은 액션을 재시도하면 기존 history ID를 재사용하면서 상대 계정 이력 한 건만 추가하고 매치를 완료한다.

## 공개 경쟁 프로젝션

REST 방 복구, 경쟁 좌석 응답, 액션 응답, Socket committed event는 동일한 서버 프로젝션을 사용한다. 프로젝션에는 다음 항목만 포함한다.

- `matchId`, `assignmentRevision`, `rulesetVersion`, `rulesetHash`
- 현재 turn, status, state hash, terminal
- 정렬된 두 player ID와 현재 turn에 영수증이 저장된 `submittedPlayerIds`
- 고정 ruleset 식별 정보와 active slot, HP, PP, status로 제한한 현재 배틀 상태

server seed, account ID, session ID, 전체 액션 영수증, client command ID, history ID와 감사 매핑은 공개하지 않는다. REST 복구와 Socket subscription 초기 스냅샷은 room repository 작업이 commit된 뒤 별도의 `REPEATABLE READ` 트랜잭션에서 room, match, 현재 turn 영수증을 같은 `EntityManager`로 읽는다. 따라서 중첩 트랜잭션이나 room write lock을 유지한 상태의 projection read가 없다.

PostgreSQL race 테스트는 projection 트랜잭션이 room revision 7을 읽은 직후 두 번째 액션을 별도 트랜잭션에서 commit시킨다. 진행 중이던 조회는 revision 7, turn 0, submitted player A의 old-all 스냅샷을 반환하고, 다음 조회는 revision 8, turn 1, 빈 submitted IDs의 new-all 스냅샷을 반환한다. room revision과 competitive state가 서로 다른 commit에서 섞인 결과는 허용하지 않는다.

두 번째 인증 좌석이 매치를 생성하면 방 revision을 같은 트랜잭션에서 증가시키고 commit 이후 `competitive-assignment-committed` 이벤트를 발행한다. 각 pending/resolved 액션도 commit 이후 최신 프로젝션을 발행하며 롤백과 idempotent replay는 이벤트를 발행하지 않는다.

casual command 응답은 room command repository가 저장한 `responseState`와 `responseRevision`을 그대로 유지한다. 새 command commit 뒤 별도의 event snapshot을 조회해 current room revision이 command revision과 같으면 같은 revision에 competitive를 첨부하고, 그 사이 다음 commit이 완료되었으면 최신 consistent snapshot과 competitive를 발행한다. 따라서 HTTP 응답 revision을 새 revision으로 대체하지 않으면서도 오래된 competitive 없는 Socket 이벤트를 발행하지 않는다. idempotent replay는 projection 조회나 이벤트 발행 없이 저장된 snapshot을 그대로 반환하며, publisher 실패 시에도 fresh GET 또는 Socket subscription이 별도 consistent-current 조회로 복구한다.

PostgreSQL race 테스트는 rev7 command commit 직후 rev8 command를 commit·발행한 다음 rev7 event snapshot 조회를 진행한다. rev7 HTTP 응답과 replay는 rev7 참가자 상태와 revision을 유지하고 competitive를 포함하지 않는다. Socket에는 competitive가 포함된 rev8 이벤트만 두 번 발행되고 rev7 이벤트는 없으며, 후속 GET도 rev8 참가자 상태와 competitive projection을 반환한다.

## 스키마

`1794441600000-add-competitive-history-publication` migration은 `poke_lounge_competitive_match.history_publication` nullable JSONB 컬럼을 추가한다. 기존 행은 `NULL`을 유지한다. 엔티티 컬럼은 `select: false`이며 공개 DTO에 포함되지 않는다. migration timestamp와 class identity는 전체 migration 집합에서 유일하다. down 실행 시 non-null publication이 한 건이라도 있으면 예외를 발생시키며 PostgreSQL 통합 테스트에서 JSONB 값과 컬럼이 그대로 유지됨을 확인한다.

## 검증 결과

- Focused unit: 2 suites, 22 tests 통과
- API unit 전체: 56 suites, 336 tests 통과
- PostgreSQL integration: 2 suites, 16 tests 통과
- API lint와 build 통과
- OpenAPI contract 재생성 후 tracked contract diff 없음
- `git diff --check` 통과
