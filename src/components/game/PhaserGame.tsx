"use client";

import React, { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { GameConfig } from "./GameConfig";
import { GameConstants } from "./GameConstants";
import { useTranslations } from "next-intl";

export default function PhaserGame() {
  const t = useTranslations("Game");
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !gameRef.current) {
      gameRef.current = new Phaser.Game(GameConfig);

      // Inject localized texts into the registry
      gameRef.current.registry.set("texts", {
        score: t("score"),
        deadline: t("deadline"),
        start: t("start"),
        gameOver: t("gameOver"),
        finalScore: t("finalScore"),
        restart: t("restart"),
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [t]);

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
    updateSize(); // Initial

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div className="flex size-full items-center justify-center p-4">
      <div
        ref={containerRef}
        id="phaser-container"
        className="overflow-hidden rounded-lg shadow-xl"
        style={{
          width: "100%",
          maxWidth: `${GameConstants.MAX_WIDTH}px`,
          aspectRatio: GameConstants.ASPECT_RATIO_CSS,
        }}
      />
    </div>
  );
}
