export type PokeLoungeSfxId =
  | "button-confirm"
  | "button-cancel"
  | "battle-start"
  | "battle-hit"
  | "battle-transition"
  | "pokemon-faint";

export type PokeLoungeBgmId = "field-day" | "wild-battle";

export interface PokeLoungeSfxManifestItem {
  id: PokeLoungeSfxId;
  src: string;
  durationMs: number;
  sizeBytes: number;
  defaultVolume: number;
}

export interface PokeLoungeBgmManifestItem {
  id: PokeLoungeBgmId;
  src: string;
  durationMs: number;
  sizeBytes: number;
  defaultVolume: number;
}

export interface PokeLoungeAudioManifest {
  version: number;
  sfx: PokeLoungeSfxManifestItem[];
  bgm: PokeLoungeBgmManifestItem[];
}
