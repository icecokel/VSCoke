"use client";

import React, { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { GameConfig } from "./GameConfig";

export default function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !gameRef.current) {
      gameRef.current = new Phaser.Game(GameConfig);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;

      // Available space in the parent or window
      // Since this is in a flex column (page setup), let's look at window for simplified Constraint logic
      // or parent.
      const windowW = window.innerWidth;
      const windowH = window.innerHeight;

      // Constraints
      const MIN_W = 320;
      const MAX_W = 480;
      const RATIO = 9 / 16;

      // Start with Max Width
      let targetW = Math.min(windowW - 32, MAX_W); // 32px padding margin
      targetW = Math.max(targetW, MIN_W);

      // Calculate Height
      let targetH = targetW / RATIO;

      // Check Height Constraint (fit in screen - padding)
      if (targetH > windowH - 40) {
        targetH = windowH - 40;
        targetW = targetH * RATIO;
      }

      // Re-Check Min Width after height adjustment
      if (targetW < MIN_W) {
        targetW = MIN_W;
        targetH = targetW / RATIO;
      }

      // Apply to container
      containerRef.current.style.width = `${targetW}px`;
      containerRef.current.style.height = `${targetH}px`;

      // Direct Event Tunnel (User Request)
      // Although REISZE mode handles it, user asked to "send size via event tunnel".
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
        style={{ width: "320px", height: "568px" }} // Default fallback
      />
    </div>
  );
}
