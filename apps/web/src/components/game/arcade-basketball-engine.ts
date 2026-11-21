export const countdownMs = 3_000;
export const roundDurationMs = 30_000;
export const meterSegments = 20;

export interface ShotDifficulty {
  startSegment: number;
  segmentCount: number;
  chargeDurationMs: number;
}

export const createShotDifficulty = (random: () => number = Math.random): ShotDifficulty => {
  const segmentCount = 2 + Math.floor(random() * 4);
  const startSegment = Math.floor(random() * (meterSegments - segmentCount + 1));
  const chargeDurationMs = 600 + random() * 600;
  return { startSegment, segmentCount, chargeDurationMs };
};
export const pickupDurationMs = 240;
export const flightDurationMs = 680;
export const returnDurationMs = 780;
export const traySides = ["left", "right"] as const;

const deadlineMs = countdownMs + roundDurationMs;

export type TraySide = (typeof traySides)[number];
export type ShotOutcome = "short" | "basket" | "long";

export interface HeldBall {
  side: TraySide;
  pickedAt: number;
  difficulty: ShotDifficulty;
}

export interface Shot {
  side: TraySide;
  startedAt: number;
  pickupAge: number;
  power: number;
  outcome: ShotOutcome;
  isResolved: boolean;
}

interface Round {
  startedAt: number;
  elapsedMs: number;
  score: number;
  chargeStartedAt: number | null;
  heldBall: HeldBall | null;
  shots: Shot[];
}

export type BasketballState =
  | { phase: "ready" }
  | { phase: "round" | "paused"; round: Round }
  | { phase: "finished"; score: number };

export type BasketballAction =
  | { type: "pick"; now: number; side: TraySide; difficulty: ShotDifficulty }
  | { type: "start" | "tick" | "press" | "release" | "cancel" | "pause" | "resume"; now: number };

export const isTrayBallAvailable = (
  round: Pick<Round, "heldBall" | "shots"> | null,
  side: TraySide,
): boolean =>
  !round || (round.heldBall?.side !== side && !round.shots.some(shot => shot.side === side));

export const getShotPower = (elapsedMs: number, difficulty: ShotDifficulty): number =>
  Math.min(1, Math.max(0, elapsedMs / difficulty.chargeDurationMs));

export const getShotOutcome = (power: number, difficulty: ShotDifficulty): ShotOutcome => {
  const start = difficulty.startSegment / meterSegments;
  const end = (difficulty.startSegment + difficulty.segmentCount) / meterSegments;
  if (power < start) return "short";
  if (power > end || (power === end && end < 1)) return "long";
  return "basket";
};

const advanceRound = (round: Round, now: number): Round => {
  const elapsedMs = Math.max(round.elapsedMs, now - round.startedAt);
  let score = round.score;
  const shots = round.shots.flatMap(shot => {
    const age = elapsedMs - shot.startedAt;
    const isResolved = age >= flightDurationMs;
    if (isResolved && !shot.isResolved && shot.outcome === "basket") score += 1;
    if (age >= flightDurationMs + returnDurationMs) return [];
    return [isResolved === shot.isResolved ? shot : { ...shot, isResolved }];
  });

  return {
    ...round,
    elapsedMs,
    score,
    shots,
    chargeStartedAt: elapsedMs < deadlineMs ? round.chargeStartedAt : null,
  };
};

export const basketballReducer = (
  state: BasketballState,
  action: BasketballAction,
): BasketballState => {
  const { type, now } = action;
  if (type === "start" && (state.phase === "ready" || state.phase === "finished")) {
    return {
      phase: "round",
      round: {
        startedAt: now,
        elapsedMs: 0,
        score: 0,
        chargeStartedAt: null,
        heldBall: null,
        shots: [],
      },
    };
  }

  if (state.phase === "paused" && type === "resume") {
    return { phase: "round", round: { ...state.round, startedAt: now - state.round.elapsedMs } };
  }
  if (state.phase !== "round") return state;

  const previous = state.round;
  const round = advanceRound(previous, now);
  const canPlay = round.elapsedMs >= countdownMs && round.elapsedMs < deadlineMs;

  if (round.elapsedMs >= deadlineMs && round.shots.every(shot => shot.isResolved)) {
    return { phase: "finished", score: round.score };
  }

  switch (type) {
    case "tick": {
      const hasPickupMotion =
        previous.heldBall && previous.elapsedMs - previous.heldBall.pickedAt < pickupDurationMs;

      if (
        !hasPickupMotion &&
        previous.shots.length === 0 &&
        previous.chargeStartedAt === null &&
        Math.floor(previous.elapsedMs / 1_000) === Math.floor(round.elapsedMs / 1_000)
      ) {
        return state;
      }
      return { phase: "round", round };
    }
    case "pick":
      if (!canPlay || round.heldBall || !isTrayBallAvailable(round, action.side)) return state;
      return {
        phase: "round",
        round: {
          ...round,
          heldBall: { side: action.side, pickedAt: round.elapsedMs, difficulty: action.difficulty },
        },
      };
    case "press":
      if (!canPlay || !round.heldBall || round.chargeStartedAt !== null) return state;
      return { phase: "round", round: { ...round, chargeStartedAt: round.elapsedMs } };
    case "release": {
      if (!canPlay || !round.heldBall || round.chargeStartedAt === null) return state;
      const power = getShotPower(
        round.elapsedMs - round.chargeStartedAt,
        round.heldBall.difficulty,
      );
      const shot: Shot = {
        side: round.heldBall.side,
        startedAt: round.elapsedMs,
        pickupAge: round.elapsedMs - round.heldBall.pickedAt,
        power,
        outcome: getShotOutcome(power, round.heldBall.difficulty),
        isResolved: false,
      };
      return {
        phase: "round",
        round: { ...round, chargeStartedAt: null, heldBall: null, shots: [...round.shots, shot] },
      };
    }
    case "cancel":
      if (round.chargeStartedAt === null) return state;
      return { phase: "round", round: { ...round, chargeStartedAt: null } };
    case "pause":
      return { phase: "paused", round: { ...round, chargeStartedAt: null } };
    default:
      return state;
  }
};
