# Game Score Policy

확인 기준일: 2026-09-09

이 문서는 `POST /game/result`로 저장되는 공개 랭킹 점수의 서버 검증 기준을 정리한다. 게임 안의 점수 획득 공식을 정의하는 문서가 아니다. 현재 정책 원본은 [game-score-policy.ts](../apps/api/src/game/game-score-policy.ts)다.

## 현재 정책

현재 API에서 영속 랭킹으로 저장하는 게임 타입은 `SKY_DROP`이다. Wordle은 현재 `POST /game/result` 랭킹 저장 타입에 포함되지 않는다.

Wordle은 서버 저장만 빠진 것이 아니라 점수 계산·누적·연승·랭킹 기능 자체가 없다. 성공·실패와 해당 판의 시도 횟수만 관리하며, 반복 플레이해도 점수는 쌓이지 않는다. 상세 동작은 [Wordle 게임 규칙](./wordle-game-rules.md)을 따른다.

| gameType | score min | score max | playTime min | playTime max | max score/sec |
| -------- | --------- | --------- | ------------ | ------------ | ------------- |
| SKY_DROP | 1         | 100000    | 1초          | 86400초      | 2000          |

서버는 다음 조건을 강제한다.

- `score`는 정수여야 한다.
- `score`는 게임별 최소/최대 범위 안에 있어야 한다.
- `playTime`은 선택값이다. 누락 또는 `null`이면 시간·속도 검사를 생략하고 점수 범위만 검증한다. 값이 있으면 정수와 범위를 검증한다.
- `playTime` 값이 있으면 `score / playTime`으로 계산한 전체 플레이의 평균 초당 점수가 상한을 넘을 수 없다. 실제 매초의 득점을 관찰하는 방식은 아니다.
- 정책이 등록되지 않은 `gameType`은 저장을 거부한다.
- 랭킹, 최고 점수, 등수 산정은 위 정책에 맞는 기존 기록만 사용한다.

## 제한값의 의미와 선정 근거

표의 100,000점과 평균 초당 2,000점은 서버에 설정된 고정 허용 상한이다. 현재 문서에는 이
수치를 선택한 별도의 계산식·측정 데이터가 기록되어 있지 않다. 게임 규칙으로 도출한 이론상
최대 득점, 실제 플레이의 달성 가능 점수 또는 외부 공식 표준으로 단정하지 않는다.

공통 [CreateGameHistoryDto](../apps/api/src/game/dto/create-game-history.dto.ts)는 점수를
1~1,000,000 범위로 먼저 검증한다. 이어서 게임별 정책이 적용되므로 Sky Drop의 최종 허용
상한은 100,000점이다. 이 차이는 검증 계층의 차이이며 Wordle 점수 지원을 뜻하지 않는다.

## 반복 플레이와 랭킹

[GameService](../apps/api/src/game/game.service.ts)는 정책에 맞는 기록 중 사용자별 최고 점수
한 건을 기준으로 랭킹을 조회한다. 여러 판의 점수를 합산하는 누적 랭킹이 아니다. 전체 랭킹은
사용자별 최고 기록을 추린 뒤 상위 10건을 표시하고, 최고 점수 조회도 합계가 아니라 최댓값을
사용한다. Wordle은 이 저장·랭킹 흐름에 참여하지 않는다.

## 점수 제출 응답의 등수

`rank`는 이번 판 점수보다 높은 **사용자별 최고 점수의 개수 + 1**이다. Top 10 밖도 숫자를
반환한다. 집계에 현재 사용자 자신의 과거 최고점도 포함되므로 이번 판이 자신의 최고점보다
낮으면 그 기록도 비교 대상이 된다. `allTimeRank`는 자신의 전체 최고점 기준,
`weeklyRank`는 KST 이번 주 최고점 기준이다. 동점은 높은 점수에 포함하지 않는다.
공개 `GET /game/result/:id`는 이 순위 필드를 생략하며 null로 변환하지 않는다.
서버의 점수·시간은 정수이고, `playTime`만 선택값·null 허용이다.

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
