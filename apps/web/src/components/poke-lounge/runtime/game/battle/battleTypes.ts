import type { PlayerPokemonSlot } from "../player/playerTypes";
import type { Gen4BaseStats } from "./gen4PokemonStats";
import type { PokemonIndividualValues } from "./individual-values";

export type BattlePhase =
  | "intro"
  | "command"
  | "move-select"
  | "party-select"
  | "bag-select"
  | "resolving"
  | "ended";
export type BattleKind = "sample" | "wild" | "trainer";
export type BattlePokemonStatus = "normal" | "poisoned" | "fainted";
export type BattleResultReason = "faint" | "timeout" | "forfeit" | "run" | "capture";
export type BattleCommand = "fight" | "bag" | "pokemon" | "run";

export interface BattleSpriteRef {
  assetKey: string;
  path: string;
  width?: number;
  height?: number;
}

export type BattleMoveCategory = "physical" | "special" | "status";

export interface BattleMove {
  id: number;
  name: string;
  pp: number;
  maxPp: number;
  type: string;
  typeId: number;
  category: BattleMoveCategory;
  effectCode: number;
  accuracy: number;
  power: number;
}

export interface BattlePokemon {
  speciesId: number;
  name: string;
  level: number;
  catchRate: number;
  baseExpYield: number;
  growthRate: number;
  experience: number;
  baseStats: Gen4BaseStats;
  individualValues: PokemonIndividualValues;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  typeIds: number[];
  status: BattlePokemonStatus;
  frontSprite: BattleSpriteRef;
  backSprite: BattleSpriteRef;
  moves: BattleMove[];
}

export type BattlePartySlot = PlayerPokemonSlot<BattlePokemon>;

export interface BattleParticipant {
  playerId: string;
  displayName: string;
  pokemon: BattlePokemon;
  party: BattlePartySlot[];
  activePartySlotIndex: number;
}

export interface BattleResult {
  winnerPlayerId: string;
  loserPlayerId: string;
  reason: BattleResultReason;
  capturedPokemon?: BattlePokemon;
  experienceGained?: number;
  levelsGained?: number;
  rewardPokeDollars?: number;
}

export interface BattleReturnToWorld {
  mapKey: string;
  x: number;
  y: number;
  facing: "front" | "back" | "left" | "right";
}

export interface BattleScreenState {
  battleKind: BattleKind;
  phase: BattlePhase;
  roundIndex: number;
  matchIndex: number;
  turn: number;
  runAttemptCount: number;
  player: BattleParticipant;
  opponent: BattleParticipant;
  messageQueue: string[];
  selectedMoveId: number | null;
  usedInventoryItemId?: string | null;
  tournamentMatchId?: string;
  result: BattleResult | null;
  returnToWorld?: BattleReturnToWorld;
}

export interface BattleAssetManifestEntry {
  key: string;
  path: string;
  role: string;
  sourceArchivePath: string;
  candidate: boolean;
  notes: string[];
}

export interface BattleAssetManifest {
  version: number;
  logicalSize: { width: number; height: number };
  assets: BattleAssetManifestEntry[];
}
