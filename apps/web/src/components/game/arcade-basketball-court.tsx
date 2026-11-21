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
