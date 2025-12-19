"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { GameConstants } from "@/components/game/GameConstants";
import { useIsMobile } from "@/hooks/use-mobile";
import GameReadyScreen from "@/components/game/GameReadyScreen";

const PhaserGame = dynamic(() => import("@/components/game/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-gray-900 text-white">
      <p className="animate-pulse text-xl">Loading Sky Drop...</p>
    </div>
  ),
});

export default function GamePage() {
  const isMobile = useIsMobile();
  const [gameState, setGameState] = useState<"ready" | "playing">("ready");
  const [gameKey, setGameKey] = useState(0);

  const handleGameReady = useCallback(() => {
    // Phaser 로드 완료 시 추가 작업이 필요하면 여기에 작성
  }, []);

  const handleStart = () => {
    setGameState("playing");
  };

  const handleGoToReady = useCallback(() => {
    setGameState("ready");
    setGameKey(prev => prev + 1); // Phaser 인스턴스 초기화
  }, []);

  // 모바일 스타일: 전체화면 고정
  const containerStyle = isMobile
    ? {
        position: "fixed" as const,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 50,
        border: "none",
        borderRadius: 0,
      }
    : {
        maxWidth: `${GameConstants.MAX_WIDTH}px`,
        maxHeight: "calc(100% - 8px)",
        aspectRatio: GameConstants.ASPECT_RATIO_CSS,
      };

  return (
    <main className="flex h-screen w-full flex-col items-center justify-center bg-slate-900 p-0 sm:p-4">
      <div
        className={`relative overflow-hidden bg-black shadow-2xl transition-all duration-300 ${!isMobile ? "w-full rounded-xl border-0 border-slate-700 sm:border-4" : ""}`}
        style={containerStyle}
      >
        {gameState === "ready" && (
          <div className="absolute inset-0 z-20">
            <GameReadyScreen onStart={handleStart} isMobile={isMobile} />
          </div>
        )}

        <div className="size-full">
          <PhaserGame
            key={gameKey}
            isPlaying={gameState === "playing"}
            onReady={handleGameReady}
            onGoToReady={handleGoToReady}
          />
        </div>
      </div>
    </main>
  );
}
