import type { WildEncounterCandidate } from "../world/wildEncounters";
import type { PlayerPokemon } from "../state/gameStateStore";
import type { PlayerPokemonSlot } from "../player/playerTypes";
import { getRuntimeWildBattleMoveSets } from "../data/game-data-json";
import type { RomBattleMoveRecord } from "./battleRomData";
import { createDefaultBattleStatStages } from "./battle-stat-stages";
import { BATTLE_PARTY_SLOT_COUNT, createBattleParty } from "./battleParty";
import { getBattlePokemonAssets } from "./battlePokemonAssets";
import { getExperienceForLevel } from "./experience";
import {
  createBattleMoveFromRom,
  getLevelUpMovesForSpecies,
  MAX_POKEMON_MOVE_COUNT,
} from "./levelUpMoves";
import { normalizeIndividualValues } from "./individual-values";
import type {
  BattlePartySlot,
  BattleMove,
  BattlePokemon,
  BattleReturnToWorld,
  BattleScreenState,
} from "./battleTypes";
import { calculateGen4BattleStats, type Gen4BaseStats } from "./gen4PokemonStats";

export interface RomPersonalRecord {
  index: number;
  catch_rate: number;
  base_exp: number;
  growth_rate: number;
  base_stats: Gen4BaseStats;
  types: {
    primary: number;
    secondary?: number | null;
  };
}

export interface RomPersonalRecordCollection {
  records: RomPersonalRecord[];
}

export interface RomRefinedMoveCollection {
  moves: Record<string, RomBattleMoveRecord> | RomBattleMoveRecord[];
}

export interface CreateWildBattleStateInput {
  encounter: WildEncounterCandidate;
  personalRecords: RomPersonalRecordCollection;
  moveRecords: RomRefinedMoveCollection;
  playerPokemon?: PlayerPokemon;
  playerParty?: Array<PlayerPokemonSlot<PlayerPokemon>>;
  activePartySlotIndex?: number;
  returnToWorld?: BattleReturnToWorld;
}

const PLAYER_SPECIES_ID = 152;
const PLAYER_NAME = "치코리타";
const PLAYER_LEVEL = 10;

const DEFAULT_SPECIES_MOVE_SETS: Record<number, number[]> = {
  1: [33, 45, 22],
  2: [33, 45, 22],
  3: [33, 45, 22],
  4: [10, 45, 52],
  5: [10, 45, 52],
  6: [10, 45, 52],
  7: [33, 39, 55],
  8: [33, 39, 55],
  9: [33, 39, 55],
  10: [33, 81],
  16: [33, 28, 16],
  19: [33, 39, 98],
  152: [33, 45],
  155: [52, 43],
  158: [10, 43],
};

export function createWildBattleState({
  encounter,
  moveRecords,
  personalRecords,
  playerParty: storedPlayerParty,
  playerPokemon: storedPlayerPokemon,
  activePartySlotIndex: storedActivePartySlotIndex,
  returnToWorld,
}: CreateWildBattleStateInput): BattleScreenState {
  const playerBattleSetup = createPlayerBattleSetup({
    activePartySlotIndex: storedActivePartySlotIndex,
    moveRecords,
    personalRecords,
    playerParty: storedPlayerParty,
    playerPokemon: storedPlayerPokemon,
  });
  const opponentPokemon = createBattlePokemon({
    level: encounter.level,
    moveIds: resolveWildBattleMoveIds(encounter.speciesId, encounter.level),
    moveRecords,
    name: encounter.name,
    personalRecords,
    speciesId: encounter.speciesId,
  });

  return {
    battleKind: "wild",
    phase: "intro",
    roundIndex: 0,
    matchIndex: 0,
    turn: 1,
    runAttemptCount: 0,
    player: {
      playerId: "player-1",
      displayName: "Player 1",
      pokemon: playerBattleSetup.pokemon,
      party: playerBattleSetup.party,
      activePartySlotIndex: playerBattleSetup.activePartySlotIndex,
    },
    opponent: {
      playerId: "wild",
      displayName: `야생 ${encounter.name}`,
      pokemon: opponentPokemon,
      party: createBattleParty(opponentPokemon),
      activePartySlotIndex: 0,
    },
    messageQueue: [
      formatWildAppearedMessage(opponentPokemon.name),
      `가랏! ${playerBattleSetup.pokemon.name}!`,
    ],
    selectedMoveId: null,
    result: null,
    ...(returnToWorld ? { returnToWorld } : {}),
  };
}

function createPlayerBattleSetup({
  activePartySlotIndex,
  moveRecords,
  personalRecords,
  playerParty,
  playerPokemon,
}: {
  activePartySlotIndex?: number;
  moveRecords: RomRefinedMoveCollection;
  personalRecords: RomPersonalRecordCollection;
  playerParty?: Array<PlayerPokemonSlot<PlayerPokemon>>;
  playerPokemon?: PlayerPokemon;
}): { pokemon: BattlePokemon; party: BattlePartySlot[]; activePartySlotIndex: number } {
  if (playerParty?.some(slot => slot.pokemon)) {
    const resolvedActivePartySlotIndex = resolveStoredActivePartySlotIndex(
      playerParty,
      activePartySlotIndex,
    );
    const party = createStoredBattleParty({
      moveRecords,
      personalRecords,
      playerParty,
    });
    const pokemon = party.find(slot => slot.slotIndex === resolvedActivePartySlotIndex)?.pokemon;

    if (pokemon) {
      return {
        pokemon,
        party,
        activePartySlotIndex: resolvedActivePartySlotIndex,
      };
    }
  }

  const pokemon = createBattlePokemon({
    currentHp: playerPokemon?.currentHp,
    individualValues: playerPokemon?.individualValues,
    storedExperience: playerPokemon?.experience,
    level: playerPokemon?.level ?? PLAYER_LEVEL,
    moveRecords,
    name: playerPokemon?.name ?? PLAYER_NAME,
    personalRecords,
    speciesId: playerPokemon?.speciesId ?? PLAYER_SPECIES_ID,
    status: playerPokemon?.status,
  });

  return {
    pokemon,
    party: createBattleParty(pokemon),
    activePartySlotIndex: 0,
  };
}

function createStoredBattleParty({
  moveRecords,
  personalRecords,
  playerParty,
}: {
  moveRecords: RomRefinedMoveCollection;
  personalRecords: RomPersonalRecordCollection;
  playerParty: Array<PlayerPokemonSlot<PlayerPokemon>>;
}): BattlePartySlot[] {
  return Array.from({ length: BATTLE_PARTY_SLOT_COUNT }, (_, slotIndex) => {
    const storedPokemon = playerParty.find(slot => slot.slotIndex === slotIndex)?.pokemon;

    return {
      slotIndex,
      pokemon: storedPokemon
        ? createBattlePokemon({
            currentHp: storedPokemon.currentHp,
            individualValues: storedPokemon.individualValues,
            storedExperience: storedPokemon.experience,
            level: storedPokemon.level,
            moveRecords,
            name: storedPokemon.name,
            personalRecords,
            speciesId: storedPokemon.speciesId,
            status: storedPokemon.status,
          })
        : null,
    };
  });
}

function resolveStoredActivePartySlotIndex(
  playerParty: Array<PlayerPokemonSlot<PlayerPokemon>>,
  activePartySlotIndex?: number,
): number {
  if (
    typeof activePartySlotIndex === "number" &&
    Number.isInteger(activePartySlotIndex) &&
    activePartySlotIndex >= 0 &&
    activePartySlotIndex < BATTLE_PARTY_SLOT_COUNT &&
    playerParty.some(slot => slot.slotIndex === activePartySlotIndex && slot.pokemon)
  ) {
    return activePartySlotIndex;
  }

  return playerParty.find(slot => slot.pokemon)?.slotIndex ?? 0;
}

function createBattlePokemon({
  level,
  currentHp,
  individualValues: storedIndividualValues,
  storedExperience,
  moveRecords,
  name,
  personalRecords,
  speciesId,
  status,
  moveIds,
}: {
  level: number;
  currentHp?: number;
  individualValues?: PlayerPokemon["individualValues"];
  storedExperience?: number;
  moveIds?: number[];
  moveRecords: RomRefinedMoveCollection;
  name: string;
  personalRecords: RomPersonalRecordCollection;
  speciesId: number;
  status?: PlayerPokemon["status"];
}): BattlePokemon {
  const personalRecord = findPersonalRecord(personalRecords, speciesId);
  const individualValues = normalizeIndividualValues(storedIndividualValues);
  const stats = calculateGen4BattleStats(personalRecord.base_stats, level, individualValues);
  const assets = getBattlePokemonAssets(speciesId);
  const growthRate = personalRecord.growth_rate;
  const resolvedCurrentHp = clampHp(currentHp ?? stats.maxHp, stats.maxHp);

  return {
    speciesId,
    name,
    level,
    catchRate: personalRecord.catch_rate,
    baseExpYield: personalRecord.base_exp,
    growthRate,
    experience: resolveBattleExperience(level, growthRate, storedExperience),
    baseStats: personalRecord.base_stats,
    individualValues,
    maxHp: stats.maxHp,
    currentHp: resolvedCurrentHp,
    attack: stats.attack,
    defense: stats.defense,
    specialAttack: stats.specialAttack,
    specialDefense: stats.specialDefense,
    speed: stats.speed,
    statStages: createDefaultBattleStatStages(),
    typeIds: uniqueTypeIds(personalRecord.types.primary, personalRecord.types.secondary),
    status:
      status === "fainted" || resolvedCurrentHp === 0
        ? "fainted"
        : status === "poisoned"
          ? "poisoned"
          : "normal",
    frontSprite: assets.front,
    backSprite: assets.back,
    moves: createBattleMoves(moveIds ?? resolveDefaultBattleMoveIds(speciesId), moveRecords),
  };
}

function resolveBattleExperience(
  level: number,
  growthRate: number,
  storedExperience?: number,
): number {
  return typeof storedExperience === "number" && Number.isFinite(storedExperience)
    ? storedExperience
    : getExperienceForLevel(level, growthRate);
}

function clampHp(currentHp: number, maxHp: number): number {
  return Math.max(0, Math.min(maxHp, currentHp));
}

function createBattleMoves(moveIds: number[], moveRecords: RomRefinedMoveCollection): BattleMove[] {
  return moveIds.map(moveId => createBattleMoveFromRom(moveId, moveRecords));
}

function resolveWildBattleMoveIds(speciesId: number, level: number): number[] {
  const levelUpMoveIds = selectRecentUniqueMoveIds(
    getLevelUpMovesForSpecies(speciesId, 0, level).map(move => move.moveId),
  );

  if (levelUpMoveIds.length > 0) {
    return levelUpMoveIds;
  }

  return resolveDefaultBattleMoveIds(speciesId);
}

function resolveDefaultBattleMoveIds(speciesId: number): number[] {
  return getRuntimeWildBattleMoveSets(DEFAULT_SPECIES_MOVE_SETS)[speciesId] ?? [];
}

function findPersonalRecord(
  collection: RomPersonalRecordCollection,
  speciesId: number,
): RomPersonalRecord {
  const record = collection.records.find(candidate => candidate.index === speciesId);

  if (!record) {
    throw new Error(`Missing ROM personal record for species ${speciesId}`);
  }

  return record;
}

function selectRecentUniqueMoveIds(moveIds: number[]): number[] {
  const uniqueMoveIds: number[] = [];

  for (const moveId of moveIds) {
    const existingIndex = uniqueMoveIds.indexOf(moveId);

    if (existingIndex >= 0) {
      uniqueMoveIds.splice(existingIndex, 1);
    }

    uniqueMoveIds.push(moveId);
  }

  return uniqueMoveIds.slice(-MAX_POKEMON_MOVE_COUNT);
}

function formatWildAppearedMessage(name: string): string {
  return `야생 ${name}${getSubjectParticle(name)} 나타났다!`;
}

function getSubjectParticle(name: string): "이" | "가" {
  const lastCharacter = name[name.length - 1];

  if (!lastCharacter) {
    return "가";
  }

  const hangulOffset = lastCharacter.charCodeAt(0) - 0xac00;

  if (hangulOffset < 0 || hangulOffset > 11171) {
    return "가";
  }

  return hangulOffset % 28 === 0 ? "가" : "이";
}

function uniqueTypeIds(primary: number, secondary?: number | null): number[] {
  return [primary, secondary].filter(
    (typeId, index, typeIds): typeId is number =>
      typeof typeId === "number" && typeIds.indexOf(typeId) === index,
  );
}
