"use client";

import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useTranslations } from "next-intl";

interface FishDriftReadyScreenProps {
  onStart: () => void;
  isStartEnabled: boolean;
  isMobile: boolean;
}

export const FishDriftReadyScreen = ({
  onStart,
  isStartEnabled,
  isMobile,
}: FishDriftReadyScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-sky-950/95 text-white ${isMobile ? "p-3" : "p-6"}`}
    >
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-4xl font-extrabold tracking-wide text-cyan-200">Fish Drift</h1>
        <p className="text-sm text-cyan-50/80">
          {isStartEnabled
            ? "Tap or press Space to weave through the current"
            : "바다를 불러오는 중..."}
        </p>
      </div>

      <div className="mb-10 flex h-44 w-full max-w-xs items-center justify-center rounded-xl border border-cyan-200/30 bg-cyan-950/55">
        <p className="text-center text-sm text-cyan-50/90">
          물고기는 하단에서 상단 방향으로 헤엄칩니다
          <br />
          터치 또는 스페이스바 입력마다 좌/우 유영 방향 전환
          <br />
          색상별 물고기 무리를 먹으면 점수가 크게 증가
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <Button
          onClick={onStart}
          disabled={!isStartEnabled}
          size="lg"
          className="rounded-full bg-emerald-300 px-12 py-6 text-xl font-bold text-slate-900 hover:bg-emerald-200 disabled:bg-slate-600 disabled:text-slate-300"
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
