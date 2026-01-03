"use client";

import { InputState } from "../types/doom-types";

interface MobileControlsProps {
  onInput: (key: keyof InputState, value: boolean) => void;
}

/**
 * 모바일 가상 컨트롤 패드
 * D-패드 + USE/FIRE 버튼
 */
export const MobileControls = ({ onInput }: MobileControlsProps) => {
  const handleTouchStart = (key: keyof InputState) => (e: React.TouchEvent) => {
    e.preventDefault();
    onInput(key, true);
  };

  const handleTouchEnd = (key: keyof InputState) => (e: React.TouchEvent) => {
    e.preventDefault();
    onInput(key, false);
  };

  const buttonClass =
    "w-14 h-14 rounded-full bg-white/20 active:bg-white/40 flex items-center justify-center text-white text-2xl select-none touch-none transition-colors";

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end pointer-events-none">
      {/* 좌측: 방향 D-패드 */}
      <div className="pointer-events-auto">
        <div className="grid grid-cols-3 gap-1">
          {/* 첫째 행 */}
          <div /> {/* 빈 칸 */}
          <button
            className={buttonClass}
            onTouchStart={handleTouchStart("forward")}
            onTouchEnd={handleTouchEnd("forward")}
          >
            ↑
          </button>
          <div /> {/* 빈 칸 */}
          {/* 둘째 행 */}
          <button
            className={buttonClass}
            onTouchStart={handleTouchStart("turnLeft")}
            onTouchEnd={handleTouchEnd("turnLeft")}
          >
            ←
          </button>
          <div /> {/* 빈 칸 */}
          <button
            className={buttonClass}
            onTouchStart={handleTouchStart("turnRight")}
            onTouchEnd={handleTouchEnd("turnRight")}
          >
            →
          </button>
          {/* 셋째 행 */}
          <div /> {/* 빈 칸 */}
          <button
            className={buttonClass}
            onTouchStart={handleTouchStart("backward")}
            onTouchEnd={handleTouchEnd("backward")}
          >
            ↓
          </button>
          <div /> {/* 빈 칸 */}
        </div>
      </div>

      {/* 우측: 액션 버튼 */}
      <div className="pointer-events-auto flex gap-3">
        <button
          className={`${buttonClass} w-16 h-16 bg-green-500/40 active:bg-green-500/60 text-sm font-bold`}
          onTouchStart={handleTouchStart("use")}
          onTouchEnd={handleTouchEnd("use")}
        >
          USE
        </button>
        <button
          className={`${buttonClass} w-20 h-20 bg-red-500/40 active:bg-red-500/60`}
          onTouchStart={handleTouchStart("fire")}
          onTouchEnd={handleTouchEnd("fire")}
        >
          🔫
        </button>
      </div>
    </div>
  );
};
