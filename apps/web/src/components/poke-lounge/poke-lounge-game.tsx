"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/game-context";
import { getSessionApiIdToken, isAuthSessionError, type ApiTokenSession } from "@/lib/auth-token";
import { submitScore } from "@/services/score-service";
import styles from "./poke-lounge.module.css";

type PokeLoungeWindow = Window & {
  __POKE_LOUNGE_GAME__?: { destroy: (removeCanvas?: boolean) => void };
  __POKE_LOUNGE_E2E__?: unknown;
};

interface FinalResultState {
  score: number;
  playTime: number;
}

export function PokeLoungeGame() {
  const { setGamePlaying } = useGame();
  const { data: session, status } = useSession();
  const startedAtMsRef = useRef(Date.now());
  const [finalResult, setFinalResult] = useState<FinalResultState | null>(null);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success" | "auth" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setGamePlaying(true);
    startedAtMsRef.current = Date.now();

    void import("./runtime/game-page").then(({ startGamePageFromDocument }) => {
      if (!cancelled) {
        void startGamePageFromDocument(document, new URL(window.location.href), {
          onGameResult: result => {
            setFinalResult({
              score: result.score,
              playTime: Math.max(1, Math.floor((Date.now() - startedAtMsRef.current) / 1000)),
            });
            setSubmitStatus("idle");
            setSubmitMessage("");
          },
        });
      }
    });

    return () => {
      cancelled = true;
      setGamePlaying(false);

      const pokeWindow = window as PokeLoungeWindow;
      pokeWindow.__POKE_LOUNGE_GAME__?.destroy(true);
      delete pokeWindow.__POKE_LOUNGE_GAME__;
      delete pokeWindow.__POKE_LOUNGE_E2E__;
      delete document.documentElement.dataset.pokeLoungeE2eBattle;
      document.body.classList.remove("is-game-fullscreen-fallback-active");
      document.querySelector<HTMLElement>("#game-root")?.replaceChildren();
    };
  }, [setGamePlaying]);

  const handleSubmitResult = useCallback(async () => {
    if (!finalResult || submitStatus === "submitting" || submitStatus === "success") {
      return;
    }

    const apiSession = session as ApiTokenSession | null;
    const token = getSessionApiIdToken(apiSession);

    if (status !== "authenticated" || !token || isAuthSessionError(apiSession?.error)) {
      setSubmitStatus("auth");
      setSubmitMessage("로그인 후 점수를 기록할 수 있습니다.");
      return;
    }

    setSubmitStatus("submitting");
    setSubmitMessage("점수를 기록하는 중입니다.");

    const result = await submitScore(
      {
        gameName: "poke-lounge",
        score: finalResult.score,
        playTime: finalResult.playTime,
      },
      token,
    );

    if (result.success) {
      setSubmitStatus("success");
      setSubmitMessage("Poke Lounge 점수가 기록되었습니다.");
      return;
    }

    setSubmitStatus(result.requiresAuth ? "auth" : "error");
    setSubmitMessage(
      result.requiresAuth
        ? "로그인 후 점수를 기록할 수 있습니다."
        : (result.message ?? "점수 기록에 실패했습니다."),
    );
  }, [finalResult, session, status, submitStatus]);

  return (
    <main className={`${styles.page} phaser-game-page`} data-testid="poke-lounge-page">
      <div id="game-root" data-testid="poke-lounge-game-root" />
      {finalResult ? (
        <section className={styles.resultOverlay} data-testid="poke-lounge-result-panel">
          <p className={styles.resultEyebrow}>Final Result</p>
          <div className={styles.resultScore} data-testid="poke-lounge-result-score">
            {finalResult.score}
          </div>
          <p className={styles.resultMeta}>{finalResult.playTime}s</p>
          <Button
            type="button"
            onClick={handleSubmitResult}
            disabled={submitStatus === "submitting" || submitStatus === "success"}
            data-testid="poke-lounge-result-submit"
          >
            {submitStatus === "submitting" ? "기록 중" : "점수 기록"}
          </Button>
          <p
            className={styles.resultStatus}
            data-testid="poke-lounge-result-status"
            aria-live="polite"
          >
            {submitMessage}
          </p>
        </section>
      ) : null}
    </main>
  );
}
