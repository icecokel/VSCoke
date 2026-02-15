"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGame } from "@/contexts/game-context";
import { ArrowDriftConstants } from "@/components/arrow-drift/arrow-drift-constants";
import { ArrowDriftReadyScreen } from "@/components/arrow-drift/arrow-drift-ready-screen";
import { ArrowDriftResultScreen } from "@/components/arrow-drift/arrow-drift-result-screen";

const ArrowDriftPhaserGame = dynamic(
  () =>
    import("@/components/arrow-drift/arrow-drift-phaser-game").then(
      mod => mod.ArrowDriftPhaserGame,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center bg-slate-900 text-white">
        <p className="animate-pulse text-xl">Loading Arrow Drift...</p>
      </div>
    ),
  },
);

type GameState = "ready" | "playing" | "game-over";

export default function ArrowDriftPage() {
  const isMobile = useIsMobile();
  const { setGamePlaying } = useGame();
  const [gameState, setGameState] = useState<GameState>("ready");
  const [gameKey, setGameKey] = useState(0);
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [shouldAutoStartOnReady, setShouldAutoStartOnReady] = useState(false);

  useEffect(() => {
    setGamePlaying(gameState === "playing");
    return () => setGamePlaying(false);
  }, [gameState, setGamePlaying]);

  const handleReady = useCallback(() => {
    setIsGameLoaded(true);
  }, []);

  const handleStart = useCallback(() => {
    if (!isGameLoaded) return;
    setShouldAutoStartOnReady(false);
    setFinalScore(0);
    setGameState("playing");
  }, [isGameLoaded]);

  useEffect(() => {
    if (!isGameLoaded || !shouldAutoStartOnReady) return;
    setShouldAutoStartOnReady(false);
    setFinalScore(0);
    setGameState("playing");
  }, [isGameLoaded, shouldAutoStartOnReady]);

  useEffect(() => {
    if (gameState !== "ready") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      handleStart();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, handleStart]);

  const handleGameOver = useCallback((score: number) => {
    setShouldAutoStartOnReady(false);
    setFinalScore(score);
    setGameState("game-over");
    console.log(`[Arrow Drift] game over score: ${score}`);
  }, []);

  const handleRestart = useCallback(() => {
    // Force a full game session reset before auto-starting.
    setFinalScore(0);
    setGameState("ready");
    setIsGameLoaded(false);
    setShouldAutoStartOnReady(true);
    setGameKey(prev => prev + 1);
  }, []);

  const containerStyle = isMobile
    ? {
        position: "fixed" as const,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 50,
        border: "none",
        borderRadius: 0,
      }
    : {
        maxWidth: `${ArrowDriftConstants.MAX_WIDTH}px`,
        maxHeight: "calc(100% - 8px)",
        aspectRatio: ArrowDriftConstants.ASPECT_RATIO_CSS,
      };

  return (
    <main className="flex h-full w-full flex-col items-center justify-center bg-slate-950 p-0 sm:p-4">
      <div
        className={`relative overflow-hidden bg-black shadow-2xl transition-all duration-300 ${!isMobile ? "w-full rounded-xl border-0 border-slate-700 sm:border-4" : ""}`}
        style={containerStyle}
      >
        {gameState === "ready" && (
          <div className="absolute inset-0 z-20">
            <ArrowDriftReadyScreen
              onStart={handleStart}
              isStartEnabled={isGameLoaded}
              isMobile={isMobile}
            />
          </div>
        )}

        {gameState === "game-over" && (
          <ArrowDriftResultScreen score={finalScore} onRestart={handleRestart} />
        )}

        <div className="size-full">
          <ArrowDriftPhaserGame
            key={gameKey}
            isPlaying={gameState === "playing"}
            onReady={handleReady}
            onGameOver={handleGameOver}
            showLoadingOverlay={false}
          />
        </div>
      </div>
    </main>
  );
}
