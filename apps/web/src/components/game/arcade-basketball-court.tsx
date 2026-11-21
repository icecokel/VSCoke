import Image from "next/image";
import type { CSSProperties } from "react";
import { flightDurationMs, returnDurationMs, type ShotOutcome } from "./arcade-basketball-engine";
import styles from "./arcade-basketball.module.css";

interface CourtShot {
  age: number;
  power: number;
  outcome: ShotOutcome;
}

interface CourtProps {
  power: number;
  shot: CourtShot | null;
}

const spriteRoot = "/games/arcade-basketball";
const handReleaseMs = 150;
const trailDelays = [38, 76];
const rimBallScale = 0.35;
const getHeldBallY = (power: number) => 81 - power * 7;

const shots = {
  short: { x: 44, y: 41, arcHeight: 25, drift: -4 },
  basket: { x: 50, y: 35, arcHeight: 33, drift: 5 },
  long: { x: 55, y: 29, arcHeight: 35, drift: 5 },
} satisfies Record<ShotOutcome, { x: number; y: number; arcHeight: number; drift: number }>;

const getFlightPose = ({ outcome, age, power }: CourtShot) => {
  const target = shots[outcome];
  const progress = age / flightDurationMs;
  const arc = 4 * progress * (1 - progress);
  const startY = getHeldBallY(power);

  return {
    x: 50 + (target.x - 50) * progress + target.drift * arc,
    y: startY + (target.y - startY) * progress - target.arcHeight * arc,
    scale: 1 - (1 - rimBallScale) * progress,
    rotation: -200 * progress,
  };
};

const getBallPose = (power: number, shot: CourtShot | null) => {
  if (!shot) return { x: 50, y: getHeldBallY(power), scale: 1, rotation: 0 };
  if (shot.age < flightDurationMs) return getFlightPose(shot);

  const target = shots[shot.outcome];
  const progress = Math.min(1, (shot.age - flightDurationMs) / returnDurationMs);
  const direction = shot.outcome === "long" ? 1 : -1;
  return {
    x: target.x + direction * progress ** 2 * 13,
    y: target.y + (92 - target.y) * progress ** 1.35,
    scale: rimBallScale + progress * 0.35,
    rotation: -200 - 180 * progress,
  };
};

export const ArcadeBasketballCourt = ({ power, shot }: CourtProps) => {
  const pose = getBallPose(power, shot);
  const hasLanded = !!shot && shot.age >= flightDurationMs;
  const handRelease = shot ? Math.min(1, shot.age / handReleaseMs) : 0;

  return (
    <div className={styles.art} aria-hidden="true">
      <Image
        src={`${spriteRoot}/court-back.png`}
        alt=""
        fill
        unoptimized
        loading="eager"
        draggable={false}
      />
      <Image
        src={`${spriteRoot}/rim.png`}
        alt=""
        width={72}
        height={45}
        unoptimized
        draggable={false}
        className={styles.rim}
        data-swish={hasLanded && shot.outcome === "basket"}
      />
      <Image
        src={`${spriteRoot}/court-tray.png`}
        alt=""
        width={216}
        height={56}
        unoptimized
        draggable={false}
        className={styles.tray}
      />
      {shot &&
        !hasLanded &&
        trailDelays
          .filter(delay => shot.age >= delay)
          .map(delay => {
            const { x, y } = getFlightPose({ ...shot, age: shot.age - delay });
            return (
              <span
                key={delay}
                className={styles.trail}
                style={{ translate: `${x}% ${y}%`, opacity: 0.7 - delay / 160 }}
              />
            );
          })}
      <div
        className={styles.ball}
        data-behind-rim={shot?.outcome === "basket" && shot.age >= flightDurationMs - 50}
        data-in-tray={hasLanded && pose.y >= 86}
        style={{ translate: `${pose.x}% ${pose.y}%` }}
      >
        <Image
          src={`${spriteRoot}/ball.png`}
          alt=""
          width={56}
          height={56}
          unoptimized
          draggable={false}
          data-testid="basketball-ball"
          style={{ scale: pose.scale, "--ball-rotation": `${pose.rotation}deg` } as CSSProperties}
        />
      </div>
      {handRelease < 1 && (
        <Image
          src={`${spriteRoot}/hands.png`}
          alt=""
          width={128}
          height={90}
          unoptimized
          draggable={false}
          className={styles.hands}
          style={{ "--lift": shot?.power ?? power, "--release": handRelease } as CSSProperties}
        />
      )}
    </div>
  );
};
