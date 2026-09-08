import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSkyDropState,
  getSkyDropSpawnInterval,
  isSkyDropInDanger,
  skyDropReducer,
  type SkyDropState,
} from "./sky-drop-engine";

const start = (seed = 7) => skyDropReducer(createSkyDropState(), { type: "start", seed, now: 0 });
const board = (columns: number[][], overrides: Partial<SkyDropState> = {}): SkyDropState => {
  let id = 100;
  return {
    ...start(),
    ...overrides,
    columns: columns.map(column => column.map(color => ({ id: id++, color }))),
    nextBlockId: 1000,
  };
};
const choose = (state: SkyDropState, column: number) =>
  skyDropReducer(state, { type: "select", column, now: state.lastTickAt });
const move = (state: SkyDropState, from: number, to: number) => choose(choose(state, from), to);

test("Sky Drop 시드가 같으면 동일한 3열·3행·5색 보드를 만들고 입력 상태를 바꾸지 않는다", () => {
  const ready = createSkyDropState();
  const copy = structuredClone(ready);
  const action = { type: "start" as const, seed: 123, now: 0 };
  const state = skyDropReducer(ready, action);
  assert.deepEqual(state, skyDropReducer(ready, action));
  assert.deepEqual(ready, copy);
  assert.deepEqual(
    state.columns.map(column => column.length),
    [3, 3, 3],
  );
  assert.equal(new Set(state.colors).size, 5);
  assert.equal(new Set(state.columns.flat().map(block => block.id)).size, 9);
});

test("Sky Drop 선택·이동·같은 열 취소·빈 열 선택을 원자적으로 처리한다", () => {
  const state = board([[0, 1], [2], []]);
  const copy = structuredClone(state);
  const held = choose(state, 0);
  assert.equal(held.held?.block.color, 1);
  assert.deepEqual(
    held.columns.map(column => column.length),
    [1, 1, 0],
  );
  assert.deepEqual(choose(held, 0).columns, state.columns);
  const moved = choose(held, 2);
  assert.deepEqual(
    moved.columns.map(column => column.length),
    [1, 1, 1],
  );
  assert.equal(moved.held, null);
  assert.equal(choose(state, 2), state);
  assert.deepEqual(state, copy);
});

test("Sky Drop 같은 색 아래 3개만 제거하고 기본 100점을 부여한다", () => {
  const state = board([[0], [0, 0], [1]]);
  const matched = move(state, 0, 1);
  assert.equal(matched.score, 100);
  assert.equal(matched.combo, 1);
  assert.equal(matched.match?.blocks.length, 3);
  assert.deepEqual(
    matched.columns.map(column => column.length),
    [0, 0, 1],
  );
  assert.equal(matched.feedback?.kind, "score");
  assert.equal(move(board([[0], [0, 1], []]), 0, 1).score, 0);
});

test("Sky Drop 자동 생성이나 같은 열 취소는 매칭을 발생시키지 않는다", () => {
  const state = board([[1, 1, 1], [], []]);
  assert.equal(choose(choose(state, 0), 0).score, 0);
  assert.equal(skyDropReducer(state, { type: "tick", now: 3000 }).score, 0);
});

test("Sky Drop 3초 내 연속 매칭은 배율을 올리고 최대 2.5배에서 제한한다", () => {
  for (const [previousCombo, expected] of [
    [0, 100],
    [1, 150],
    [2, 200],
    [3, 250],
    [20, 250],
  ]) {
    const state = board([[0], [0, 0], []], {
      elapsedMs: 2000,
      combo: previousCombo,
      lastMatchAt: previousCombo ? 1000 : null,
    });
    assert.equal(move(state, 0, 1).score, expected);
  }
  const state = board([[0], [0, 0], []], { elapsedMs: 4000, combo: 5, lastMatchAt: 1000 });
  assert.equal(move(state, 0, 1).score, 100);
});

test("Sky Drop 시간 보너스와 위험 보너스는 기존 계산을 유지한다", () => {
  for (const [elapsedMs, expected] of [
    [0, 100],
    [30000, 120],
    [60000, 150],
    [90000, 180],
  ]) {
    assert.equal(move(board([[0], [0, 0], []], { elapsedMs }), 0, 1).score, expected);
  }
  const state = board([[0], [0, 0], Array(10).fill(1)]);
  assert.equal(isSkyDropInDanger(state), true);
  assert.equal(move(state, 0, 1).score, 150);
});

test("Sky Drop 12개를 허용하고 13개를 놓으면 종료하며, 즉시 매칭은 먼저 제거한다", () => {
  assert.equal(move(board([[0], Array(11).fill(1), []]), 0, 1).status, "playing");
  const overflow = move(board([[0], Array(12).fill(1), []]), 0, 1);
  assert.equal(overflow.status, "over");
  assert.equal(overflow.feedback?.kind, "gameover");
  const saved = move(board([[1], Array(12).fill(1), []]), 0, 1);
  assert.equal(saved.status, "playing");
  assert.equal(saved.columns[1].length, 10);
});

test("Sky Drop 선택 중 생성과 같은 열 반환에서도 블록 중복·상한 우회가 없다", () => {
  const state = choose(board([Array(12).fill(0), [1], [2]]), 0);
  const spawned = skyDropReducer(state, { type: "tick", now: 3000 });
  assert.equal(spawned.columns[0].length, 12);
  const returned = choose(spawned, 0);
  assert.equal(returned.status, "over");
  assert.equal(returned.score, 0);
  assert.equal(
    new Set(returned.columns.flat().map(block => block.id)).size,
    returned.columns.flat().length,
  );
});

test("Sky Drop 자동 생성은 3초 간격에서 시작하고 10초마다 빨라지되 500ms 미만이 되지 않는다", () => {
  const state = start();
  assert.equal(skyDropReducer(state, { type: "tick", now: 2999 }).columns[0].length, 3);
  assert.equal(skyDropReducer(state, { type: "tick", now: 3000 }).columns[0].length, 4);
  assert.equal(getSkyDropSpawnInterval(0), 3000);
  assert.equal(getSkyDropSpawnInterval(10000), 2900);
  assert.equal(getSkyDropSpawnInterval(999999), 500);
});

test("Sky Drop 큰 시간 점프는 종료 시점에서 멈추고 반복 틱도 결과를 바꾸지 않는다", () => {
  const over = skyDropReducer(start(), { type: "tick", now: 86400000 });
  assert.equal(over.status, "over");
  assert.equal(over.columns[0].length, 13);
  assert.ok(over.elapsedMs < 30000);
  assert.equal(skyDropReducer(over, { type: "tick", now: 90000000 }), over);
  assert.equal(choose(over, 0), over);
});

test("Sky Drop pause 중 시간·보드·입력은 멈추고 resume은 대기 시간을 제외한다", () => {
  const paused = skyDropReducer(start(), { type: "pause", now: 900 });
  assert.equal(paused.status, "paused");
  assert.equal(skyDropReducer(paused, { type: "tick", now: 60000 }), paused);
  assert.equal(choose(paused, 1), paused);
  const resumed = skyDropReducer(paused, { type: "resume", now: 60000 });
  const ticked = skyDropReducer(resumed, { type: "tick", now: 61000 });
  assert.equal(ticked.elapsedMs, 1900);
  assert.deepEqual(
    ticked.columns.map(column => column.length),
    [3, 3, 3],
  );
});

test("Sky Drop 잘못된 열·시각과 중복 pause/resume은 게임을 손상시키지 않는다", () => {
  const state = start();
  for (const column of [-1, 3, 1.5, NaN]) assert.equal(choose(state, column), state);
  for (const now of [-10, NaN, Infinity])
    assert.equal(skyDropReducer(state, { type: "tick", now }), state);
  assert.equal(skyDropReducer(state, { type: "resume", now: 0 }), state);
});

test("Sky Drop 재시작은 점수·콤보·선택·생성 주기를 모두 초기화한다", () => {
  const previous = move(board([[0], [0, 0], []]), 0, 1);
  const restarted = skyDropReducer(previous, { type: "start", now: 60000, seed: 8 });
  assert.equal(restarted.score, 0);
  assert.equal(restarted.combo, 0);
  assert.equal(restarted.held, null);
  assert.equal(restarted.match, null);
  assert.equal(restarted.elapsedMs, 0);
  assert.equal(restarted.nextSpawnAt, 3000);
});

test("Sky Drop 연출과 콤보는 시간이 지나면 정리되고 로그인 복원은 시작 화면을 덮는다", () => {
  const matched = move(board([[0], [0, 0], []]), 0, 1);
  assert.equal(skyDropReducer(matched, { type: "tick", now: 700 }).match, null);
  assert.equal(skyDropReducer(matched, { type: "tick", now: 3000 }).combo, 0);
  const restored = skyDropReducer(createSkyDropState(), {
    type: "restore",
    score: 200,
    playTime: 25,
  });
  assert.equal(restored.status, "over");
  assert.equal(restored.score, 200);
  assert.equal(restored.restoredPlayTime, 25);
});
