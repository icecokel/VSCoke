# Game Score Policy

확인 기준일: 2026-07-16

이 문서는 `POST /game/result`로 저장되는 공개 랭킹 점수의 서버 검증 기준을 정리한다. 현재 정책의 source of truth는 `apps/api/src/game/game-score-policy.ts`다.

이 문서는 현재 API 점수·공개 랭킹 구현 정책이다. 확정됐지만 아직 구현되지 않은 Poke Lounge
3라운드 누적 점수와 최종 우승 규칙은
[3라운드 챔피언십 규칙](./poke-lounge-rules/three-round-championship.md)을 따른다. 챔피언십
라운드 점수는 각 포켓몬의 `currentHp / maxHp * 100`을 합산하고 세 라운드 동안 누적한다.
기존 match 승패 점수와 토너먼트 순위 배점은 이 값에 포함하지 않는다. 방 안의 챔피언십
점수와 전역 공개 랭킹 반영 여부도 별개이며 챔피언십 누적 점수를 일반 `POST /game/result`로
제출하지 않는다.

## 현재 정책

현재 API에서 영속 랭킹으로 저장하는 게임 타입은 `SKY_DROP`이다. `POKE_LOUNGE`는 API enum 호환성을 유지하지만 결과 저장을 거절하며, Wordle도 현재 `POST /game/result` 랭킹 저장 타입에는 포함되지 않는다.

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

## Poke Lounge 결과 신뢰도

Poke Lounge 방, 경쟁전, action receipt, 결과와 로그인 진행 상태는 Redis TTL 범위에서만 유지한다.
서버는 결정론 엔진으로 전투와 우승자를 판정하지만 `game_history`를 생성하지 않는다.

- 일반 `POST /game/result`의 `gameType=POKE_LOUNGE` 요청은 `400`으로 거절한다.
- `GET /game/ranking?gameType=POKE_LOUNGE`는 DB를 조회하지 않고 빈 배열을 반환한다.
- 캐주얼 `/result`와 서버 권위 action은 현재 Redis room 안의 대진과 누적 점수만 갱신한다.
- 기존 DB의 Poke Lounge 기록과 `resultTrust` 값은 마이그레이션 호환 데이터일 뿐 새 런타임에서 읽거나 추가하지 않는다.

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

일반 `POST /game/result`의 범위/속도 정책은 client-asserted 입력에 대한 1차 plausibility 방어선이며 경쟁 증명이 아니다. Poke Lounge는 인원수와 관계없이 영속 랭킹에서 제외한다.
