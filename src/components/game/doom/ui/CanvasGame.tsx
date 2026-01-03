"use client";

import { memo, useRef, useEffect } from "react";
import { RayHit, Player, Enemy } from "../types/doom-types";
import { CANVAS_WIDTH, CANVAS_HEIGHT, renderFrame } from "../engine/canvas-renderer";

interface CanvasGameProps {
  rays: RayHit[];
  player: Player;
  enemies: Enemy[];
  map: number[][];
  screenWidth: number;
  isFiring: boolean;
}

/**
 * Canvas 기반 게임 렌더러 컴포넌트
 */
export const CanvasGame = memo(
  ({ rays, player, enemies, map, screenWidth, isFiring }: CanvasGameProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 렌더링
      renderFrame(ctx, rays, player, enemies, map, screenWidth, isFiring);
    }, [rays, player, enemies, map, screenWidth, isFiring]);

    return (
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full object-contain"
        style={{
          imageRendering: "pixelated",
        }}
      />
    );
  },
);

CanvasGame.displayName = "CanvasGame";
