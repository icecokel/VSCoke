"use client";

import { Pause } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useGame } from "@/contexts/game-context";
import { ArcadeBasketballCourt } from "./arcade-basketball-court";
import {
  basketballReducer,
  countdownMs,
  getShotPower,
  roundDurationMs,
  sweetSpot,
} from "./arcade-basketball-engine";
import styles from "./arcade-basketball.module.css";

const bestScoreKey = "vscoke-arcade-basketball-best";
const meterSegments = 20;
const isShotKey = (key: string) => key === " " || key === "Enter";

type ShotInput = { type: "key"; key: string } | { type: "pointer"; id: number };

const readBestScore = (): number => {
  try {
    const score = Number(localStorage.getItem(bestScoreKey));
    return Number.isSafeInteger(score) && score >= 0 ? score : 0;
  } catch {
    return 0;
  }
};

export const ArcadeBasketballGame = () => {
  const t = useTranslations("Game.arcadeBasketball");
  const [state, dispatch] = useReducer(basketballReducer, { phase: "ready" });
  const [previousBest, setPreviousBest] = useState(0);
  const shotInput = useRef<ShotInput | null>(null);
  const shootRef = useRef<HTMLButtonElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const instructionId = "arcade-basketball-instruction";
  const { setGamePlaying } = useGame();

  const { phase } = state;
  const round = phase === "round" || phase === "paused" ? state.round : null;
  const isActive = !!round;
  const elapsedMs = round?.elapsedMs ?? 0;
  const countdown = round ? Math.max(0, Math.ceil((countdownMs - elapsedMs) / 1_000)) : 0;
  const remaining =
    phase === "finished"
      ? 0
      : Math.max(0, Math.ceil((roundDurationMs - Math.max(0, elapsedMs - countdownMs)) / 1_000));
  const score = phase === "finished" ? state.score : (round?.score ?? 0);
  const chargeStartedAt = round?.chargeStartedAt;
  const isCharging = chargeStartedAt != null;
  const power = isCharging ? getShotPower(elapsedMs - chargeStartedAt) : 0;
  const isInSweetSpot = power >= sweetSpot.start && power <= sweetSpot.end;
  const shot = round?.shot
    ? { age: elapsedMs - round.shot.startedAt, outcome: round.shot.outcome }
    : null;
  const feedback = round?.shot?.isResolved ? round.shot.outcome : null;
  const canShoot = phase === "round" && countdown === 0 && remaining > 0 && !shot;

  useEffect(() => {
    if (phase !== "round") return;

    let frame: number;
    const tick = (now: number) => {
      dispatch({ type: "tick", now });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (!isActive) return;
    setGamePlaying(true);
    return () => setGamePlaying(false);
  }, [isActive, setGamePlaying]);

  useEffect(() => {
    if (phase === "round") shootRef.current?.focus({ preventScroll: true });
    if (phase === "finished") restartRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (phase !== "finished" || score <= readBestScore()) return;
    try {
      localStorage.setItem(bestScoreKey, String(score));
    } catch {
      // 저장 공간에 접근할 수 없어도 이번 판의 결과는 보여 준다.
    }
  }, [phase, score]);

  const pause = useCallback(() => {
    shotInput.current = null;
    dispatch({ type: "pause", now: performance.now() });
  }, []);

  useEffect(() => {
    if (phase !== "round") return;

    const onVisibilityChange = () => {
      if (document.hidden) pause();
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        pause();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", pause);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", pause);
      window.removeEventListener("keydown", onEscape);
    };
  }, [phase, pause]);

  const start = () => {
    shotInput.current = null;
    setPreviousBest(readBestScore());
    dispatch({ type: "start", now: performance.now() });
  };

  const beginCharge = (input: ShotInput) => {
    if (!canShoot || shotInput.current) return false;
    shotInput.current = input;
    dispatch({ type: "press", now: performance.now() });
    return true;
  };

  const endCharge = (type: "release" | "cancel") => {
    shotInput.current = null;
    dispatch({ type, now: performance.now() });
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.currentTarget.focus({ preventScroll: true });
    if (beginCharge({ type: "pointer", id: event.pointerId })) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const endPointerCharge = (event: PointerEvent<HTMLButtonElement>, type: "cancel" | "release") => {
    const input = shotInput.current;
    if (input?.type === "pointer" && input.id === event.pointerId) endCharge(type);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isShotKey(event.key)) return;
    event.preventDefault();
    if (!event.repeat) beginCharge({ type: "key", key: event.key });
  };

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isShotKey(event.key)) return;
    event.preventDefault();
    const input = shotInput.current;
    if (input?.type === "key" && input.key === event.key) endCharge("release");
  };

  const resume = () => dispatch({ type: "resume", now: performance.now() });

  return (
    <section
      className={styles.frame}
      aria-label={t("title")}
      data-phase={phase}
      data-testid="arcade-basketball"
    >
      <header className={styles.header}>
        <div className={styles.score}>
          <span>{t("score")}</span>
          <strong data-testid="basketball-score">{String(score).padStart(2, "0")}</strong>
        </div>
        <div className={styles.clock}>
          <span className="sr-only">{t("remainingTime")}</span>
          <span data-danger={remaining <= 5} data-testid="basketball-time">
            00:{String(remaining).padStart(2, "0")}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          disabled={phase !== "round"}
          aria-label={t("pause")}
          onClick={pause}
        >
          <Pause aria-hidden="true" />
        </Button>
      </header>

      <div className={styles.courtArea}>
        <div className={styles.court}>
          <ArcadeBasketballCourt power={power} shot={shot} />
          {isActive && (
            <button
              ref={shootRef}
              type="button"
              className={styles.shoot}
              aria-label={t("shoot")}
              aria-describedby={instructionId}
              tabIndex={phase === "round" ? 0 : -1}
              onContextMenu={event => event.preventDefault()}
              onPointerDown={onPointerDown}
              onPointerUp={event => endPointerCharge(event, "release")}
              onPointerCancel={event => endPointerCharge(event, "cancel")}
              onLostPointerCapture={event => endPointerCharge(event, "cancel")}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              onBlur={() => {
                if (shotInput.current?.type === "key") endCharge("cancel");
              }}
            />
          )}
          {phase === "ready" && (
            <div className={styles.overlay}>
              <h1>{t("title")}</h1>
              <Button size="lg" className={styles.primary} onClick={start}>
                {t("start")}
              </Button>
            </div>
          )}
          {isActive && countdown > 0 && (
            <div className={styles.countdown} aria-hidden="true" data-testid="basketball-countdown">
              {countdown}
            </div>
          )}
          {isActive && (
            <div
              role="status"
              className={styles.feedback}
              data-outcome={feedback ?? undefined}
              data-testid="basketball-feedback"
            >
              {feedback === "basket" && <strong aria-hidden="true">+1</strong>}
              {feedback && <span>{t(feedback)}</span>}
            </div>
          )}
          {phase === "finished" && (
            <div className={styles.overlay} data-testid="basketball-result">
              <h1>{t("finished")}</h1>
              <dl className={styles.result}>
                <div>
                  <dt>{t("score")}</dt>
                  <dd>{score}</dd>
                </div>
                <div>
                  <dt>{t("best")}</dt>
                  <dd data-testid="basketball-best">{Math.max(score, previousBest)}</dd>
                </div>
              </dl>
              <Button ref={restartRef} size="lg" className={styles.primary} onClick={start}>
                {t("restart")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <div
          role="meter"
          aria-label={t("power")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(power * 100)}
          className={styles.meter}
          data-perfect={isInSweetSpot}
          style={{ "--charge": power } as CSSProperties}
        >
          {Array.from({ length: meterSegments }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              data-target={
                index >= sweetSpot.start * meterSegments && index < sweetSpot.end * meterSegments
              }
              data-filled={index < Math.floor(power * meterSegments)}
            />
          ))}
          {isCharging && <i aria-hidden="true" className={styles.marker} />}
        </div>
        <p id={instructionId}>
          {t("instruction")}
          <span className="sr-only"> {t("keyboardInstruction")}</span>
        </p>
      </footer>

      <Dialog open={phase === "paused"} onOpenChange={isOpen => !isOpen && resume()}>
        <DialogContent
          showCloseButton={false}
          onPointerDownOutside={event => event.preventDefault()}
          onCloseAutoFocus={event => {
            event.preventDefault();
            shootRef.current?.focus({ preventScroll: true });
          }}
        >
          <DialogTitle>{t("paused")}</DialogTitle>
          <DialogDescription>{t("pauseDescription")}</DialogDescription>
          <Button className={styles.primary} onClick={resume}>
            {t("resume")}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
};
