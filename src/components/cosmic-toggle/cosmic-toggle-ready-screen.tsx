"use client";

import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useTranslations } from "next-intl";

interface CosmicToggleReadyScreenProps {
  onStart: () => void;
  isStartEnabled: boolean;
  isMobile: boolean;
}

export const CosmicToggleReadyScreen = ({
  onStart,
  isStartEnabled,
  isMobile,
}: CosmicToggleReadyScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-slate-900/95 text-white ${isMobile ? "p-3" : "p-6"}`}
    >
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-4xl font-extrabold tracking-wide text-cyan-300">Cosmic Toggle</h1>
        <p className="text-sm text-slate-300">
          {isStartEnabled ? "Tap to flip your angle" : "게임 로딩 중..."}
        </p>
      </div>

      <div className="mb-10 flex h-44 w-full max-w-xs items-center justify-center rounded-xl border border-cyan-300/30 bg-slate-800/70">
        <p className="text-center text-sm text-slate-200">
          시작 각도는 45도 상향
          <br />
          터치할 때마다 상/하 토글
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <Button
          onClick={onStart}
          disabled={!isStartEnabled}
          size="lg"
          className="rounded-full bg-cyan-300 px-12 py-6 text-xl font-bold text-slate-900 hover:bg-cyan-200 disabled:bg-slate-600 disabled:text-slate-300"
        >
          {t("start")}
        </Button>

        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="text-slate-300 hover:text-white"
        >
          {t("exit")}
        </Button>
      </div>
    </div>
  );
};
