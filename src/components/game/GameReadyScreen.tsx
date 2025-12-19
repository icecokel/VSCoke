"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GameConstants } from "./GameConstants";

interface GameReadyScreenProps {
  onStart: () => void;
  isMobile: boolean;
}

const GameReadyScreen = ({ onStart, isMobile }: GameReadyScreenProps) => {
  const t = useTranslations("Game");
  const router = useRouter();

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gray-900 text-white ${isMobile ? "p-2" : "p-4"}`}
    >
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-[#4ECDC4] mb-2">Sky Drop</h1>
        <p className="text-gray-400 text-sm">{t("start")}</p>
      </div>

      <div
        className="w-full max-w-xs aspect-[9/16] bg-slate-800 rounded-lg border-2 border-slate-700 mb-8 flex items-center justify-center overflow-hidden relative"
        style={{ maxHeight: "40vh" }}
      >
        {/* 간단한 게임 썸네일이나 장식용 그래픽 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 gap-2">
          {[0, 1, 2].map(row => (
            <div key={row} className="flex gap-2">
              {[0, 1, 2].map(col => (
                <div
                  key={`${row}-${col}`}
                  className="w-8 h-4 rounded-sm"
                  style={{
                    backgroundColor: `#${GameConstants.BLOCK_PALETTE[(row * 3 + col) % 5].toString(16).padStart(6, "0")}`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <span className="text-3xl animate-bounce">👇</span>
      </div>

      <div className="flex flex-col gap-4 w-full items-center">
        <Button
          onClick={onStart}
          size="lg"
          className="text-xl px-12 py-6 bg-[#4ECDC4] hover:bg-[#3fb9b0] text-black font-bold rounded-full transition-all hover:scale-105"
        >
          {t("start")}
        </Button>

        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="text-gray-400 hover:text-white transition-colors"
        >
          {t("exit")}
        </Button>
      </div>
    </div>
  );
};

export default GameReadyScreen;
