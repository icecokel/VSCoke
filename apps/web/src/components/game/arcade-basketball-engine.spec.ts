import assert from "node:assert/strict";
import { test } from "node:test";
import {
  basketballReducer,
  countdownMs,
  flightDurationMs,
  getShotOutcome,
  getShotPower,
  isTrayBallAvailable,
  returnDurationMs,
  roundDurationMs,
  type BasketballState,
} from "./arcade-basketball-engine";

test("슛 판정은 민트색 구간 양끝을 포함하고 최대 파워에서 멈춘다", () => {
  assert.equal(getShotPower(1_500), 1);
  assert.equal(getShotOutcome(getShotPower(584)), "short");
  assert.equal(getShotOutcome(getShotPower(585)), "basket");
  assert.equal(getShotOutcome(getShotPower(765)), "basket");
  assert.equal(getShotOutcome(getShotPower(766)), "long");
});

test("일시정지 중에는 날아가는 공과 시간이 멈추고 재개 후 한 번만 득점한다", () => {
  const deadline = countdownMs + roundDurationMs;
  let state: BasketballState = { phase: "ready" };
  state = basketballReducer(state, { type: "start", now: 0 });
  state = basketballReducer(state, { type: "pick", side: "left", now: deadline - 750 });
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
  state = basketballReducer(state, { type: "pick", side: "left", now: countdownMs });
  assert.equal(basketballReducer(state, { type: "pick", side: "right", now: countdownMs }), state);
  state = basketballReducer(state, { type: "press", now: countdownMs });
  const releasedAt = countdownMs + 660;
  state = basketballReducer(state, { type: "release", now: releasedAt });
  assert.equal(basketballReducer(state, { type: "pick", side: "left", now: releasedAt }), state);
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
