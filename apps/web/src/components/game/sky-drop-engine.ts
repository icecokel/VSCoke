import { GameConstants } from "./game-constants";

export interface SkyDropBlock {
  id: number;
  color: number;
}

interface MatchEffect {
  id: number;
  column: number;
  row: number;
  blocks: SkyDropBlock[];
  points: number;
  at: number;
}

export interface SkyDropState {
  status: "ready" | "playing" | "paused" | "over";
  columns: SkyDropBlock[][];
  held: { block: SkyDropBlock; column: number } | null;
  score: number;
  elapsedMs: number;
  lastTickAt: number;
  nextSpawnAt: number;
  randomSeed: number;
  colors: number[];
  nextBlockId: number;
  combo: number;
  lastMatchAt: number | null;
  match: MatchEffect | null;
  feedback: { id: number; kind: "pickup" | "putdown" | "score" | "gameover" } | null;
  restoredPlayTime?: number;
}

export type SkyDropAction =
  | { type: "start"; seed: number; now: number }
  | { type: "tick" | "pause" | "resume"; now: number }
  | { type: "select"; column: number; now: number }
  | { type: "restore"; score: number; playTime?: number };

export const createSkyDropState = (): SkyDropState => ({
  status: "ready",
  columns: [[], [], []],
  held: null,
  score: 0,
  elapsedMs: 0,
  lastTickAt: 0,
  nextSpawnAt: GameConstants.INITIAL_SPAWN_INTERVAL,
  randomSeed: 1,
  colors: [],
  nextBlockId: 0,
  combo: 0,
  lastMatchAt: null,
  match: null,
  feedback: null,
});

export const getSkyDropSpawnInterval = (elapsedMs: number): number =>
  Math.max(
    GameConstants.MIN_SPAWN_INTERVAL,
    GameConstants.INITIAL_SPAWN_INTERVAL -
      Math.floor(elapsedMs / GameConstants.DIFFICULTY_RAMP_PERIOD) *
        GameConstants.DIFFICULTY_RAMP_RATE,
  );

export const isSkyDropInDanger = (state: SkyDropState): boolean =>
  state.columns.some(
    column =>
      column.length >= GameConstants.MAX_STACK_HEIGHT - GameConstants.WARNING_THRESHOLD_ROWS,
  );

// 시드와 시각을 action에서 받아 Strict Mode에서도 동일한 상태 전이를 유지한다.
const nextRandomSeed = (seed: number): number => (Math.imul(seed, 1664525) + 1013904223) >>> 0;
const withFeedback = (
  state: SkyDropState,
  kind: NonNullable<SkyDropState["feedback"]>["kind"],
): SkyDropState => ({ ...state, feedback: { id: (state.feedback?.id ?? 0) + 1, kind } });

const checkOverflow = (state: SkyDropState): SkyDropState => {
  if (state.columns.some(column => column.length > GameConstants.MAX_STACK_HEIGHT)) {
    return withFeedback({ ...state, status: "over" }, "gameover");
  }
  return state;
};

const spawnRow = (state: SkyDropState): SkyDropState => {
  let randomSeed = state.randomSeed;
  let nextBlockId = state.nextBlockId;
  const columns = state.columns.map(column => {
    randomSeed = nextRandomSeed(randomSeed);
    const color = state.colors[Math.floor((randomSeed / 2 ** 32) * state.colors.length)];
    return [{ id: nextBlockId++, color }, ...column];
  });
  return checkOverflow({ ...state, columns, randomSeed, nextBlockId });
};

const advanceTime = (state: SkyDropState, now: number): SkyDropState => {
  if (state.status !== "playing" || !Number.isFinite(now) || now <= state.lastTickAt) return state;
  const elapsedMs = state.elapsedMs + now - state.lastTickAt;
  let next = { ...state, elapsedMs, lastTickAt: now };
  // 지연된 틱에서도 생성 시점별 난이도와 종료 판정을 순서대로 적용한다.
  while (next.nextSpawnAt <= elapsedMs && next.status === "playing") {
    const spawnAt = next.nextSpawnAt;
    next = spawnRow({ ...next, elapsedMs: spawnAt });
    next = { ...next, nextSpawnAt: spawnAt + getSkyDropSpawnInterval(spawnAt) };
  }
  if (next.status === "playing") next = { ...next, elapsedMs };
  if (
    next.lastMatchAt !== null &&
    next.elapsedMs - next.lastMatchAt >= GameConstants.SCORE.COMBO_WINDOW
  ) {
    next = { ...next, combo: 0 };
  }
  if (next.match && next.elapsedMs - next.match.at >= 700) next = { ...next, match: null };
  return next;
};

const selectColumn = (state: SkyDropState, columnIndex: number): SkyDropState => {
  if (
    state.status !== "playing" ||
    !Number.isInteger(columnIndex) ||
    columnIndex < 0 ||
    columnIndex >= 3
  )
    return state;
  const columns = state.columns.map(column => [...column]);
  const column = columns[columnIndex];
  if (!state.held) {
    const block = column.pop();
    return block
      ? withFeedback({ ...state, columns, held: { block, column: columnIndex } }, "pickup")
      : state;
  }

  column.push(state.held.block);
  let next: SkyDropState = withFeedback({ ...state, columns, held: null }, "putdown");
  // 원래 열에 돌려놓기는 선택 취소다. 취소로 매칭을 새로 만들지 않는다.
  if (state.held.column !== columnIndex && column.length >= 3) {
    const tail = column.slice(-3);
    if (tail.every(block => block.color === tail[0].color)) {
      const combo =
        state.lastMatchAt !== null &&
        state.elapsedMs - state.lastMatchAt < GameConstants.SCORE.COMBO_WINDOW
          ? state.combo + 1
          : 1;
      const comboMultiplier =
        GameConstants.SCORE.COMBO_MULTIPLIERS[
          Math.min(combo - 1, GameConstants.SCORE.COMBO_MULTIPLIERS.length - 1)
        ];
      let timeIndex = 0;
      for (let i = 1; i < GameConstants.SCORE.TIME_THRESHOLDS.length; i++) {
        if (state.elapsedMs >= GameConstants.SCORE.TIME_THRESHOLDS[i]) timeIndex = i;
      }
      const points = Math.floor(
        GameConstants.SCORE.BASE_POINTS *
          comboMultiplier *
          GameConstants.SCORE.TIME_MULTIPLIERS[timeIndex] +
          (isSkyDropInDanger(state) ? GameConstants.SCORE.DANGER_BONUS : 0),
      );
      column.splice(-3);
      next = withFeedback(
        {
          ...next,
          score: state.score + points,
          combo,
          lastMatchAt: state.elapsedMs,
          match: {
            id: state.nextBlockId + state.score,
            column: columnIndex,
            row: column.length,
            blocks: tail,
            points,
            at: state.elapsedMs,
          },
        },
        "score",
      );
    }
  }
  // 내려놓아 매칭되면 제거를 우선하고, 선택 취소에서도 상한 초과를 검사한다.
  return checkOverflow(next);
};

export const skyDropReducer = (state: SkyDropState, action: SkyDropAction): SkyDropState => {
  switch (action.type) {
    case "start": {
      let seed = action.seed >>> 0;
      const colors = GameConstants.BLOCK_PALETTE.map((_, index) => index);
      for (let i = colors.length - 1; i > 0; i--) {
        seed = nextRandomSeed(seed);
        const j = Math.floor((seed / 2 ** 32) * (i + 1));
        [colors[i], colors[j]] = [colors[j], colors[i]];
      }
      let next: SkyDropState = {
        ...createSkyDropState(),
        status: "playing",
        lastTickAt: action.now,
        randomSeed: seed,
        colors: colors.slice(0, 5),
      };
      for (let i = 0; i < 3; i++) next = spawnRow(next);
      return next;
    }
    case "tick":
      return advanceTime(state, action.now);
    case "select":
      return selectColumn(advanceTime(state, action.now), action.column);
    case "pause": {
      const next = advanceTime(state, action.now);
      return next.status === "playing" ? { ...next, status: "paused" } : next;
    }
    case "resume":
      return state.status === "paused" && Number.isFinite(action.now)
        ? { ...state, status: "playing", lastTickAt: action.now }
        : state;
    case "restore":
      return state.status === "ready"
        ? { ...state, status: "over", score: action.score, restoredPlayTime: action.playTime }
        : state;
  }
};
