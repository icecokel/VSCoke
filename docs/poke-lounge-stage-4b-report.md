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

## 공개 경쟁 프로젝션

REST 방 복구, 경쟁 좌석 응답, 액션 응답, Socket committed event는 동일한 서버 프로젝션을 사용한다. 프로젝션에는 다음 항목만 포함한다.

- `matchId`, `assignmentRevision`, `rulesetVersion`, `rulesetHash`
- 현재 turn, status, state hash, terminal
- 정렬된 두 player ID와 현재 turn에 영수증이 저장된 `submittedPlayerIds`
- 고정 ruleset 식별 정보와 active slot, HP, PP, status로 제한한 현재 배틀 상태

server seed, account ID, session ID, 전체 액션 영수증, client command ID, history ID와 감사 매핑은 공개하지 않는다. REST 복구는 매치와 현재 turn 영수증을 PostgreSQL에서 다시 읽어 프로젝션을 구성하므로 프로세스 재시작 뒤에도 Socket payload와 같은 상태를 반환한다.

두 번째 인증 좌석이 매치를 생성하면 방 revision을 같은 트랜잭션에서 증가시키고 commit 이후 `competitive-assignment-committed` 이벤트를 발행한다. 각 pending/resolved 액션도 commit 이후 최신 프로젝션을 발행하며 롤백과 idempotent replay는 이벤트를 발행하지 않는다.

## 스키마

`1794441600000-add-competitive-history-publication` migration은 `poke_lounge_competitive_match.history_publication` nullable JSONB 컬럼을 추가한다. 기존 행은 `NULL`을 유지한다. 엔티티 컬럼은 `select: false`이며 공개 DTO에 포함되지 않는다. migration timestamp와 class identity는 전체 migration 집합에서 유일해야 한다.

## 검증 기준

- API unit 전체 통과
- API lint와 build 통과
- battle engine test와 build 통과
- 실제 PostgreSQL에서 writer 실패 롤백, 재시도 1회 발행, source 충돌, 재시작 replay, 랭킹 반영 검증
- 실제 PostgreSQL에서 두 번째 좌석 알림, pending submitted player IDs, REST 재시작 복구, 공개 필드 redaction 검증
- `git diff --check` 통과
