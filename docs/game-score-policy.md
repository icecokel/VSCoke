# Game Score Policy

확인 기준일: 2026-07-16

이 문서는 `POST /game/result`로 저장되는 공개 랭킹 점수의 서버 검증 기준을 정리한다. 현재 정책의 source of truth는 `apps/api/src/game/game-score-policy.ts`다.

## 현재 정책

현재 API에서 영속 랭킹으로 저장하는 게임 타입은 `SKY_DROP`이다. Wordle은 현재 `POST /game/result` 랭킹 저장 타입에 포함되지 않는다.

| gameType | score min | score max | playTime min | playTime max | max score/sec |
| -------- | --------- | --------- | ------------ | ------------ | ------------- |
| SKY_DROP | 1         | 100000    | 1초          | 86400초      | 2000          |

서버는 다음 조건을 강제한다.

- `score`는 정수여야 한다.
- `score`는 게임별 최소/최대 범위 안에 있어야 한다.
- `playTime`은 선택값이지만, 제출되면 정수와 범위를 검증한다.
- `playTime`이 제출되면 `score / playTime`이 게임별 초당 최대 점수를 넘을 수 없다.
- 정책이 등록되지 않은 `gameType`은 저장을 거부한다.
- 랭킹, 최고 점수, 등수 산정은 위 정책에 맞는 기존 기록만 사용한다.

## 운영 정리 기준

이미 저장된 비정상 기록은 즉시 삭제하기보다 먼저 랭킹 산정에서 제외한다. 실제 DB 정리는 사용자 영향과 공유 링크 영향을 확인한 뒤 운영자가 실행한다.

확인 쿼리:

```sql
WITH policy(game_type, min_score, max_score, min_play_time, max_play_time, max_score_per_second) AS (
  VALUES
    ('SKY_DROP', 1, 100000, 1, 86400, 2000)
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
    ('SKY_DROP', 1, 100000, 1, 86400, 2000)
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

일반 `POST /game/result`의 범위/속도 정책은 client-asserted 입력에 대한 1차 plausibility 방어선이며 경쟁 증명이 아니다.
