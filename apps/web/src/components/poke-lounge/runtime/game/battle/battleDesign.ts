import type { BattleAssetManifestEntry } from "./battleTypes";

export const BATTLE_BACKGROUND_ASSET_KEY = "battle-background-candidate";
export const BATTLE_WINDOW_FRAME_ASSET_KEY = "battle-window-frame-candidate";

export const ROM_BATTLE_DESIGN_ASSETS = {
  background: {
    key: BATTLE_BACKGROUND_ASSET_KEY,
    path: "/assets/rom-screens/pbr_b_plist_gra.narc/screen_0010_gfx_0022_pal_0023.png",
    role: "battle-background",
    sourceArchivePath: "pbr/b_plist_gra.narc",
    candidate: true,
    notes: ["Selected battle screen candidate from ROM extraction screen 0010."],
  },
  windowFrame: {
    key: BATTLE_WINDOW_FRAME_ASSET_KEY,
    path: "/assets/rom-dump/pbr_winframe.narc/file_0000_pal_0024.png",
    role: "battle-window-frame-candidate",
    sourceArchivePath: "pbr/winframe.narc",
    candidate: true,
    notes: ["Candidate window frame tile from ROM extraction."],
  },
} as const satisfies Record<string, BattleAssetManifestEntry>;

export const ROM_BATTLE_PRELOAD_ASSETS = Object.values(ROM_BATTLE_DESIGN_ASSETS).map(
  ({ key, path }) => [key, path] as const,
);

export const ROM_BATTLE_WINDOW_STYLE = {
  fill: 0xf4f7e3,
  border: 0x2b3742,
  shadow: 0x8b9588,
  highlight: 0xffffff,
  hpBack: 0x2b3742,
  hpGood: 0x43b65c,
} as const;
