import type { CSSProperties } from "react";

type GameFrameStyle = CSSProperties & {
  "--game-frame-height": string;
  "--game-frame-width": string;
};

interface CreateDesktopGameFrameStyleOptions {
  maxWidth: number;
  aspectRatioCss: string;
  verticalGap?: number;
}

export const createDesktopGameFrameStyle = ({
  maxWidth,
  aspectRatioCss,
  verticalGap = 8,
}: CreateDesktopGameFrameStyleOptions): GameFrameStyle => {
  const [widthRatio, heightRatio] = aspectRatioCss.split("/").map(Number);
  const maxHeight = Math.round((maxWidth * heightRatio) / widthRatio);

  return {
    "--game-frame-height": `min(calc(100% - ${verticalGap}px), ${maxHeight}px)`,
    "--game-frame-width": `min(100%, ${maxWidth}px, calc(var(--game-frame-height) * ${widthRatio} / ${heightRatio}))`,
    width: "var(--game-frame-width)",
    height: "var(--game-frame-height)",
    aspectRatio: aspectRatioCss,
  };
};
