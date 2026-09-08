"use client";

import { useCallback, useEffect, useReducer, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, Volume2, VolumeX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useGame } from "@/contexts/game-context";
import { GameReadyScreen } from "./game-ready-screen";
import { ResultScreen } from "./result-screen";
import { SkyDropBoard } from "./sky-drop-board";
import { createSkyDropState, skyDropReducer } from "./sky-drop-engine";
import { clearSkyDropPendingScore, parsePendingSkyDropScore } from "./sky-drop-storage";
import { useSkyDropSound } from "./use-sky-drop-sound";
import styles from "./sky-drop.module.css";

export const SkyDropGame = () => {
  const game = useTranslations("Game");
  const t = useTranslations("Game.skyDrop");
  const router = useCustomRouter();
  const { setGamePlaying } = useGame();
  const [state, dispatch] = useReducer(skyDropReducer, undefined, createSkyDropState);
  const [isRestored, setIsRestored] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const unlockSound = useSkyDropSound(state.feedback, isMuted);

  useEffect(() => {
    try {
      const pending = parsePendingSkyDropScore(localStorage.getItem("pendingScore"), Date.now());
      if (pending) dispatch({ type: "restore", score: pending.score, playTime: pending.playTime });
      else clearSkyDropPendingScore();
    } catch {
      // 저장소 접근 실패는 새 게임을 막지 않는다.
    }
    setIsRestored(true);
  }, []);

  useEffect(() => {
    setGamePlaying(state.status !== "ready");
    return () => setGamePlaying(false);
  }, [state.status, setGamePlaying]);

  useEffect(() => {
    if (state.status === "playing") contentRef.current?.focus({ preventScroll: true });
    if (state.status === "paused") resumeRef.current?.focus({ preventScroll: true });
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "playing") return;
    // 이동·소멸은 CSS가 처리한다. React는 100ms 단위 논리 틱만 갱신한다.
    const timer = window.setInterval(() => dispatch({ type: "tick", now: performance.now() }), 100);
    const pauseWhenHidden = () => {
      if (document.hidden) dispatch({ type: "pause", now: performance.now() });
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [state.status]);

  const start = useCallback(() => {
    clearSkyDropPendingScore();
    unlockSound();
    dispatch({ type: "start", seed: Math.floor(Math.random() * 2 ** 32), now: performance.now() });
  }, [unlockSound]);
  const select = (column: number) => {
    unlockSound();
    dispatch({ type: "select", column, now: performance.now() });
  };
  const resume = () => {
    unlockSound();
    dispatch({ type: "resume", now: performance.now() });
  };
  const exit = () => {
    clearSkyDropPendingScore();
    router.push("/game");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.repeat ||
      event.nativeEvent.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input, textarea, select, [contenteditable=true]")
    )
      return;
    if (event.key === "Escape" && (state.status === "playing" || state.status === "paused")) {
      event.preventDefault();
      event.stopPropagation();
      if (state.status === "playing") dispatch({ type: "pause", now: performance.now() });
      else resume();
      return;
    }
    const column = ["KeyQ", "KeyW", "KeyE"].indexOf(event.code);
    if (state.status === "playing" && column >= 0) {
      event.preventDefault();
      select(column);
    }
  };
  const seconds = Math.floor(state.elapsedMs / 1000);
  const clock = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  return (
    <section
      className={styles.frame}
      aria-label={t("title")}
      data-testid="sky-drop-game"
      data-state={state.status}
    >
      <div ref={contentRef} className={styles.content} tabIndex={-1} onKeyDown={onKeyDown}>
        {state.status === "ready" ? (
          <GameReadyScreen onStart={start} isReady={isRestored} />
        ) : state.status === "over" ? (
          <ResultScreen
            score={state.score}
            gameName="sky-drop"
            onRestart={start}
            playTime={
              state.elapsedMs > 0
                ? Math.max(1, Math.ceil(state.elapsedMs / 1000))
                : state.restoredPlayTime
            }
          />
        ) : (
          <>
            <header
              inert={state.status === "paused"}
              className="mb-3 flex shrink-0 items-center justify-between gap-2"
            >
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                  {t("title")}
                </p>
                <output
                  data-testid="sky-drop-score"
                  aria-label={game("score")}
                  className="block text-3xl leading-tight font-bold tabular-nums"
                >
                  {state.score.toLocaleString()}
                </output>
              </div>
              <div className="ml-auto text-right">
                <span className="sr-only">{game("time")}</span>
                <span
                  data-testid="sky-drop-time"
                  className="font-mono text-sm text-muted-foreground"
                >
                  {clock}
                </span>
                <p
                  className="min-h-4 text-xs font-semibold text-coral-400"
                  data-testid="sky-drop-combo"
                >
                  {state.combo >= 2 ? t("combo", { count: state.combo }) : ""}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-11"
                onClick={() => setIsMuted(value => !value)}
                aria-label={isMuted ? t("unmute") : t("mute")}
                aria-pressed={isMuted}
              >
                {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-11"
                onClick={() => dispatch({ type: "pause", now: performance.now() })}
                aria-label={t("pause")}
                disabled={state.status === "paused"}
              >
                <Pause aria-hidden="true" />
              </Button>
            </header>
            <SkyDropBoard state={state} onSelect={select} />
            {state.status === "paused" && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-background/95 px-6 text-center"
                role="group"
                aria-labelledby="sky-drop-paused"
                data-testid="sky-drop-paused"
              >
                <Pause className="size-8 text-muted-foreground" aria-hidden="true" />
                <h2 id="sky-drop-paused" className="text-2xl font-bold">
                  {t("paused")}
                </h2>
                <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                  {t("pausedHint")}
                </p>
                <Button
                  ref={resumeRef}
                  type="button"
                  onClick={resume}
                  className="min-h-11 w-full max-w-xs"
                >
                  <Play aria-hidden="true" />
                  {t("resume")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={exit}
                  className="min-h-11 w-full max-w-xs"
                >
                  <ArrowLeft aria-hidden="true" />
                  {game("exit")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
