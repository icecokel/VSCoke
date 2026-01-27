"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { BlockTowerConfig } from "./block-tower-config";
import { useBoolean } from "@/hooks/use-boolean";
import { useTranslations } from "next-intl";
import { ResultScreen } from "../result-screen";

interface BlockTowerGameProps {
  isPlaying: boolean;
  onReady: () => void;
  onGoToReady: () => void;
  onRestart: () => void;
}

interface GameResult {
  score: number;
}

// 로딩 오버레이 컴포넌트
const LoadingOverlay = ({ progress }: { progress: number }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90">
    <div className="text-xl text-white mb-4">Loading...</div>
    <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-teal-400 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
    <div className="text-sm text-gray-400 mt-2">{Math.round(progress)}%</div>
  </div>
);

export const BlockTowerGame = ({
  isPlaying,
  onReady,
  onGoToReady,
  onRestart,
}: BlockTowerGameProps) => {
  const t = useTranslations("Game");
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const loaded = useBoolean(false);
  const isLoaded = loaded.value;
  const { onTrue } = loaded;

  useEffect(() => {
    if (typeof window !== "undefined" && !gameRef.current) {
      gameRef.current = new Phaser.Game(BlockTowerConfig);

      // 게임 텍스트를 레지스트리에 주입
      gameRef.current.registry.set("texts", {
        score: t("score"),
        height: t("height"),
        gameOver: t("gameOver"),
        finalScore: t("finalScore"),
        restart: t("restart"),
        goBack: t("goBack"),
        tapToDrop: t("tapToDrop"),
      });

      // React-Phaser 통신을 위한 이벤트 리스너
      gameRef.current.events.on("game:ready", () => {
        onTrue();
        onReady();
      });

      gameRef.current.events.on("game:progress", (value: number) => {
        setLoadingProgress(value * 100);
      });

      gameRef.current.events.on("game:goToReady", () => {
        onGoToReady();
      });

      gameRef.current.events.on("game:over", (data: GameResult) => {
        setGameResult(data);
      });
    }

    return () => {
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true);
        } catch (e) {
          console.warn("Error destroying game:", e);
        }
        gameRef.current = null;
      }
    };
  }, [t, onReady, onGoToReady, onTrue]);

  // 시작 신호 처리
  useEffect(() => {
    if (isPlaying && isLoaded && gameRef.current) {
      gameRef.current.events.emit("game:start");
    }
  }, [isPlaying, isLoaded]);

  // 리사이즈 처리
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current || !gameRef.current) return;
      const targetW = containerRef.current.clientWidth;
      const targetH = containerRef.current.clientHeight;
      gameRef.current.events.emit("external-resize", { width: targetW, height: targetH });
    };

    window.addEventListener("resize", updateSize);
    const timer = setTimeout(updateSize, 100);

    return () => {
      window.removeEventListener("resize", updateSize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative size-full overflow-hidden rounded-xl border border-white/10 shadow-2xl">
      {!isLoaded && <LoadingOverlay progress={loadingProgress} />}
      {gameResult && (
        <ResultScreen score={gameResult.score} gameName="block-tower" onRestart={onRestart} />
      )}
      <div ref={containerRef} id="phaser-container" className="size-full" />
    </div>
  );
};
