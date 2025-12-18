"use client";

// 테스트: sky-drop 게임 내용을 game 메인 라우트에 배치
import { GameConstants } from "@/components/game/GameConstants";

export default function GameDashboard() {
  return (
    <main className="flex h-screen w-full flex-col items-center xs:p-0 justify-center bg-slate-900 p-4">
      <div
        className="relative w-full overflow-hidden rounded-xl xs:border-0 border-4 border-slate-700 bg-black shadow-2xl"
        style={{
          maxWidth: `${GameConstants.MAX_WIDTH}px`,
          aspectRatio: GameConstants.ASPECT_RATIO_CSS,
        }}
      >
        {/* Phaser 없이 테스트 */}
        <div className="flex size-full items-center justify-center text-white">
          <p>Game Test (No Phaser)</p>
        </div>
      </div>
    </main>
  );
}
