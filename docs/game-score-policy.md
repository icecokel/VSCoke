# Game Score Policy

확인 기준일: 2026-07-11

이 문서는 `POST /game/result`로 저장되는 공개 랭킹 점수의 서버 검증 기준을 정리한다. 현재 정책의 source of truth는 `apps/api/src/game/game-score-policy.ts`다.

## 현재 정책

현재 API에 등록된 랭킹용 게임 타입은 `SKY_DROP`, `POKE_LOUNGE`다. Fish Drift와 Wordle은 웹 게임 라우트가 있지만 현재 `POST /game/result` 랭킹 저장 타입에는 포함되지 않는다.

| gameType    | score min | score max | playTime min | playTime max | max score/sec |
| ----------- | --------- | --------- | ------------ | ------------ | ------------- |
| SKY_DROP    | 1         | 100000    | 1초          | 86400초      | 2000          |
| POKE_LOUNGE | 1         | 1000      | 1초          | 86400초      | 1000          |

서버는 다음 조건을 강제한다.

- `score`는 정수여야 한다.
- `score`는 게임별 최소/최대 범위 안에 있어야 한다.
- `playTime`은 선택값이지만, 제출되면 정수와 범위를 검증한다.
- `playTime`이 제출되면 `score / playTime`이 게임별 초당 최대 점수를 넘을 수 없다.
- 정책이 등록되지 않은 `gameType`은 저장을 거부한다.
- 랭킹, 최고 점수, 등수 산정은 위 정책에 맞는 기존 기록만 사용한다.

## Poke Lounge 결과 신뢰도

`game_history.resultTrust`는 Poke Lounge 결과의 생성 경계를 구분한다.

| 값                | 의미                                                              | Poke Lounge 공개 랭킹 |
| ----------------- | ----------------------------------------------------------------- | --------------------- |
| `client-asserted` | 일반 `POST /game/result`로 저장한 클라이언트 주장 결과            | 제외                  |
| `verified-room`   | 서버가 확정한 룸 종료 결과를 서버 전용 writer가 트랜잭션으로 기록 | 포함                  |
| `NULL`            | 신뢰도 분류를 적용하지 않는 다른 게임의 기존 동작                 | 기존 정책 유지        |

일반 게임 결과 DTO는 `resultTrust`와 `sourceKey`를 받지 않는다. `GameService.createHistory`는 Poke Lounge 일반 제출을 항상 `client-asserted`, `sourceKey = NULL`로 저장한다. 이 결과는 저장과 공유가 가능하지만 공개 Poke Lounge 랭킹에는 포함되지 않는다.

`verified-room`은 서버 전용 `VerifiedPokeLoungeHistoryWriter`만 기록한다. writer는 호출자가 제공한 임의 키를 받지 않고 서버의 `roomId`, `matchId`, 바인딩된 `userId`로 `roomId:matchId:userId` 형식의 `sourceKey`를 만든다. 같은 source key 재시도는 기존 행을 재사용하며, 기존 점수와 달라지면 충돌로 실패한다.

경쟁 액션 엔진이 종료 결과를 확정한 경우에만 두 계정의 이력을 액션 영수증, 매치 종료 상태, 비공개 history ID 감사 매핑과 같은 `EntityManager` 트랜잭션에서 발행한다. writer 실패나 source 충돌은 이 변경 전체를 롤백하며 Socket 이벤트는 commit 이후에만 발행한다. 캐주얼 룸 `/result`는 이 경로를 호출하지 않는다.

Poke Lounge 랭킹과 등수 쿼리는 각 사용자 최고 점수를 고르는 window 또는 집계 안에서 먼저 `resultTrust = 'verified-room'`을 적용한다. 따라서 더 높은 `client-asserted` 점수가 같은 사용자에게 있어도 최고 점수나 등수에 영향을 주지 않는다.

신뢰도 migration은 기존 `POKE_LOUNGE` 행 중 `resultTrust IS NULL`인 행만 `client-asserted`로 채운다. 다른 게임 행은 `NULL`로 유지하고 이미 분류된 값을 덮어쓰지 않는다.

## 운영 정리 기준

이미 저장된 비정상 기록은 즉시 삭제하기보다 먼저 랭킹 산정에서 제외한다. 실제 DB 정리는 사용자 영향과 공유 링크 영향을 확인한 뒤 운영자가 실행한다.

확인 쿼리:

```sql
WITH policy(game_type, min_score, max_score, min_play_time, max_play_time, max_score_per_second) AS (
  VALUES
    ('SKY_DROP', 1, 100000, 1, 86400, 2000),
    ('POKE_LOUNGE', 1, 1000, 1, 86400, 1000)
)
SELECT h.id, h.score, h."playTime", h."gameType", h."userId", h."createdAt"
FROM game_history h
LEFT JOIN policy p ON p.game_type = h."gameType"::text
WHERE p.game_type IS NULL
  OR h.score < p.min_score
  OR h.score > p.max_score
  OR (
    h."playTime" IS NOT NULL
    AND (
      h."playTime" < p.min_play_time
      OR h."playTime" > p.max_play_time
      OR h.score > h."playTime" * p.max_score_per_second
    )
  )
ORDER BY h."createdAt" DESC;
```

정리 방식은 삭제보다 별도 백업 후 삭제를 기본으로 한다.

```sql
CREATE TABLE IF NOT EXISTS game_history_invalid_backup AS
SELECT *
FROM game_history
WHERE false;

WITH policy(game_type, min_score, max_score, min_play_time, max_play_time, max_score_per_second) AS (
  VALUES
    ('SKY_DROP', 1, 100000, 1, 86400, 2000),
    ('POKE_LOUNGE', 1, 1000, 1, 86400, 1000)
)
INSERT INTO game_history_invalid_backup
SELECT h.*
FROM game_history h
LEFT JOIN policy p ON p.game_type = h."gameType"::text
WHERE p.game_type IS NULL
  OR h.score < p.min_score
  OR h.score > p.max_score
  OR (
    h."playTime" IS NOT NULL
    AND (
      h."playTime" < p.min_play_time
      OR h."playTime" > p.max_play_time
      OR h.score > h."playTime" * p.max_score_per_second
    )
  );
```

삭제는 백업 건수와 대상 건수를 대조한 뒤 별도 운영 작업으로 수행한다.

## 한계

이 정책은 명백한 조작값과 기존 오염 기록의 랭킹 반영을 막는 1차 방어선이다. 클라이언트 위조 자체를 더 강하게 줄이려면 서버 발급 게임 세션, nonce, challenge 검증을 별도 기능으로 설계해야 한다.
