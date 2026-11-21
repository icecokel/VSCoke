import Image from "next/image";
import { Fragment, type CSSProperties } from "react";
import {
  flightDurationMs,
  pickupDurationMs,
  type HeldBall,
  type Shot,
  type TraySide,
} from "./arcade-basketball-engine";
import {
  getFlightPose,
  getHeldBallPose,
  getShotPose,
  getTrayBallPose,
  type BallPose,
} from "./arcade-basketball-motion";
import styles from "./arcade-basketball.module.css";

interface CourtProps {
  elapsedMs: number;
  power: number;
  trayBalls: TraySide[];
  heldBall: HeldBall | null;
  shots: Shot[];
}

interface BallProps {
  pose: BallPose;
  kind: "tray" | "held" | "shot";
  isOccluded?: boolean;
  outcome?: Shot["outcome"];
}

const spriteRoot = "/games/arcade-basketball";
const handReleaseMs = 150;
const trailDelays = [38, 76];
const impactDurationMs = 180;
const scoreEffectDurationMs = 450;
const sparkDirections = Array.from({ length: 12 }, (_, index) => {
  const angle = (index / 12) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});

const Ball = ({ pose, kind, isOccluded, outcome }: BallProps) => (
  <div
    className={styles.ball}
    data-occluded={isOccluded}
    style={{ translate: `${pose.x}% ${pose.y}%` }}
  >
    <Image
      src={`${spriteRoot}/ball.png`}
      alt=""
      width={56}
      height={56}
      unoptimized
      draggable={false}
      data-testid={`basketball-${kind}-ball`}
      data-outcome={outcome}
      style={{ scale: pose.scale, "--ball-rotation": `${pose.rotation}deg` } as CSSProperties}
    />
  </div>
);

export const ArcadeBasketballCourt = ({
  elapsedMs,
  power,
  trayBalls,
  heldBall,
  shots,
}: CourtProps) => {
  const latestShot = shots.at(-1);
  const release = latestShot ? Math.min(1, (elapsedMs - latestShot.startedAt) / handReleaseMs) : 1;
  const pickupAge = heldBall ? elapsedMs - heldBall.pickedAt : 0;
  const reach = heldBall
    ? (heldBall.side === "left" ? -1 : 1) * Math.max(0, 1 - pickupAge / pickupDurationMs)
    : 0;
  const isSwishing = shots.some(
    shot =>
      shot.outcome === "basket" &&
      elapsedMs - shot.startedAt >= flightDurationMs &&
      elapsedMs - shot.startedAt < flightDurationMs + 270,
  );

  const rimContact = shots.findLast(shot => {
    const age = elapsedMs - shot.startedAt - flightDurationMs;
    return shot.outcome === "short" && age >= 0 && age < impactDurationMs;
  });
  const impactAge = rimContact ? elapsedMs - rimContact.startedAt - flightDurationMs : 0;
  const impactStrength = rimContact ? 1 - impactAge / impactDurationMs : 0;
  const shakeX = Math.round(Math.sin(impactAge * 0.12 + 1) * 3 * impactStrength);
  const shakeY = Math.round(Math.cos(impactAge * 0.09) * impactStrength);

  return (
    <div
      className={styles.art}
      aria-hidden="true"
      data-testid="basketball-court-art"
      data-impact={!!rimContact}
      style={{ "--shake-x": `${shakeX}px`, "--shake-y": `${shakeY}px` } as CSSProperties}
    >
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
        data-swish={isSwishing}
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

      {trayBalls.map(side => (
        <Ball key={side} pose={getTrayBallPose(side)} kind="tray" isOccluded />
      ))}
      {shots.map(shot => {
        const age = elapsedMs - shot.startedAt;
        const pose = getShotPose(shot, age);
        const isBehindRim =
          shot.outcome === "basket" && age >= flightDurationMs - 50 && pose.y < 53;
        return (
          <Fragment key={shot.side}>
            {age < flightDurationMs &&
              trailDelays
                .filter(delay => age >= delay)
                .map(delay => {
                  const { x, y } = getFlightPose(shot, age - delay);
                  return (
                    <span
                      key={delay}
                      className={styles.trail}
                      style={{ translate: `${x}% ${y}%`, opacity: 0.7 - delay / 160 }}
                    />
                  );
                })}
            {shot.outcome === "basket" &&
              age >= flightDurationMs &&
              age < flightDurationMs + scoreEffectDurationMs && (
                <div
                  className={styles.scoreEffect}
                  data-testid="basketball-score-effect"
                  style={{ opacity: 1 - (age - flightDurationMs) / scoreEffectDurationMs }}
                >
                  <span className={styles.scoreStar} />
                  {sparkDirections.map((direction, index) => {
                    const progress = (age - flightDurationMs) / scoreEffectDurationMs;
                    const distance = 8 + 46 * (1 - (1 - progress) ** 2);
                    return (
                      <span
                        key={index}
                        className={styles.scoreSpark}
                        style={{
                          translate: `${Math.round(direction.x * distance)}px ${Math.round(direction.y * distance * 0.7 + 16 * progress ** 2)}px`,
                          rotate: `${Math.round(progress * 90)}deg`,
                        }}
                      />
                    );
                  })}
                </div>
              )}
            <Ball
              pose={pose}
              kind="shot"
              outcome={shot.outcome}
              isOccluded={isBehindRim || (shot.isResolved && pose.y > 82)}
            />
          </Fragment>
        );
      })}
      {heldBall && <Ball pose={getHeldBallPose(heldBall.side, pickupAge, power)} kind="held" />}

      {(heldBall || release < 1) && (
        <Image
          src={`${spriteRoot}/hands.png`}
          alt=""
          width={128}
          height={90}
          unoptimized
          draggable={false}
          className={styles.hands}
          style={
            {
              "--lift": heldBall ? power : latestShot?.power,
              "--reach": reach,
              "--release": heldBall ? 0 : release,
            } as CSSProperties
          }
        />
      )}
    </div>
  );
};
