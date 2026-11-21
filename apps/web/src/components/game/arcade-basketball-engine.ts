export const countdownMs = 3_000;
export const roundDurationMs = 30_000;
export const chargeDurationMs = 900;
export const sweetSpot = { start: 0.65, end: 0.85 };
export const flightDurationMs = 680;
export const returnDurationMs = 420;

const deadlineMs = countdownMs + roundDurationMs;

export type ShotOutcome = "short" | "basket" | "long";

interface Shot {
  startedAt: number;
  power: number;
  outcome: ShotOutcome;
  isResolved: boolean;
}

interface Round {
  startedAt: number;
  elapsedMs: number;
  score: number;
  chargeStartedAt: number | null;
  shot: Shot | null;
}

export type BasketballState =
  | { phase: "ready" }
  | { phase: "round" | "paused"; round: Round }
  | { phase: "finished"; score: number };

export type BasketballAction = {
  type: "start" | "tick" | "press" | "release" | "cancel" | "pause" | "resume";
  now: number;
};

export const getShotPower = (elapsedMs: number): number =>
  Math.min(1, Math.max(0, elapsedMs / chargeDurationMs));

export const getShotOutcome = (power: number): ShotOutcome => {
  if (power < sweetSpot.start) return "short";
  if (power > sweetSpot.end) return "long";
  return "basket";
};

const advanceRound = (round: Round, now: number): Round => {
  const elapsedMs = Math.max(round.elapsedMs, now - round.startedAt);
  let { shot, score, chargeStartedAt } = round;

  if (shot) {
    const shotAge = elapsedMs - shot.startedAt;
    if (!shot.isResolved && shotAge >= flightDurationMs) {
      if (shot.outcome === "basket") score += 1;
      shot = { ...shot, isResolved: true };
    }
    if (shotAge >= flightDurationMs + returnDurationMs) shot = null;
  }

  if (elapsedMs >= deadlineMs) chargeStartedAt = null;

  return { ...round, elapsedMs, score, shot, chargeStartedAt };
};

export const basketballReducer = (
  state: BasketballState,
  action: BasketballAction,
): BasketballState => {
  const { type, now } = action;
  if (type === "start" && (state.phase === "ready" || state.phase === "finished")) {
    return {
      phase: "round",
      round: { startedAt: now, elapsedMs: 0, score: 0, chargeStartedAt: null, shot: null },
    };
  }

  if (state.phase === "paused" && type === "resume") {
    return { phase: "round", round: { ...state.round, startedAt: now - state.round.elapsedMs } };
  }
  if (state.phase !== "round") return state;

  const previous = state.round;
  const round = advanceRound(previous, now);
  const canPlay = round.elapsedMs >= countdownMs && round.elapsedMs < deadlineMs;

  if (round.elapsedMs >= deadlineMs && (!round.shot || round.shot.isResolved)) {
    return { phase: "finished", score: round.score };
  }

  switch (type) {
    case "tick":
      if (
        !previous.shot &&
        previous.chargeStartedAt === null &&
        Math.floor(previous.elapsedMs / 1_000) === Math.floor(round.elapsedMs / 1_000)
      ) {
        return state;
      }
      return { phase: "round", round };
    case "press":
      if (!canPlay || round.shot || round.chargeStartedAt !== null) return state;
      return { phase: "round", round: { ...round, chargeStartedAt: round.elapsedMs } };
    case "release": {
      if (!canPlay || round.chargeStartedAt === null) return state;
      const power = getShotPower(round.elapsedMs - round.chargeStartedAt);
      return {
        phase: "round",
        round: {
          ...round,
          chargeStartedAt: null,
          shot: {
            startedAt: round.elapsedMs,
            power,
            outcome: getShotOutcome(power),
            isResolved: false,
          },
        },
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
