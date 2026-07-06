export type ShortcutGuideContext = "world" | "battle";

export interface ShortcutGuideRow {
  action: string;
  keys: string;
}

const SHORTCUT_GUIDE_TITLES: Record<ShortcutGuideContext, string> = {
  world: "필드 단축키",
  battle: "전투 단축키",
};

const SHORTCUT_GUIDE_ROWS: Record<ShortcutGuideContext, ShortcutGuideRow[]> = {
  world: [
    { action: "이동", keys: "WASD / 방향키" },
    { action: "확인 / 대화", keys: "Enter / Space / Z" },
    { action: "가방", keys: "I 키" },
    { action: "도움말", keys: "H" },
    { action: "닫기", keys: "Esc / Backspace" },
  ],
  battle: [
    { action: "선택", keys: "방향키" },
    { action: "결정", keys: "Enter / Space / Z" },
    { action: "뒤로", keys: "Esc / Backspace" },
    { action: "도움말", keys: "H" },
  ],
};

export function createShortcutGuideTitle(context: ShortcutGuideContext): string {
  return SHORTCUT_GUIDE_TITLES[context];
}

export function createShortcutGuideRows(context: ShortcutGuideContext): ShortcutGuideRow[] {
  return SHORTCUT_GUIDE_ROWS[context].map(row => ({ ...row }));
}
