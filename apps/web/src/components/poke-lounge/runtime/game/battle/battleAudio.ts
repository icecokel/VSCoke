import {
  playPokeLoungeBgm,
  playPokeLoungeSfx,
  stopPokeLoungeBgm,
} from "../audio/poke-lounge-audio";
import type { PokeLoungeBgmId, PokeLoungeSfxId } from "../audio/poke-lounge-audio.types";

export interface RomBattleSoundCue {
  readonly sdatPath: string;
  readonly sequenceName: string;
  readonly sequenceIndex: number;
  readonly fileId: number;
  readonly rawFilePath: string;
  readonly sfxId?: PokeLoungeSfxId;
  readonly bgmId?: PokeLoungeBgmId;
}

export const BATTLE_SOUND_CUES = {
  wildBattleBgm: {
    sdatPath: "data/sound/gs_sound_data.sdat",
    sequenceName: "SEQ_GS_VS_NORAPOKE",
    sequenceIndex: 1116,
    fileId: 89,
    rawFilePath: "data/processed/rom-sound/00_data__sound__gs_sound_data.sdat/file_0089.bin",
    bgmId: "wild-battle",
  },
  confirm: {
    sdatPath: "data/sound/gs_sound_data.sdat",
    sequenceName: "SEQ_SE_PL_BUTTON",
    sequenceIndex: 1394,
    fileId: 319,
    rawFilePath: "data/processed/rom-sound/00_data__sound__gs_sound_data.sdat/file_0319.bin",
    sfxId: "button-confirm",
  },
  transition: {
    sdatPath: "data/sound/gs_sound_data.sdat",
    sequenceName: "SEQ_SE_PL_WARP",
    sequenceIndex: 1390,
    fileId: 316,
    rawFilePath: "data/processed/rom-sound/00_data__sound__gs_sound_data.sdat/file_0316.bin",
    sfxId: "battle-transition",
  },
} as const satisfies Record<string, RomBattleSoundCue>;

export function playBattleTransitionSound(): void {
  playPokeLoungeSfx("battle-transition");
}

export function playWildBattleBgm(): void {
  playPokeLoungeBgm("wild-battle");
}

export function stopWildBattleBgm(): void {
  stopPokeLoungeBgm("wild-battle");
}

export function playBattleStartSound(): void {
  playPokeLoungeSfx("battle-start");
}

export function playBattleHitSound(): void {
  playPokeLoungeSfx("battle-hit");
}

export function playPokemonFaintSound(): void {
  playPokeLoungeSfx("pokemon-faint");
}

export function playBattleConfirmSound(): void {
  playPokeLoungeSfx("button-confirm");
}

export function playBattleCancelSound(): void {
  playPokeLoungeSfx("button-cancel");
}
