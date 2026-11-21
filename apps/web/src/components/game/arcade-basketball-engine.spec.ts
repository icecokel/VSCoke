import assert from "node:assert/strict";
import { test } from "node:test";
import {
  basketballReducer,
  createShotDifficulty,
  type ShotDifficulty,
  countdownMs,
  flightDurationMs,
  getShotOutcome,
  getShotPower,
  isTrayBallAvailable,
  returnDurationMs,
  roundDurationMs,
  type BasketballState,
} from "./arcade-basketball-engine";

const difficulty: ShotDifficulty = { startSegment: 13, segmentCount: 4, chargeDurationMs: 900 };

test("슛 판정은 민트색 구간 시작과 끝 경계를 구분하고 최대 파워에서 멈춘다", () => {
  assert.equal(getShotPower(1_500, difficulty), 1);
  assert.equal(getShotOutcome(getShotPower(584, difficulty), difficulty), "short");
  assert.equal(getShotOutcome(getShotPower(585, difficulty), difficulty), "basket");
  assert.equal(getShotOutcome(getShotPower(765, difficulty), difficulty), "long");
  assert.equal(getShotOutcome(getShotPower(766, difficulty), difficulty), "long");
});

test("일시정지 중에는 날아가는 공과 시간이 멈추고 재개 후 한 번만 득점한다", () => {
  const deadline = countdownMs + roundDurationMs;
  let state: BasketballState = { phase: "ready" };
  state = basketballReducer(state, { type: "start", now: 0 });
  state = basketballReducer(state, { type: "pick", difficulty, side: "left", now: deadline - 750 });
  state = basketballReducer(state, { type: "press", now: deadline - 700 });
  state = basketballReducer(state, { type: "release", now: deadline - 40 });
  state = basketballReducer(state, { type: "pause", now: deadline + 60 });
  assert.equal(state.phase, "paused");

  const resumedAt = deadline + 10_000;
  const remainingFlight = flightDurationMs - 100;
  assert.equal(basketballReducer(state, { type: "tick", now: resumedAt }), state);
  state = basketballReducer(state, { type: "resume", now: resumedAt });
  state = basketballReducer(state, { type: "tick", now: resumedAt + remainingFlight - 1 });
  assert.equal(state.phase, "round");

  state = basketballReducer(state, { type: "tick", now: resumedAt + remainingFlight });
  assert.deepEqual(state, { phase: "finished", score: 1 });
  assert.equal(basketballReducer(state, { type: "tick", now: resumedAt + 1_000 }), state);
});

test("공은 집거나 날고 있는 동안 같은 자리에서 다시 집을 수 없다", () => {
  let state = basketballReducer({ phase: "ready" }, { type: "start", now: 0 });
  state = basketballReducer(state, { type: "pick", difficulty, side: "left", now: countdownMs });
  assert.equal(
    basketballReducer(state, { type: "pick", difficulty, side: "right", now: countdownMs }),
    state,
  );
  state = basketballReducer(state, { type: "press", now: countdownMs });
  const releasedAt = countdownMs + 660;
  state = basketballReducer(state, { type: "release", now: releasedAt });
  assert.equal(
    basketballReducer(state, { type: "pick", difficulty, side: "left", now: releasedAt }),
    state,
  );
  state = basketballReducer(state, { type: "tick", now: releasedAt + flightDurationMs });
  assert.equal(state.phase, "round");
  assert.equal(state.round.score, 1);
  assert.equal(isTrayBallAvailable(state.round, "left"), false);
  assert.equal(isTrayBallAvailable(state.round, "right"), true);
  state = basketballReducer(state, {
    type: "tick",
    now: releasedAt + flightDurationMs + returnDurationMs,
  });
  assert.equal(state.phase, "round");
  assert.equal(state.round.score, 1);
  assert.equal(isTrayBallAvailable(state.round, "left"), true);
});

test("폭·위치·속도는 독립적으로 추첨하고 가장 어려운 조건도 반복한다", () => {
  const sample = (values: number[]) => {
    let index = 0;
    return createShotDifficulty(() => values[index++]);
  };
  assert.deepEqual(sample([0, 0, 0]), { startSegment: 0, segmentCount: 2, chargeDurationMs: 600 });
  assert.deepEqual(sample([0, 0, 0]), { startSegment: 0, segmentCount: 2, chargeDurationMs: 600 });
  for (const [value, count] of [
    [0, 2],
    [0.25, 3],
    [0.5, 4],
    [0.75, 5],
  ]) {
    const first = sample([value, 0, 0]);
    const last = sample([value, 0.999999, 0.999999]);
    assert.equal(first.segmentCount, count);
    assert.equal(last.startSegment + last.segmentCount, 20);
    assert.equal(first.chargeDurationMs, 600);
    assert.ok(last.chargeDurationMs > 1199 && last.chargeDurationMs < 1200);
    assert.equal(getShotOutcome(1, last), "basket");
    assert.equal(getShotOutcome(first.segmentCount / 20, first), "long");
  }
});

test("같은 공의 조건은 충전 취소와 일시정지 뒤에도 유지한다", () => {
  const hard = createShotDifficulty(() => 0);
  let state = basketballReducer({ phase: "ready" }, { type: "start", now: 0 });
  state = basketballReducer(state, { type: "pick", side: "right", difficulty: hard, now: 3000 });
  state = basketballReducer(state, { type: "press", now: 3000 });
  state = basketballReducer(state, { type: "cancel", now: 3050 });
  state = basketballReducer(state, { type: "pause", now: 3100 });
  state = basketballReducer(state, { type: "resume", now: 5000 });
  assert.equal(state.phase, "round");
  assert.deepEqual(state.round.heldBall?.difficulty, hard);
});
