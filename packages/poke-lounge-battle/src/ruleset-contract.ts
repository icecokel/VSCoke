export const COMPETITIVE_RULESET_VERSION = 1;
export const COMPETITIVE_STRUGGLE_MOVE_ID = "struggle";

export interface CompetitiveMoveDefinition {
  moveId: string;
  power: number;
  accuracy: number;
  criticalHitChance: number;
  maxPp: number;
  secondaryEffect: null | {
    status: "paralyzed";
    chance: number;
  };
}

export interface CompetitiveLoadoutEntry {
  speciesId: string;
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  moveIds: readonly string[];
}

export function canUseCompetitiveStruggle(moves: readonly { pp: number }[]): boolean {
  return moves.length > 0 && moves.every(move => move.pp === 0);
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export const APPROVED_COMPETITIVE_RULESET_V1 = deepFreeze({
  version: COMPETITIVE_RULESET_VERSION,
  participantCount: 2,
  teamSize: 2,
  scores: {
    win: 100,
    loss: 50,
  },
  paralysisNoActionChance: 0.25,
  damageRangePercent: {
    minimum: 85,
    maximum: 100,
  },
  randomConsumptionOrder: [
    "speed-tie",
    "paralysis",
    "accuracy",
    "critical-hit",
    "damage-range",
    "secondary-effect",
  ],
  moves: {
    "steady-strike": {
      moveId: "steady-strike",
      power: 40,
      accuracy: 1,
      criticalHitChance: 1 / 16,
      maxPp: 20,
      secondaryEffect: null,
    },
    "stun-spark": {
      moveId: "stun-spark",
      power: 30,
      accuracy: 0.9,
      criticalHitChance: 1 / 16,
      maxPp: 15,
      secondaryEffect: {
        status: "paralyzed" as const,
        chance: 0.3,
      },
    },
    "heavy-blow": {
      moveId: "heavy-blow",
      power: 60,
      accuracy: 0.8,
      criticalHitChance: 1 / 16,
      maxPp: 10,
      secondaryEffect: null,
    },
  },
  struggle: {
    moveId: COMPETITIVE_STRUGGLE_MOVE_ID,
    power: 50,
    accuracy: 1,
    criticalHitChance: 1 / 16,
    maxPp: 0,
    secondaryEffect: null,
    recoilMaxHpDivisor: 4,
  },
  loadout: [
    {
      speciesId: "vscoke-alpha",
      level: 50,
      maxHp: 120,
      attack: 85,
      defense: 80,
      speed: 90,
      moveIds: ["steady-strike", "stun-spark"],
    },
    {
      speciesId: "vscoke-beta",
      level: 50,
      maxHp: 140,
      attack: 95,
      defense: 95,
      speed: 65,
      moveIds: ["steady-strike", "heavy-blow"],
    },
  ],
} as const);

// Node crypto 없이 같은 계약을 브라우저에 제공하며 ruleset.spec.ts가 canonical hash를 검증한다.
export const COMPETITIVE_RULESET_HASH =
  "06f455303f46369d1a31315db5fdfffa666164fde44f8ac20ac507a6fc9f9de7";
