export const DEFAULT_GEN4_IV = 31;
export const DEFAULT_GEN4_EV = 0;

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
  iv = DEFAULT_GEN4_IV,
  ev = DEFAULT_GEN4_EV,
): Gen4BattleStats {
  return {
    maxHp: calculateHp(baseStats.hp, level, iv, ev),
    attack: calculateOtherStat(baseStats.attack, level, iv, ev),
    defense: calculateOtherStat(baseStats.defense, level, iv, ev),
    specialAttack: calculateOtherStat(baseStats.special_attack, level, iv, ev),
    specialDefense: calculateOtherStat(baseStats.special_defense, level, iv, ev),
    speed: calculateOtherStat(baseStats.speed, level, iv, ev),
  };
}

function calculateHp(base: number, level: number, iv: number, ev: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

function calculateOtherStat(base: number, level: number, iv: number, ev: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
}
