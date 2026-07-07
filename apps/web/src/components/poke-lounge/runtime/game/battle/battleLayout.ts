export interface BattleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BattleSpriteBox extends BattleRect {
  originX: number;
  originY: number;
}

export const BATTLE_LAYOUT = {
  opponentHpPanel: { x: 8, y: 14, width: 104, height: 28 },
  playerHpPanel: { x: 142, y: 96, width: 106, height: 34 },
  opponentSprite: { x: 164, y: 43, width: 72, height: 72, originX: 0.5, originY: 0.5 },
  playerSprite: { x: 64, y: 104, width: 80, height: 80, originX: 0.5, originY: 0.5 },
  bottomWindow: { x: 0, y: 144, width: 256, height: 48 },
  commandWindow: { x: 0, y: 144, width: 256, height: 48 },
  moveWindow: { x: 0, y: 144, width: 256, height: 48 },
} as const;

export const BATTLE_OPTION_GRID = {
  columns: 2,
  rows: 2,
  padding: 6,
  gap: 4,
} as const;

export function rectRight(rect: BattleRect): number {
  return rect.x + rect.width;
}

export function rectBottom(rect: BattleRect): number {
  return rect.y + rect.height;
}

export function hpRatio(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, currentHp / maxHp));
}

export function resolveBattleOptionSlotRects(rect: BattleRect): BattleRect[] {
  const slotWidth =
    (rect.width - BATTLE_OPTION_GRID.padding * 2 - BATTLE_OPTION_GRID.gap) /
    BATTLE_OPTION_GRID.columns;
  const slotHeight =
    (rect.height - BATTLE_OPTION_GRID.padding * 2 - BATTLE_OPTION_GRID.gap) /
    BATTLE_OPTION_GRID.rows;

  return Array.from(
    { length: BATTLE_OPTION_GRID.columns * BATTLE_OPTION_GRID.rows },
    (_, index) => {
      const column = index % BATTLE_OPTION_GRID.columns;
      const row = Math.floor(index / BATTLE_OPTION_GRID.columns);

      return {
        x: rect.x + BATTLE_OPTION_GRID.padding + column * (slotWidth + BATTLE_OPTION_GRID.gap),
        y: rect.y + BATTLE_OPTION_GRID.padding + row * (slotHeight + BATTLE_OPTION_GRID.gap),
        width: slotWidth,
        height: slotHeight,
      };
    },
  );
}

export function getBattleOptionIndexAtPoint(
  point: Pick<BattleRect, "x" | "y">,
  rect: BattleRect,
): number | null {
  const index = resolveBattleOptionSlotRects(rect).findIndex(
    slot =>
      point.x >= slot.x &&
      point.x <= slot.x + slot.width &&
      point.y >= slot.y &&
      point.y <= slot.y + slot.height,
  );

  return index >= 0 ? index : null;
}
