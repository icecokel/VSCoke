"use client";

import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { useTranslations } from "next-intl";

interface ArrowDriftResultScreenProps {
  score: number;
  onRestart: () => void;
}

export const ArrowDriftResultScreen = ({ score, onRestart }: ArrowDriftResultScreenProps) => {
  const router = useCustomRouter();
  const tShare = useTranslations("Share");

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-6 text-white backdrop-blur-sm">
      <h2 className="mb-4 text-5xl font-extrabold tracking-wide text-rose-300">GAME OVER</h2>
      <p className="mb-10 text-4xl font-black text-cyan-300">{score}</p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <ShareLinkButton
          text={tShare("arrowDriftText", { score })}
          variant="default"
          size="lg"
          className="rounded-full py-6 text-lg font-bold"
          label={tShare("share")}
        />

        <Button
          onClick={onRestart}
          className="rounded-full bg-cyan-300 py-6 text-lg font-bold text-slate-900 hover:bg-cyan-200"
        >
          다시 시작
        </Button>

        <Button
          onClick={() => router.push("/game")}
          variant="ghost"
          className="text-slate-300 hover:text-white"
        >
          게임 목록으로
        </Button>
      </div>
    </div>
  );
};
