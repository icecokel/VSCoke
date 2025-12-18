"use client";

import dynamic from "next/dynamic";
import { GameConstants } from "@/components/game/GameConstants";

const PhaserGame = dynamic(() => import("@/components/game/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-gray-900 text-white">
      <p className="animate-pulse text-xl">Loading Sky Drop...</p>
    </div>
  ),
});

export default function GamePage() {
  // 9:16 비율에서 max-height 계산 (MAX_WIDTH * 16/9)
  const maxHeight = Math.round(GameConstants.MAX_WIDTH / GameConstants.ASPECT_RATIO);

  return (
    <main className="flex h-screen w-full flex-col items-center xs:p-0 justify-center bg-slate-900 p-4">
      <div
        className="relative w-full overflow-hidden rounded-xl xs:border-0 border-4 border-slate-700 bg-black shadow-2xl"
        style={{
          maxWidth: `${GameConstants.MAX_WIDTH}px`,
          maxHeight: `min(${maxHeight}px, calc(100vh - 2rem))`,
          aspectRatio: GameConstants.ASPECT_RATIO_CSS,
        }}
      >
        <PhaserGame />
      </div>
    </main>
  );
}
