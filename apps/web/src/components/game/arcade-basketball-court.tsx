import Image from "next/image";
import type { CSSProperties } from "react";
import { flightDurationMs, returnDurationMs, type ShotOutcome } from "./arcade-basketball-engine";
import styles from "./arcade-basketball.module.css";

interface CourtProps {
  power: number;
  shot: { age: number; outcome: ShotOutcome } | null;
}

const spriteRoot = "/games/arcade-basketball";
const heldBallY = 81;
const shots = {
  short: { x: 44, y: 41, apex: 18 },
  basket: { x: 50, y: 35, apex: 23 },
  long: { x: 55, y: 29, apex: 28 },
} satisfies Record<ShotOutcome, { x: number; y: number; apex: number }>;

const getBallPose = (power: number, shot: CourtProps["shot"]) => {
  if (!shot) return { x: 50, y: heldBallY - power * 7, width: 26, rotation: 0 };

  const target = shots[shot.outcome];
  if (shot.age < flightDurationMs) {
    const progress = shot.age / flightDurationMs;
    return {
      x: 50 + (target.x - 50) * progress,
      y:
        heldBallY -
        5 +
        (target.y - (heldBallY - 5)) * progress -
        target.apex * Math.sin(Math.PI * progress),
      width: 26 - 17 * progress,
      rotation: -150 * progress,
    };
  }

  const progress = Math.min(1, (shot.age - flightDurationMs) / returnDurationMs);
  const direction = shot.outcome === "long" ? 1 : -1;
  return {
    x: target.x + direction * progress * 13,
    y: target.y + (92 - target.y) * progress ** 1.35,
    width: 9 + progress * 9,
    rotation: -150 - 180 * progress,
  };
};

export const ArcadeBasketballCourt = ({ power, shot }: CourtProps) => {
  const pose = getBallPose(power, shot);
  const hasLanded = !!shot && shot.age >= flightDurationMs;

  return (
    <div className={styles.art} aria-hidden="true">
      <Image src={`${spriteRoot}/court-back.png`} alt="" fill unoptimized loading="eager" />
      <Image
        src={`${spriteRoot}/rim.png`}
        alt=""
        width={72}
        height={45}
        unoptimized
        className={styles.rim}
        data-swish={hasLanded && shot.outcome === "basket"}
      />
      <Image
        src={`${spriteRoot}/court-tray.png`}
        alt=""
        width={216}
        height={56}
        unoptimized
        className={styles.tray}
      />
      <Image
        src={`${spriteRoot}/ball.png`}
        alt=""
        width={56}
        height={56}
        unoptimized
        className={styles.ball}
        data-flight={!!shot}
        data-behind-rim={shot?.outcome === "basket" && shot.age >= flightDurationMs - 50}
        data-in-tray={hasLanded && pose.y >= 86}
        style={{
          left: `${pose.x}%`,
          top: `${pose.y}%`,
          width: `${pose.width}%`,
          rotate: `${pose.rotation}deg`,
        }}
      />
      {!shot && (
        <Image
          src={`${spriteRoot}/hands.png`}
          alt=""
          width={128}
          height={90}
          unoptimized
          className={styles.hands}
          style={{ "--lift": power } as CSSProperties}
        />
      )}
    </div>
  );
};
