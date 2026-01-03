"use client";

import { useState } from "react";
import { useCustomRouter } from "@/hooks/use-custom-router";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DoomReadyScreenProps {
  onStart: () => void;
  isMobile: boolean;
}

/**
 * 슬라임 어드벤처 게임 시작 화면 (귀여운 버전)
 */
export const DoomReadyScreen = ({ onStart, isMobile }: DoomReadyScreenProps) => {
  const t = useTranslations("Game");
  const router = useCustomRouter();
  const [showGuide, setShowGuide] = useState(false);

  const onClickBack = () => {
    router.back();
  };

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-between p-6"
      style={{
        background: "linear-gradient(180deg, #87CEEB 0%, #E0F7FA 50%, #90EE90 100%)",
      }}
    >
      {/* 상단: 로고 */}
      <div className="text-center">
        {/* 귀여운 슬라임 아이콘 */}
        <div className="text-6xl mb-2">🌸</div>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider"
          style={{
            color: "#FF69B4",
            textShadow: "2px 2px 0px #FFB6C1, 4px 4px 0px rgba(255,105,180,0.3)",
          }}
        >
          슬라임 어드벤처
        </h1>
        <p className="text-pink-400 text-sm mt-2 font-medium">✨ Slime Adventure ✨</p>
      </div>

      {/* 중앙: 가이드 + 슬라임 캐릭터 */}
      <div className="flex flex-col items-center gap-4">
        {/* 슬라임 캐릭터 미리보기 */}
        <div className="flex gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: "linear-gradient(180deg, #AFFFAF 0%, #98FB98 100%)" }}
          >
            😊
          </div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: "linear-gradient(180deg, #B0E0E6 0%, #87CEEB 100%)" }}
          >
            😮
          </div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: "linear-gradient(180deg, #FFB6C1 0%, #FF6B9D 100%)" }}
          >
            😤
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1 text-pink-500 hover:text-pink-400 text-sm font-medium"
        >
          🎮 게임 가이드
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showGuide ? (
          <div className="bg-white/80 border-2 border-pink-200 rounded-xl p-4 text-sm max-w-xs shadow-lg">
            <p className="text-pink-500 mb-2 font-bold">🕹️ 조작법</p>
            <p className="text-gray-600">
              {isMobile ? "D-패드로 이동 + ⭐버튼으로 마법!" : "WASD 이동 | Space 마법 발사"}
            </p>
            <p className="text-pink-400 mt-2 text-xs">💖 슬라임들을 만나 모험을 떠나요!</p>
          </div>
        ) : (
          <p className="text-pink-600 text-sm bg-white/60 px-4 py-2 rounded-full">
            {isMobile ? "화면 하단 버튼으로 조작 🎯" : "WASD: 이동 | Space: 마법 ⭐"}
          </p>
        )}
      </div>

      {/* 하단: 버튼들 */}
      <div className="flex flex-col gap-3 items-center">
        {/* 시작 버튼 */}
        <button
          onClick={onStart}
          className="relative px-12 py-4 text-xl font-bold text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
          style={{
            background: "linear-gradient(180deg, #FF69B4 0%, #FF1493 100%)",
            boxShadow: "0 4px 0 #C71585, 0 6px 20px rgba(255,105,180,0.4)",
          }}
        >
          <span className="flex items-center gap-2">🌟 {t("start")} 🌟</span>
        </button>

        {/* 나가기 버튼 */}
        <button
          onClick={onClickBack}
          className="text-pink-400 hover:text-pink-600 text-sm font-medium"
        >
          ← {t("exit")}
        </button>
      </div>
    </div>
  );
};
