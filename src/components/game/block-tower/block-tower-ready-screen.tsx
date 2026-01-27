"use client";

import { useCustomRouter } from "@/hooks/use-custom-router";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BlockTowerConstants } from "./block-tower-constants";

interface BlockTowerReadyScreenProps {
  onStart: () => void;
  isMobile: boolean;
}

export const BlockTowerReadyScreen = ({ onStart, isMobile }: BlockTowerReadyScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();

  const onClickBack = () => {
    router.back();
  };

  // 도형 미리보기용 블록 정보
  const previewBlocks = [
    BlockTowerConstants.BLOCKS.largeSquare,
    BlockTowerConstants.BLOCKS.mediumSquare,
    BlockTowerConstants.BLOCKS.smallRect,
  ];

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-slate-900 text-white ${isMobile ? "p-2" : "p-4"}`}
    >
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-amber-400 mb-2">Block Tower</h1>
        <p className="text-gray-400 text-sm">{t("tapToDrop")}</p>
      </div>

      {/* 탑 쌓기 미리보기 */}
      <div
        className="w-full max-w-xs aspect-[9/16] bg-slate-800 rounded-lg border-2 border-slate-700 mb-8 flex flex-col items-center justify-end overflow-hidden relative"
        style={{ maxHeight: "40vh" }}
      >
        {/* 쌓인 블록 시뮬레이션 */}
        <div className="absolute bottom-8 flex flex-col items-center gap-1">
          {previewBlocks.map((block, index) => (
            <div
              key={block.type}
              className="rounded-sm animate-pulse"
              style={{
                width: block.width * 0.6,
                height: block.height * 0.6,
                backgroundColor: `#${block.color.toString(16).padStart(6, "0")}`,
                animationDelay: `${index * 200}ms`,
              }}
            />
          ))}
        </div>

        {/* 바닥 */}
        <div className="w-3/4 h-2 bg-slate-600 rounded-t-sm mb-4" />
      </div>

      <div className="flex flex-col gap-4 w-full items-center">
        <Button
          onClick={onStart}
          size="lg"
          aria-label="Start Game"
          style={{ backgroundColor: "#FACC15", color: "#000000" }}
          className="text-2xl px-16 py-8 font-extrabold rounded-full transition-all hover:scale-110 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
        >
          {t("start")}
        </Button>

        <Button
          onClick={onClickBack}
          variant="ghost"
          aria-label="Exit Game"
          className="text-gray-400 hover:text-white transition-colors"
        >
          {t("exit")}
        </Button>
      </div>
    </div>
  );
};
