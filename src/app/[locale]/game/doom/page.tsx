"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGame } from "@/contexts/game-context";
import { DoomReadyScreen } from "@/components/game/doom/ui/DoomReadyScreen";

const DoomGame = dynamic(
  () =>
    import("@/components/game/doom/DoomGame").then(mod => ({
      default: mod.DoomGame,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center bg-black text-green-400 font-mono">
        <p className="animate-pulse text-xl">Loading ASCII DOOM...</p>
      </div>
    ),
  },
);

export default function DoomPage() {
  const isMobile = useIsMobile();
  const { setGamePlaying } = useGame();
  const [gameState, setGameState] = useState<"ready" | "playing">("ready");
  const [gameKey, setGameKey] = useState(0);

  // 게임 상태 전역 동기화
  useEffect(() => {
    setGamePlaying(gameState === "playing");
    return () => setGamePlaying(false);
  }, [gameState, setGamePlaying]);

  const handleGameReady = useCallback(() => {
    // Doom 로드 완료 시 추가 작업
  }, []);

  const handleStart = () => {
    setGameState("playing");
  };

  const handleGoToReady = useCallback(() => {
    setGameState("ready");
    setGameKey(prev => prev + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setGameState("playing");
    setGameKey(prev => prev + 1);
  }, []);

  // 스타일: 모바일은 전체화면, 데스크탑은 4:3 비율
  const containerStyle = isMobile
    ? {
        position: "fixed" as const,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 50,
      }
    : {
        maxWidth: "900px",
        maxHeight: "calc(100% - 8px)",
        aspectRatio: "4/3",
      };

  return (
    <main className="flex h-full w-full flex-col items-center justify-center bg-black p-0 sm:p-4">
      <div
        className={`relative overflow-hidden bg-black shadow-2xl ${!isMobile ? "w-full rounded-xl border-2 border-green-900" : ""}`}
        style={containerStyle}
      >
        {gameState === "ready" && (
          <div className="absolute inset-0 z-20">
            <DoomReadyScreen onStart={handleStart} isMobile={isMobile} />
          </div>
        )}

        <div className="size-full">
          <DoomGame
            key={gameKey}
            isPlaying={gameState === "playing"}
            onReady={handleGameReady}
            onGoToReady={handleGoToReady}
            onRestart={handleRestart}
          />
        </div>
      </div>
    </main>
  );
}
