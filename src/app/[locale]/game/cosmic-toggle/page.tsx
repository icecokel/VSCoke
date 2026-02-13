"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGame } from "@/contexts/game-context";
import { CosmicToggleConstants } from "@/components/cosmic-toggle/cosmic-toggle-constants";
import { CosmicToggleReadyScreen } from "@/components/cosmic-toggle/cosmic-toggle-ready-screen";
import { CosmicToggleResultScreen } from "@/components/cosmic-toggle/cosmic-toggle-result-screen";

const CosmicTogglePhaserGame = dynamic(
  () =>
    import("@/components/cosmic-toggle/cosmic-toggle-phaser-game").then(
      mod => mod.CosmicTogglePhaserGame,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center bg-slate-900 text-white">
        <p className="animate-pulse text-xl">Loading Cosmic Toggle...</p>
      </div>
    ),
  },
);

type GameState = "ready" | "playing" | "game-over";

export default function CosmicTogglePage() {
  const isMobile = useIsMobile();
  const { setGamePlaying } = useGame();
  const [gameState, setGameState] = useState<GameState>("ready");
  const [gameKey, setGameKey] = useState(0);
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    setGamePlaying(gameState === "playing");
    return () => setGamePlaying(false);
  }, [gameState, setGamePlaying]);

  const handleReady = useCallback(() => {
    setIsGameLoaded(true);
  }, []);

  const handleStart = useCallback(() => {
    if (!isGameLoaded) return;
    setFinalScore(0);
    setGameState("playing");
  }, [isGameLoaded]);

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setGameState("game-over");
    console.log(`[Cosmic Toggle] game over score: ${score}`);
  }, []);

  const handleRestart = useCallback(() => {
    setFinalScore(0);
    setIsGameLoaded(false);
    setGameState("playing");
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
        maxWidth: `${CosmicToggleConstants.MAX_WIDTH}px`,
        maxHeight: "calc(100% - 8px)",
        aspectRatio: CosmicToggleConstants.ASPECT_RATIO_CSS,
      };

  return (
    <main className="flex h-full w-full flex-col items-center justify-center bg-slate-950 p-0 sm:p-4">
      <div
        className={`relative overflow-hidden bg-black shadow-2xl transition-all duration-300 ${!isMobile ? "w-full rounded-xl border-0 border-slate-700 sm:border-4" : ""}`}
        style={containerStyle}
      >
        {gameState === "ready" && (
          <div className="absolute inset-0 z-20">
            <CosmicToggleReadyScreen
              onStart={handleStart}
              isStartEnabled={isGameLoaded}
              isMobile={isMobile}
            />
          </div>
        )}

        {gameState === "game-over" && (
          <CosmicToggleResultScreen score={finalScore} onRestart={handleRestart} />
        )}

        <div className="size-full">
          <CosmicTogglePhaserGame
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
