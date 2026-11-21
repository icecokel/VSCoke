import {
  flightDurationMs,
  pickupDurationMs,
  returnDurationMs,
  type Shot,
  type ShotOutcome,
  type TraySide,
} from "./arcade-basketball-engine";

export interface BallPose {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const rimBallScale = 0.35;
const rampBounceScale = 0.45;
const rampHopHeight = 11;
const rampRestitution = 0.42;
const rampY = 57;

const shotGeometry = {
  short: { x: 44, y: 38, flightLift: 26, drift: -4, rampX: 32, rebound: 13, fallMs: 340 },
  basket: { x: 50, y: 35, flightLift: 33, drift: 5, rampX: 50, rebound: -5, fallMs: 200 },
  long: { x: 56, y: 28, flightLift: 35, drift: 5, rampX: 70, rebound: 9, fallMs: 290 },
} satisfies Record<
  ShotOutcome,
  {
    x: number;
    y: number;
    flightLift: number;
    drift: number;
    rampX: number;
    rebound: number;
    fallMs: number;
  }
>;

const lerp = (start: number, end: number, progress: number): number =>
  start + (end - start) * progress;

const arc = (progress: number): number => 4 * progress * (1 - progress);

export const getTrayBallPose = (side: TraySide): BallPose => ({
  x: side === "left" ? 17 : 83,
  y: 85.5,
  scale: 0.64,
  rotation: 0,
});

export const getHeldBallPose = (side: TraySide, age: number, power: number): BallPose => {
  const tray = getTrayBallPose(side);
  const progress = Math.min(1, age / pickupDurationMs);
  const lift = 1 - (1 - progress) ** 2;

  return {
    x: lerp(tray.x, 50, lift),
    y: lerp(tray.y, 81 - power * 7, lift) - 6 * arc(lift),
    scale: lerp(tray.scale, 1, lift),
    rotation: 0,
  };
};

export const getFlightPose = (shot: Shot, age: number): BallPose => {
  const target = shotGeometry[shot.outcome];
  const start = getHeldBallPose(shot.side, shot.pickupAge, shot.power);
  const progress = age / flightDurationMs;
  const lift = arc(progress);

  return {
    x: lerp(start.x, target.x, progress) + target.drift * lift,
    y: lerp(start.y, target.y, progress) - target.flightLift * lift,
    scale: lerp(start.scale, rimBallScale, progress),
    rotation: -200 * progress,
  };
};

export const getShotPose = (shot: Shot, age: number): BallPose => {
  if (age < flightDurationMs) return getFlightPose(shot, age);

  const target = shotGeometry[shot.outcome];
  const returnAge = age - flightDurationMs;
  if (returnAge < target.fallMs) {
    const progress = returnAge / target.fallMs;
    return {
      x: lerp(target.x, target.rampX, 1 - (1 - progress) ** 2),
      y: lerp(target.y, rampY, progress) - target.rebound * arc(progress),
      scale: lerp(rimBallScale, rampBounceScale, progress),
      rotation: lerp(-200, -300, progress),
    };
  }

  const tray = getTrayBallPose(shot.side);
  const progress = Math.min(1, (returnAge - target.fallMs) / (returnDurationMs - target.fallMs));
  const roll = 1 - (1 - progress) ** 2;
  const hop = 2 * progress;
  const hopIndex = Math.floor(hop);
  const bounce = rampHopHeight * rampRestitution ** hopIndex * arc(hop - hopIndex);
  const rollRotation = shot.side === "left" ? -720 : 0;
  return {
    x: lerp(target.rampX, tray.x, roll),
    y: lerp(rampY, tray.y, roll) - bounce,
    scale: lerp(rampBounceScale, tray.scale, roll),
    rotation: lerp(-300, rollRotation, roll),
  };
};
