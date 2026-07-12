export type PokeLoungeSfxId =
  | "button-confirm"
  | "button-cancel"
  | "battle-start"
  | "battle-hit"
  | "battle-transition"
  | "pokemon-faint";

export type PokeLoungeBgmId = "field-day" | "wild-battle";

export interface PokeLoungeAudioSource {
  title: string;
  creator: string;
  license: "CC0-1.0";
  sourceUrl: string;
  sourceFile: string;
}

export interface PokeLoungeSfxManifestItem {
  id: PokeLoungeSfxId;
  src: string;
  durationMs: number;
  sizeBytes: number;
  defaultVolume: number;
  source: PokeLoungeAudioSource;
}

export interface PokeLoungeBgmManifestItem {
  id: PokeLoungeBgmId;
  src: string;
  durationMs: number;
  sizeBytes: number;
  defaultVolume: number;
  source: PokeLoungeAudioSource;
}

export interface PokeLoungeAudioManifest {
  version: number;
  sfx: PokeLoungeSfxManifestItem[];
  bgm: PokeLoungeBgmManifestItem[];
}
