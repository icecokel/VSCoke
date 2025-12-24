"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { GameConfig } from "./GameConfig";
import { LoadingOverlay } from "./ui/LoadingOverlay";
import { ResultScreen } from "./ResultScreen";
import { useBoolean } from "@/hooks/use-boolean";

import { useTranslations } from "next-intl";

interface PhaserGameProps {
  isPlaying: boolean;
  onReady: () => void;
  onGoToReady: () => void;
  onRestart: () => void;
}

interface GameResult {
  score: number;
}

const PhaserGame = ({ isPlaying, onReady, onGoToReady, onRestart }: PhaserGameProps) => {
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
      gameRef.current = new Phaser.Game(GameConfig);

      // Inject game texts into the registry
      gameRef.current.registry.set("texts", {
        score: t("score"),
        deadline: t("deadline"),
        start: t("start"),
        gameOver: t("gameOver"),
        finalScore: t("finalScore"),
        restart: t("restart"),
        goBack: t("goBack"),
        time: t("time"),
      });

      // Event listeners for React-Phaser communication
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
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [t, onReady, onGoToReady, onTrue]);

  // Handle start signal
  useEffect(() => {
    if (isPlaying && gameRef.current) {
      gameRef.current.events.emit("game:start");
    }
  }, [isPlaying]);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;

      // CSS가 크기를 처리합니다 (aspect-ratio: 9/16, max-width: 420px)
      // 실제 크기를 게임에 보고하기만 하면 됩니다.
      const targetW = containerRef.current.clientWidth;
      const targetH = containerRef.current.clientHeight;

      // CSS가 처리하므로 style.width/height를 수동으로 설정할 필요가 없습니다.

      // 직접 이벤트 터널 (사용자 요청)
      // RESIZE 모드가 처리하지만, '이벤트 터널을 통해 크기 전송'을 요청받았습니다.
      if (gameRef.current) {
        gameRef.current.events.emit("external-resize", { width: targetW, height: targetH });
      }
    };

    window.addEventListener("resize", updateSize);
    // 짧은 지연 후 리사이즈 호출 (초기 로드 시 부모 컨테이너 크기 확정 대기)
    const timer = setTimeout(updateSize, 100);

    return () => {
      window.removeEventListener("resize", updateSize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative size-full overflow-hidden rounded-xl border border-white/10 shadow-2xl">
      {!isLoaded && <LoadingOverlay progress={loadingProgress} />}
      {gameResult && <ResultScreen score={gameResult.score} onRestart={onRestart} />}
      <div ref={containerRef} id="phaser-container" className="size-full" />
    </div>
  );
};

export default PhaserGame;
