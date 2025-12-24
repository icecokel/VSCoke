"use client";

import { useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useGameShare } from "@/hooks/use-game-share";
import { ShareResultCard } from "./ShareResultCard";
import { Share2, Download, RotateCcw, LayoutDashboard } from "lucide-react";

interface ResultScreenProps {
  score: number;
  onRestart: () => void;
}

export const ResultScreen = ({ score, onRestart }: ResultScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();
  const { share } = useGameShare();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // 이미지 저장 (html-to-image 사용)
  const handleSaveImage = useCallback(async () => {
    if (!cardRef.current || isSaving) return;

    setIsSaving(true);
    try {
      // 100ms 지연 (렌더링 안정화)
      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // 고해상도
        // 스타일 태그 필터링 (선택적)
        filter: node => {
          // oklch 에러 유발 가능성 있는 style 태그 제외 시도
          // 하지만 html-to-image는 내부적으로 처리 방식이 다름
          return true;
        },
      });

      const link = document.createElement("a");
      link.download = `sky-drop-${score}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("이미지 저장 실패:", error);
    } finally {
      setIsSaving(false);
    }
  }, [score, isSaving]);

  // 공유하기 (Web Share API)
  const handleShare = useCallback(async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      await share({ score });
    } finally {
      setIsSharing(false);
    }
  }, [score, share, isSharing]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center animate-in fade-in duration-300">
      <h2 className="text-5xl font-bold text-[#FF6B6B] mb-8 drop-shadow-[0_0_10px_rgba(255,107,107,0.5)]">
        GAME OVER
      </h2>

      <div className="mb-8">
        <p className="text-gray-400 text-lg mb-2">{t("finalScore")}</p>
        <p className="text-6xl font-black text-white tracking-widest">{score}</p>
      </div>

      {/* 캡처용 카드 (화면 밖 렌더링) */}
      <div style={{ position: "fixed", left: "-9999px", top: "-9999px" }}>
        <ShareResultCard ref={cardRef} score={score} />
      </div>

      {score > 0 && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {/* 이미지 저장 버튼 */}
          <Button
            onClick={handleSaveImage}
            disabled={isSaving}
            size="lg"
            aria-label="Save Image"
            className="w-full text-lg py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            <Download className="mr-2 h-5 w-5" />
            {isSaving ? "저장 중..." : t("saveImage")}
          </Button>

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

      {/* 버튼들을 감싸는 div를 추가했으므로 아래 버튼들도 별도 div로 감싸거나 구조 조정 필요 */}
      <div className="flex flex-col gap-3 w-full max-w-xs mt-3">
        {/* 다시하기 버튼 */}
        <Button
          onClick={onRestart}
          size="lg"
          aria-label="Restart Game"
          className="w-full text-lg py-6 bg-[#4ECDC4] hover:bg-[#3fb9b0] text-black font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          {t("restart")}
        </Button>

        {/* Dashboard 버튼 */}
        <Button
          onClick={() => router.push("/game")}
          variant="outline"
          size="lg"
          aria-label="Go to Dashboard"
          className="w-full text-base py-5 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-all"
        >
          <LayoutDashboard className="mr-2 h-5 w-5" />
          Dashboard
        </Button>
      </div>
    </div>
  );
};
