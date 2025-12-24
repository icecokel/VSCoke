"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";

interface ResultScreenProps {
  score: number;
  onRestart: () => void;
}

export const ResultScreen = ({ score, onRestart }: ResultScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center animate-in fade-in duration-300">
      <h2 className="text-5xl font-bold text-[#FF6B6B] mb-8 drop-shadow-[0_0_10px_rgba(255,107,107,0.5)]">
        GAME OVER
      </h2>

      <div className="mb-12">
        <p className="text-gray-400 text-lg mb-2">{t("finalScore")}</p>
        <p className="text-6xl font-black text-white tracking-widest">{score}</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button
          onClick={onRestart}
          size="lg"
          aria-label="Restart Game"
          className="w-full text-xl py-8 bg-[#4ECDC4] hover:bg-[#3fb9b0] text-black font-bold rounded-xl shadow-lg hover:checkbox-[0_0_15px_rgba(78,205,196,0.5)] transition-all transform hover:scale-105"
        >
          {t("restart")}
        </Button>

        <Button
          onClick={() => router.push("/game")}
          variant="outline"
          size="lg"
          aria-label="Go to Dashboard"
          className="w-full text-lg py-6 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all"
        >
          Dashboard
        </Button>
      </div>
    </div>
  );
};
