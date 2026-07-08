import { getBattlePokemonAssets } from "./battlePokemonAssets";
import type { BattlePokemon, BattleSpriteRef } from "./battleTypes";
import { calculateGen4BattleStats } from "./gen4PokemonStats";
import type { RomPersonalRecord, RomPersonalRecordCollection } from "./wildBattleFactory";

export const LEVEL_UP_EVOLUTION_METHOD = 4;

export interface PokemonEvolutionRule {
  method: number;
  parameter: number;
  targetSpeciesId: number;
}

export type PokemonEvolutionTable = Record<number, PokemonEvolutionRule[]>;

export interface ApplyLevelUpEvolutionInput {
  pokemon: BattlePokemon;
  previousLevel: number;
  evolutionTable: PokemonEvolutionTable;
  personalRecords: RomPersonalRecordCollection;
}

export interface ApplyLevelUpEvolutionResult {
  pokemon: BattlePokemon;
  messages: string[];
  evolved: boolean;
}

const POKEMON_SPECIES_DISPLAY_NAMES: Record<number, string> = {
  152: "치코리타",
  153: "베이리프",
  154: "메가니움",
  155: "브케인",
  156: "마그케인",
  157: "블레이범",
  158: "리아코",
  159: "엘리게이",
  160: "장크로다일",
};

export function normalizePokemonEvolutionTable(data: unknown): PokemonEvolutionTable {
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.species)) {
    return {};
  }

  return Object.entries(data.species).reduce<PokemonEvolutionTable>(
    (accumulator, [speciesIdKey, value]) => {
      const speciesId =
        readPositiveInteger(speciesIdKey) ?? readPositiveInteger(value, "speciesId");

      if (!speciesId || !isRecord(value)) {
        return accumulator;
      }

      const evolutions = normalizePokemonEvolutionRules(value.evolutions);

      if (evolutions.length > 0) {
        accumulator[speciesId] = evolutions;
      }

      return accumulator;
    },
    {},
  );
}

export function applyLevelUpEvolution({
  evolutionTable,
  personalRecords,
  pokemon,
  previousLevel,
}: ApplyLevelUpEvolutionInput): ApplyLevelUpEvolutionResult {
  const rule = findLevelUpEvolutionRule(
    evolutionTable[pokemon.speciesId] ?? [],
    previousLevel,
    pokemon.level,
  );

  if (!rule) {
    return { pokemon, messages: [], evolved: false };
  }

  const targetRecord = findPersonalRecord(personalRecords, rule.targetSpeciesId);

  if (!targetRecord) {
    return { pokemon, messages: [], evolved: false };
  }

  const evolvedName = getPokemonSpeciesDisplayName(rule.targetSpeciesId);
  const evolvedStats = calculateGen4BattleStats(
    targetRecord.base_stats,
    pokemon.level,
    pokemon.individualValues,
  );
  const maxHpIncrease = Math.max(0, evolvedStats.maxHp - pokemon.maxHp);
  const assets = resolveBattlePokemonAssets(rule.targetSpeciesId, pokemon);

  return {
    pokemon: {
      ...pokemon,
      speciesId: rule.targetSpeciesId,
      name: evolvedName,
      catchRate: targetRecord.catch_rate,
      baseExpYield: targetRecord.base_exp,
      growthRate: targetRecord.growth_rate,
      baseStats: targetRecord.base_stats,
      maxHp: evolvedStats.maxHp,
      currentHp: Math.min(evolvedStats.maxHp, pokemon.currentHp + maxHpIncrease),
      attack: evolvedStats.attack,
      defense: evolvedStats.defense,
      specialAttack: evolvedStats.specialAttack,
      specialDefense: evolvedStats.specialDefense,
      speed: evolvedStats.speed,
      typeIds: uniqueTypeIds(targetRecord.types.primary, targetRecord.types.secondary),
      frontSprite: assets.front,
      backSprite: assets.back,
    },
    messages: [
      `어라? ${pokemon.name}의 모습이...!`,
      `${pokemon.name}는 ${evolvedName}로 진화했다!`,
    ],
    evolved: true,
  };
}

function normalizePokemonEvolutionRules(data: unknown): PokemonEvolutionRule[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map(normalizePokemonEvolutionRule)
    .filter((rule): rule is PokemonEvolutionRule => rule !== null);
}

function normalizePokemonEvolutionRule(data: unknown): PokemonEvolutionRule | null {
  if (!isRecord(data)) {
    return null;
  }

  const method = readPositiveInteger(data, "method");
  const parameter = readNonNegativeInteger(data, "parameter");
  const targetSpeciesId = readPositiveInteger(data, "targetSpeciesId");

  if (!method || parameter === null || !targetSpeciesId) {
    return null;
  }

  return { method, parameter, targetSpeciesId };
}

function findLevelUpEvolutionRule(
  rules: PokemonEvolutionRule[],
  previousLevel: number,
  currentLevel: number,
): PokemonEvolutionRule | null {
  return (
    rules
      .filter(
        rule =>
          rule.method === LEVEL_UP_EVOLUTION_METHOD &&
          previousLevel < rule.parameter &&
          currentLevel >= rule.parameter,
      )
      .sort((left, right) => left.parameter - right.parameter)[0] ?? null
  );
}

function findPersonalRecord(
  collection: RomPersonalRecordCollection,
  speciesId: number,
): RomPersonalRecord | null {
  return collection.records.find(record => record.index === speciesId) ?? null;
}

function getPokemonSpeciesDisplayName(speciesId: number): string {
  return POKEMON_SPECIES_DISPLAY_NAMES[speciesId] ?? `포켓몬 #${speciesId}`;
}

function resolveBattlePokemonAssets(
  speciesId: number,
  fallbackPokemon: BattlePokemon,
): { front: BattleSpriteRef; back: BattleSpriteRef } {
  try {
    return getBattlePokemonAssets(speciesId);
  } catch {
    return {
      front: fallbackPokemon.frontSprite,
      back: fallbackPokemon.backSprite,
    };
  }
}

function readPositiveInteger(value: unknown, key?: string): number | null {
  const candidate = key && isRecord(value) ? value[key] : value;
  const numberValue =
    typeof candidate === "string" && candidate.trim().length > 0
      ? Number.parseInt(candidate, 10)
      : candidate;

  return typeof numberValue === "number" && Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : null;
}

function readNonNegativeInteger(value: unknown, key?: string): number | null {
  const candidate = key && isRecord(value) ? value[key] : value;
  const numberValue =
    typeof candidate === "string" && candidate.trim().length > 0
      ? Number.parseInt(candidate, 10)
      : candidate;

  return typeof numberValue === "number" && Number.isInteger(numberValue) && numberValue >= 0
    ? numberValue
    : null;
}

function uniqueTypeIds(primary: number, secondary?: number | null): number[] {
  return [primary, secondary].filter(
    (typeId, index, typeIds): typeId is number =>
      typeof typeId === "number" && typeIds.indexOf(typeId) === index,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
