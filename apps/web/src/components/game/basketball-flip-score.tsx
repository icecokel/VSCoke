"use client";

import { useState } from "react";
import styles from "./basketball-flip-score.module.css";

interface FlipScoreProps {
  score: number;
  isPaused: boolean;
}

export const BasketballFlipScore = ({ score, isPaused }: FlipScoreProps) => {
  const [display, setDisplay] = useState({ current: score, previous: score });
  if (display.current !== score) {
    setDisplay({ current: score, previous: display.current });
  }

  const digits = String(display.current).padStart(2, "0");
  const previousDigits = String(display.previous).padStart(digits.length, "0");

  return (
    <strong className={styles.score} data-testid="basketball-score" data-paused={isPaused}>
      <span className="sr-only">{digits}</span>
      <span className={styles.digits} aria-hidden="true">
        {Array.from(digits, (digit, index) => {
          const previous = previousDigits[index] ?? "0";
          return (
            <span
              className={styles.digit}
              key={index}
              data-value={digit}
              data-testid="basketball-score-digit"
            >
              <span className={styles.face} data-value={digit} />
              {previous !== digit && (
                <span className={styles.turn} key={`${display.previous}-${display.current}`}>
                  <span className={`${styles.face} ${styles.oldBottom}`} data-value={previous} />
                  <span className={`${styles.face} ${styles.flipTop}`} data-value={previous} />
                  <span className={`${styles.face} ${styles.flipBottom}`} data-value={digit} />
                </span>
              )}
            </span>
          );
        })}
      </span>
    </strong>
  );
};
