"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/game-context";
import { getSessionApiIdToken, isAuthSessionError, type ApiTokenSession } from "@/lib/auth-token";
import { submitScore } from "@/services/score-service";
import {
  GAME_FULLSCREEN_STATE_EVENT,
  isGameFullscreenActive,
  toggleGameFullscreen,
} from "./runtime/game/input/fullscreenToggle";
import styles from "./poke-lounge.module.css";

type PokeLoungeWindow = Window & {
  __POKE_LOUNGE_GAME__?: { destroy: (removeCanvas?: boolean) => void };
  __POKE_LOUNGE_CLEANUP_FOR_TEST__?: () => void;
  __POKE_LOUNGE_E2E__?: unknown;
};

interface FinalResultState {
  score: number;
  playTime: number;
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function PokeLoungeGame() {
  const { setGamePlaying } = useGame();
  const { data: session, status } = useSession();
  const pageRef = useRef<HTMLElement>(null);
  const startedAtMsRef = useRef(Date.now());
  const [finalResult, setFinalResult] = useState<FinalResultState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success" | "auth" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState<string>("");

  const syncFullscreenState = useCallback(() => {
    const page = pageRef.current;
    setFullscreenActive(page ? isGameFullscreenActive(page) : false);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    const page = pageRef.current;
    if (!page) {
      return;
    }

    void toggleGameFullscreen(page).finally(syncFullscreenState);
  }, [syncFullscreenState]);

  useEffect(() => {
    const handleFullscreenStateChange = () => syncFullscreenState();

    document.addEventListener("fullscreenchange", handleFullscreenStateChange);
    document.addEventListener(GAME_FULLSCREEN_STATE_EVENT, handleFullscreenStateChange);
    syncFullscreenState();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenStateChange);
      document.removeEventListener(GAME_FULLSCREEN_STATE_EVENT, handleFullscreenStateChange);
    };
  }, [syncFullscreenState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isEditableEventTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setSettingsOpen(open => !open);
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cleanedUp = false;
    let destroyGamePage: (() => void) | null = null;
    setGamePlaying(true);
    startedAtMsRef.current = Date.now();
    const pokeWindow = window as PokeLoungeWindow;
    const cleanupGamePage = () => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      cancelled = true;
      setGamePlaying(false);

      if (destroyGamePage) {
        destroyGamePage();
      } else {
        pokeWindow.__POKE_LOUNGE_GAME__?.destroy(true);
      }
      delete pokeWindow.__POKE_LOUNGE_GAME__;
      delete pokeWindow.__POKE_LOUNGE_CLEANUP_FOR_TEST__;
      delete pokeWindow.__POKE_LOUNGE_E2E__;
      delete document.documentElement.dataset.pokeLoungeE2eBattle;
      pageRef.current?.classList.remove("is-game-fullscreen-fallback");
      document.body.classList.remove("is-game-fullscreen-fallback-active");
      document.querySelector<HTMLElement>("#game-root")?.replaceChildren();
    };

    if (new URLSearchParams(window.location.search).has("e2e")) {
      pokeWindow.__POKE_LOUNGE_CLEANUP_FOR_TEST__ = cleanupGamePage;
    }

    void import("./runtime/game-page").then(async ({ startGamePageFromDocument }) => {
      if (!cancelled) {
        const gamePage = await startGamePageFromDocument(document, new URL(window.location.href), {
          onGameResult: result => {
            setFinalResult({
              score: result.score,
              playTime: Math.max(1, Math.floor((Date.now() - startedAtMsRef.current) / 1000)),
            });
            setSubmitStatus("idle");
            setSubmitMessage("");
          },
        });

        if (cancelled) {
          gamePage.destroy();
          return;
        }

        destroyGamePage = () => gamePage.destroy();
      }
    });

    return cleanupGamePage;
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
    <main
      ref={pageRef}
      className={`${styles.page} phaser-game-page`}
      data-testid="poke-lounge-page"
    >
      <div id="game-root" data-testid="poke-lounge-game-root" />
      {settingsOpen ? (
        <section
          className={styles.settingsOverlay}
          data-poke-lounge-settings="true"
          aria-label="Poke Lounge 설정"
        >
          <div className={styles.settingsHeader}>
            <p className={styles.settingsTitle}>설정</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={styles.settingsCloseButton}
              onClick={() => setSettingsOpen(false)}
              data-poke-lounge-settings-close="true"
            >
              닫기
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className={styles.settingsFullscreenButton}
            onClick={handleFullscreenToggle}
            aria-label={fullscreenActive ? "전체화면 끄기" : "전체화면 켜기"}
            aria-pressed={fullscreenActive}
            data-fullscreen-toggle="true"
            data-fullscreen-toggle-placement="settings"
          >
            {fullscreenActive ? "전체화면 끄기" : "전체화면 켜기"}
          </Button>
        </section>
      ) : null}
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
