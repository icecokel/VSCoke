import { MAX_POKEMON_INDIVIDUAL_VALUE, type PokemonIndividualValues } from "./individual-values";

export const DEFAULT_GEN4_IV = 31;
export const DEFAULT_GEN4_EV = 0;
export const DEFAULT_GEN4_IVS: Readonly<PokemonIndividualValues> = Object.freeze({
  hp: MAX_POKEMON_INDIVIDUAL_VALUE,
  attack: MAX_POKEMON_INDIVIDUAL_VALUE,
  defense: MAX_POKEMON_INDIVIDUAL_VALUE,
  specialAttack: MAX_POKEMON_INDIVIDUAL_VALUE,
  specialDefense: MAX_POKEMON_INDIVIDUAL_VALUE,
  speed: MAX_POKEMON_INDIVIDUAL_VALUE,
});
export const DEFAULT_GEN4_EVS: Readonly<PokemonIndividualValues> = Object.freeze({
  hp: DEFAULT_GEN4_EV,
  attack: DEFAULT_GEN4_EV,
  defense: DEFAULT_GEN4_EV,
  specialAttack: DEFAULT_GEN4_EV,
  specialDefense: DEFAULT_GEN4_EV,
  speed: DEFAULT_GEN4_EV,
});

export interface Gen4BaseStats {
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
}

export interface Gen4BattleStats {
  maxHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export function calculateGen4BattleStats(
  baseStats: Gen4BaseStats,
  level: number,
  iv: PokemonStatValuesInput = DEFAULT_GEN4_IVS,
  ev: PokemonStatValuesInput = DEFAULT_GEN4_EVS,
): Gen4BattleStats {
  return {
    maxHp: calculateHp(
      baseStats.hp,
      level,
      resolveStatValue(iv, "hp", DEFAULT_GEN4_IV),
      resolveStatValue(ev, "hp", DEFAULT_GEN4_EV),
    ),
    attack: calculateOtherStat(
      baseStats.attack,
      level,
      resolveStatValue(iv, "attack", DEFAULT_GEN4_IV),
      resolveStatValue(ev, "attack", DEFAULT_GEN4_EV),
    ),
    defense: calculateOtherStat(
      baseStats.defense,
      level,
      resolveStatValue(iv, "defense", DEFAULT_GEN4_IV),
      resolveStatValue(ev, "defense", DEFAULT_GEN4_EV),
    ),
    specialAttack: calculateOtherStat(
      baseStats.special_attack,
      level,
      resolveStatValue(iv, "specialAttack", DEFAULT_GEN4_IV),
      resolveStatValue(ev, "specialAttack", DEFAULT_GEN4_EV),
    ),
    specialDefense: calculateOtherStat(
      baseStats.special_defense,
      level,
      resolveStatValue(iv, "specialDefense", DEFAULT_GEN4_IV),
      resolveStatValue(ev, "specialDefense", DEFAULT_GEN4_EV),
    ),
    speed: calculateOtherStat(
      baseStats.speed,
      level,
      resolveStatValue(iv, "speed", DEFAULT_GEN4_IV),
      resolveStatValue(ev, "speed", DEFAULT_GEN4_EV),
    ),
  };
}

type PokemonStatValuesInput = number | Partial<PokemonIndividualValues>;

function resolveStatValue(
  input: PokemonStatValuesInput,
  stat: keyof PokemonIndividualValues,
  fallback: number,
): number {
  if (typeof input === "number") {
    return input;
  }

  return input[stat] ?? fallback;
}

function calculateHp(base: number, level: number, iv: number, ev: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

function calculateOtherStat(base: number, level: number, iv: number, ev: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
}
