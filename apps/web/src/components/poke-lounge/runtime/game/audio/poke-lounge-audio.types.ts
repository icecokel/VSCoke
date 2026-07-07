export type PokeLoungeSfxId =
  | "button-confirm"
  | "button-cancel"
  | "battle-start"
  | "battle-hit"
  | "battle-transition"
  | "pokemon-faint";

export interface PokeLoungeSfxManifestItem {
  id: PokeLoungeSfxId;
  src: string;
  durationMs: number;
  sizeBytes: number;
  defaultVolume: number;
}

export interface PokeLoungeAudioManifest {
  version: number;
  sfx: PokeLoungeSfxManifestItem[];
}
