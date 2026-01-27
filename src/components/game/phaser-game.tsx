"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { GameConfig } from "./game-config";
import { LoadingOverlay } from "./ui/loading-overlay";
import { ResultScreen } from "./result-screen";
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

export const PhaserGame = ({ isPlaying, onReady, onGoToReady, onRestart }: PhaserGameProps) => {
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

      // 게임 텍스트를 레지스트리에 주입
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
        // AudioContext 에러 방지: 사운드 시스템 먼저 정리
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const soundManager = gameRef.current.sound as any;
          if (soundManager) {
            soundManager.removeAll?.();
            soundManager.stopAll?.();
            // 필요한 경우 컨텍스트 닫기 (일부 버전에서 필요할 수 있음)
            // soundManager.context?.close?.();
          }
        } catch (e) {
          console.warn("Error cleaning up audio:", e);
        }

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
      {gameResult && (
        <ResultScreen score={gameResult.score} gameName="sky-drop" onRestart={onRestart} />
      )}
      <div ref={containerRef} id="phaser-container" className="size-full" />
    </div>
  );
};
