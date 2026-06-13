"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { FishDriftGameConfig } from "./fish-drift-game-config";
import { LoadingOverlay } from "@/components/game/ui/loading-overlay";

interface GameOverPayload {
  score: number;
}

interface FishDriftPhaserGameProps {
  isPlaying: boolean;
  onReady: () => void;
  onGameOver: (score: number) => void;
  restartToken?: number;
  showLoadingOverlay?: boolean;
}

export const FishDriftPhaserGame = ({
  isPlaying,
  onReady,
  onGameOver,
  restartToken = 0,
  showLoadingOverlay = false,
}: FishDriftPhaserGameProps) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const restartTokenRef = useRef(restartToken);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || gameRef.current) return;

    const game = new Phaser.Game(FishDriftGameConfig);
    gameRef.current = game;

    game.events.on("game:ready", () => {
      setIsLoaded(true);
      onReady();
    });

    game.events.on("game:progress", (value: number) => {
      setProgress(value * 100);
    });

    game.events.on("game:over", (payload: GameOverPayload) => {
      onGameOver(payload.score);
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
      setIsLoaded(false);
      setProgress(0);
    };
  }, [onReady, onGameOver]);

  useEffect(() => {
    if (!isLoaded || !isPlaying || !gameRef.current) return;
    gameRef.current.events.emit("game:start");
  }, [isLoaded, isPlaying]);

  useEffect(() => {
    if (restartToken === restartTokenRef.current) return;
    restartTokenRef.current = restartToken;
    if (!isLoaded || !gameRef.current) return;

    const scene = gameRef.current.scene;
    if (scene.isActive("GameOverScene")) {
      scene.stop("GameOverScene");
    }
    if (scene.isActive("MainScene")) {
      scene.stop("MainScene");
    }
    scene.start("MainScene");
  }, [restartToken, isLoaded]);

  useEffect(() => {
    const updateSize = () => {
      if (!gameRef.current || !containerRef.current) return;
      gameRef.current.events.emit("external-resize", {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
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
      {!isLoaded && showLoadingOverlay && <LoadingOverlay progress={progress} />}
      <div ref={containerRef} id="fish-drift-phaser-container" className="size-full" />
    </div>
  );
};
