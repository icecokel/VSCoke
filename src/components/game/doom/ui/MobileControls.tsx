"use client";

import { InputState } from "../types/doom-types";

interface MobileControlsProps {
  onInput: (key: keyof InputState, value: boolean) => void;
}

/**
 * 모바일 가상 컨트롤 패드 (귀여운 버전)
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
    "w-14 h-14 rounded-full flex items-center justify-center text-2xl select-none touch-none transition-all active:scale-95 shadow-lg";

  const dpadButtonStyle = {
    background: "linear-gradient(180deg, #FFB6C1 0%, #FF69B4 100%)",
    border: "3px solid #FF1493",
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end pointer-events-none">
      {/* 좌측: 방향 D-패드 */}
      <div className="pointer-events-auto">
        <div className="grid grid-cols-3 gap-1">
          {/* 첫째 행 */}
          <div /> {/* 빈 칸 */}
          <button
            className={buttonClass}
            style={dpadButtonStyle}
            onTouchStart={handleTouchStart("forward")}
            onTouchEnd={handleTouchEnd("forward")}
          >
            🔼
          </button>
          <div /> {/* 빈 칸 */}
          {/* 둘째 행 */}
          <button
            className={buttonClass}
            style={dpadButtonStyle}
            onTouchStart={handleTouchStart("turnLeft")}
            onTouchEnd={handleTouchEnd("turnLeft")}
          >
            ◀️
          </button>
          <div /> {/* 빈 칸 */}
          <button
            className={buttonClass}
            style={dpadButtonStyle}
            onTouchStart={handleTouchStart("turnRight")}
            onTouchEnd={handleTouchEnd("turnRight")}
          >
            ▶️
          </button>
          {/* 셋째 행 */}
          <div /> {/* 빈 칸 */}
          <button
            className={buttonClass}
            style={dpadButtonStyle}
            onTouchStart={handleTouchStart("backward")}
            onTouchEnd={handleTouchEnd("backward")}
          >
            🔽
          </button>
          <div /> {/* 빈 칸 */}
        </div>
      </div>

      {/* 우측: 액션 버튼 */}
      <div className="pointer-events-auto flex gap-3">
        <button
          className={`${buttonClass} w-16 h-16 text-sm font-bold`}
          style={{
            background: "linear-gradient(180deg, #98FB98 0%, #32CD32 100%)",
            border: "3px solid #228B22",
          }}
          onTouchStart={handleTouchStart("use")}
          onTouchEnd={handleTouchEnd("use")}
        >
          🌸
        </button>
        <button
          className={`${buttonClass} w-20 h-20`}
          style={{
            background: "linear-gradient(180deg, #FFD700 0%, #FFA500 100%)",
            border: "3px solid #FF8C00",
            boxShadow: "0 4px 0 #CC7000, 0 6px 15px rgba(255,165,0,0.4)",
          }}
          onTouchStart={handleTouchStart("fire")}
          onTouchEnd={handleTouchEnd("fire")}
        >
          ⭐
        </button>
      </div>
    </div>
  );
};
