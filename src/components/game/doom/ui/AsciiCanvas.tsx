"use client";

import { memo } from "react";

interface AsciiCanvasProps {
  lines: string[];
}

/**
 * ASCII 렌더링 캔버스 컴포넌트
 * 메모이제이션으로 불필요한 리렌더링 방지
 */
export const AsciiCanvas = memo(({ lines }: AsciiCanvasProps) => {
  return (
    <pre
      className="font-mono text-[6px] sm:text-[8px] md:text-[10px] lg:text-xs leading-none text-green-400 bg-black select-none overflow-hidden whitespace-pre"
      style={{
        fontFamily: '"Courier New", Courier, monospace',
        letterSpacing: "0.05em",
      }}
    >
      {lines.join("\n")}
    </pre>
  );
});

AsciiCanvas.displayName = "AsciiCanvas";
