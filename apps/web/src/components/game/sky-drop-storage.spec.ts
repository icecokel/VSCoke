import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePendingSkyDropScore } from "./sky-drop-storage";

const now = 1000000;
const pending = { gameName: "sky-drop", score: 1200, playTime: 30, timestamp: now - 1000 };

test("Sky Drop 로그인 대기 점수와 플레이 시간을 복원하고 이전 버전 기록도 지원한다", () => {
  assert.equal(parsePendingSkyDropScore(JSON.stringify(pending), now)?.playTime, 30);
  assert.equal(
    parsePendingSkyDropScore(JSON.stringify({ ...pending, playTime: undefined }), now)?.score,
    1200,
  );
  assert.equal(
    parsePendingSkyDropScore(JSON.stringify({ ...pending, requiresManualLogin: true }), now)
      ?.requiresManualLogin,
    true,
  );
});

test("Sky Drop 만료·미래 시각·다른 게임·잘못된 점수·파손된 JSON은 복원하지 않는다", () => {
  const invalid = [
    null,
    "{",
    "[]",
    "null",
    ...[
      { ...pending, timestamp: now - 300000 },
      { ...pending, timestamp: now + 1 },
      { ...pending, gameName: "wordle" },
      { ...pending, score: -1 },
      { ...pending, score: 0 },
      { ...pending, score: 1.2 },
      { ...pending, score: 100001 },
      { ...pending, score: "100" },
      { ...pending, playTime: 0 },
      { ...pending, playTime: 86401 },
      { ...pending, requiresManualLogin: "true" },
    ].map(value => JSON.stringify(value)),
  ];
  for (const raw of invalid) assert.equal(parsePendingSkyDropScore(raw, now), null);
});
