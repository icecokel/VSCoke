export const COMPETITIVE_RULESET_VERSION = 2;
export const COMPETITIVE_STRUGGLE_MOVE_ID = 165;

export interface CompetitiveMoveDefinition {
  moveId: number;
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
  speciesId: number | string;
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  moveIds: readonly (number | string)[];
}

export interface CompetitivePartyMemberInput {
  slotIndex: number;
  speciesId: number;
  level: number;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;
  status?: "none" | "paralyzed";
  moves: readonly { moveId: number; pp: number; maxPp?: number }[];
}

export interface CompetitivePartyInput {
  activeSlotIndex: number;
  members: readonly CompetitivePartyMemberInput[];
}

export interface CompetitiveRulesetV2 {
  version: 2;
  participantCount: 2;
  minTeamSize: 1;
  maxTeamSize: 6;
  scores: { win: 100; loss: 50 };
  paralysisNoActionChance: number;
  damageRangePercent: { minimum: number; maximum: number };
  randomConsumptionOrder: readonly string[];
  struggle: {
    moveId: number;
    power: number;
    accuracy: number;
    criticalHitChance: number;
    maxPp: 0;
    secondaryEffect: null;
    recoilMaxHpDivisor: number;
  };
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

/** V2 has no fixed loadout; each assignment is built from the saved party. */
export const APPROVED_COMPETITIVE_RULESET_V2 = deepFreeze({
  version: COMPETITIVE_RULESET_VERSION,
  participantCount: 2,
  minTeamSize: 1,
  maxTeamSize: 6,
  scores: { win: 100, loss: 50 },
  paralysisNoActionChance: 0.25,
  damageRangePercent: { minimum: 85, maximum: 100 },
  randomConsumptionOrder: [
    "speed-tie",
    "paralysis",
    "accuracy",
    "critical-hit",
    "damage-range",
    "secondary-effect",
  ],
  struggle: {
    moveId: COMPETITIVE_STRUGGLE_MOVE_ID,
    power: 50,
    accuracy: 1,
    criticalHitChance: 1 / 16,
    maxPp: 0,
    secondaryEffect: null,
    recoilMaxHpDivisor: 4,
  },
} as const);

/** Legacy rows can be read during migration, but no new assignment uses it. */
export const APPROVED_COMPETITIVE_RULESET_V1 = deepFreeze({
  version: 1,
  participantCount: 2,
  teamSize: 2,
  scores: { win: 100, loss: 50 },
  paralysisNoActionChance: 0.25,
  damageRangePercent: { minimum: 85, maximum: 100 },
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
      secondaryEffect: { status: "paralyzed" as const, chance: 0.3 },
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
    moveId: "struggle",
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

export function canUseCompetitiveStruggle(moves: readonly { pp: number }[]): boolean {
  return moves.length > 0 && moves.every(move => move.pp === 0);
}

/** Server-owned numeric move metadata; the client only supplies catalog IDs. */
export function getCompetitiveMoveDefinition(
  moveId: number | string,
): CompetitiveMoveDefinition | undefined {
  const numericMoveId = typeof moveId === "number" ? moveId : Number(moveId);
  if (numericMoveId === COMPETITIVE_STRUGGLE_MOVE_ID) {
    return APPROVED_COMPETITIVE_RULESET_V2.struggle;
  }
  if (!Number.isSafeInteger(numericMoveId) || numericMoveId < 1 || numericMoveId > 470) {
    return undefined;
  }

  return {
    moveId: numericMoveId,
    power: 20 + (numericMoveId % 81),
    accuracy: 0.75 + ((numericMoveId * 7) % 26) / 100,
    criticalHitChance: 1 / 16,
    maxPp: 99,
    secondaryEffect: null,
  };
}

export const COMPETITIVE_RULESET_HASH = "dynamic-party-v2-catalog-id-rules-20260817";
