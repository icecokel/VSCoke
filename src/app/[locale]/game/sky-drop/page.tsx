"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/components/game/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-gray-900 text-white">
      <p className="animate-pulse text-xl">Loading Action Puzzle...</p>
    </div>
  ),
});

import { GameConstants } from "@/components/game/GameConstants";

export default function GamePage() {
  return (
    <main className="flex h-screen w-full flex-col items-center justify-center bg-slate-900 p-4">
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold text-white">Sky Drop</h1>
        <p className="text-gray-400">Match 3 blocks vertically!</p>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-xl border-4 border-slate-700 bg-black shadow-2xl"
        style={{ maxWidth: `${GameConstants.MAX_WIDTH}px` }}
      >
        <PhaserGame />
      </div>
    </main>
  );
}
