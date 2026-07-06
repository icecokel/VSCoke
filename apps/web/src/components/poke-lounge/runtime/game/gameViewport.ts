export const GAME_VIEWPORT_SIZE = { width: 768, height: 576 } as const;

export const GAME_VIEWPORT_STYLE = {
  aspectRatio: "4 / 3",
  maxDisplayWidthPx: 1024,
} as const;

export const BATTLE_BASE_SIZE = { width: 256, height: 192 } as const;

export interface GameViewportDisplaySize {
  width: number;
  height: number;
}

export function resolveGameCanvasSize(
  displaySize?: Partial<GameViewportDisplaySize>,
): GameViewportDisplaySize {
  const displayWidth =
    typeof displaySize?.width === "number" && Number.isFinite(displaySize.width)
      ? displaySize.width
      : GAME_VIEWPORT_SIZE.width;
  const clampedWidth = Math.max(320, Math.min(GAME_VIEWPORT_SIZE.width, Math.round(displayWidth)));

  return {
    width: clampedWidth,
    height: Math.round(clampedWidth * (GAME_VIEWPORT_SIZE.height / GAME_VIEWPORT_SIZE.width)),
  };
}

export function getBattleCameraZoom(viewportWidth: number = GAME_VIEWPORT_SIZE.width): number {
  return viewportWidth / BATTLE_BASE_SIZE.width;
}

export const BATTLE_CAMERA_ZOOM = getBattleCameraZoom(GAME_VIEWPORT_SIZE.width);
