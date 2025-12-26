"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useGameShare } from "@/hooks/use-game-share";
import { Share2, RotateCcw, ArrowLeft } from "lucide-react";

interface ResultScreenProps {
  score: number;
  gameName: string;
  onRestart: () => void;
}

export const ResultScreen = ({ score, gameName, onRestart }: ResultScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();
  const { share } = useGameShare();
  const [isSharing, setIsSharing] = useState(false);

  // 공유하기 (Web Share API)
  const handleShare = useCallback(async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      await share({ score, gameName });
    } finally {
      setIsSharing(false);
    }
  }, [score, gameName, share, isSharing]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center animate-in fade-in duration-300">
      {/* 상단 좌측 뒤로가기 버튼 */}
      <Button
        onClick={() => router.push("/game")}
        variant="ghost"
        aria-label="Go to Dashboard"
        className="absolute top-4 left-4 text-white hover:bg-white/10 rounded-full w-auto h-12 px-4"
      >
        <div className="flex items-center gap-2">
          <ArrowLeft className="h-6 w-6" />
          {t("goToDashboard")}
        </div>
      </Button>

      <h2 className="text-5xl font-bold text-coral-400 mb-8 drop-shadow-[0_0_10px_rgba(255,107,107,0.5)]">
        GAME OVER
      </h2>

      <div className="mb-8">
        <p className="text-gray-400 text-lg mb-2">{t("finalScore")}</p>
        <p className="text-6xl font-black text-white tracking-widest">{score}</p>
      </div>

      {score > 0 && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {/* 공유하기 버튼 */}
          <Button
            onClick={handleShare}
            disabled={isSharing}
            size="lg"
            aria-label="Share Result"
            className="w-full text-lg py-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            <Share2 className="mr-2 h-5 w-5" />
            {isSharing ? "공유 중..." : t("share")}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs mt-3">
        {/* 다시하기 버튼 */}
        <Button
          onClick={onRestart}
          size="lg"
          aria-label="Restart Game"
          className="w-full text-lg py-6 bg-teal-400 hover:bg-teal-500 text-black font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          {t("restart")}
        </Button>
      </div>
    </div>
  );
};
