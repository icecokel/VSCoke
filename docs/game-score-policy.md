# Game Score Policy

확인 기준일: 2026-06-20

이 문서는 `POST /game/result`로 저장되는 공개 랭킹 점수의 서버 검증 기준을 정리한다.

## 현재 정책

현재 API에 등록된 게임 타입은 `SKY_DROP` 하나다.

| gameType | score min | score max | playTime min | playTime max | max score/sec |
| -------- | --------- | --------- | ------------ | ------------ | ------------- |
| SKY_DROP | 1         | 100000    | 1초          | 86400초      | 2000          |

서버는 다음 조건을 강제한다.

- `score`는 정수여야 한다.
- `score`는 게임별 최소/최대 범위 안에 있어야 한다.
- `playTime`은 선택값이지만, 제출되면 정수와 범위를 검증한다.
- `playTime`이 제출되면 `score / playTime`이 게임별 초당 최대 점수를 넘을 수 없다.
- 랭킹, 최고 점수, 등수 산정은 위 정책에 맞는 기존 기록만 사용한다.

## 운영 정리 기준

이미 저장된 비정상 기록은 즉시 삭제하기보다 먼저 랭킹 산정에서 제외한다. 실제 DB 정리는 사용자 영향과 공유 링크 영향을 확인한 뒤 운영자가 실행한다.

확인 쿼리:

```sql
SELECT id, score, "playTime", "gameType", "userId", "createdAt"
FROM game_history
WHERE "gameType" = 'SKY_DROP'
  AND (
    score < 1
    OR score > 100000
    OR (
      "playTime" IS NOT NULL
      AND (
        "playTime" < 1
        OR "playTime" > 86400
        OR score > "playTime" * 2000
      )
    )
  )
ORDER BY "createdAt" DESC;
```

정리 방식은 삭제보다 별도 백업 후 삭제를 기본으로 한다.

```sql
CREATE TABLE IF NOT EXISTS game_history_invalid_backup AS
SELECT *
FROM game_history
WHERE false;

INSERT INTO game_history_invalid_backup
SELECT *
FROM game_history
WHERE "gameType" = 'SKY_DROP'
  AND (
    score < 1
    OR score > 100000
    OR (
      "playTime" IS NOT NULL
      AND (
        "playTime" < 1
        OR "playTime" > 86400
        OR score > "playTime" * 2000
      )
    )
  );
```

삭제는 백업 건수와 대상 건수를 대조한 뒤 별도 운영 작업으로 수행한다.

## 한계

이 정책은 명백한 조작값과 기존 오염 기록의 랭킹 반영을 막는 1차 방어선이다. 클라이언트 위조 자체를 더 강하게 줄이려면 서버 발급 게임 세션, nonce, challenge 검증을 별도 기능으로 설계해야 한다.
