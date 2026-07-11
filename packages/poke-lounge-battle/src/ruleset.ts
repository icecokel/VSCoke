import { createHash } from "node:crypto";

import {
  canonicalize,
  type CanonicalBattleState,
  type CanonicalPlayerState,
} from "./canonical-state";

export const COMPETITIVE_RULESET_VERSION = 1;

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

export const COMPETITIVE_RULESET_HASH = createHash("sha256")
  .update(canonicalize(APPROVED_COMPETITIVE_RULESET_V1), "utf8")
  .digest("hex");

export function getCompetitiveMoveDefinition(
  moveId: string,
): CompetitiveMoveDefinition | undefined {
  const moves: Readonly<Record<string, CompetitiveMoveDefinition>> =
    APPROVED_COMPETITIVE_RULESET_V1.moves;
  return moves[moveId];
}

export function createInitialBattleState(
  participantIds: readonly [string, string],
): CanonicalBattleState {
  if (participantIds.some(playerId => playerId.trim().length === 0)) {
    throw new Error("Initial-state participant IDs must be non-empty");
  }
  if (participantIds[0] === participantIds[1]) {
    throw new Error("Initial-state participant IDs must be distinct");
  }

  const canonicalParticipantIds = [...participantIds].sort() as [string, string];
  const playersById: Record<string, CanonicalPlayerState> = {};
  for (const playerId of canonicalParticipantIds) {
    playersById[playerId] = {
      playerId,
      activeSlotIndex: 0,
      team: APPROVED_COMPETITIVE_RULESET_V1.loadout.map(template => ({
        speciesId: template.speciesId,
        level: template.level,
        maxHp: template.maxHp,
        currentHp: template.maxHp,
        attack: template.attack,
        defense: template.defense,
        speed: template.speed,
        status: "none",
        moves: template.moveIds.map(moveId => ({
          moveId,
          pp: APPROVED_COMPETITIVE_RULESET_V1.moves[moveId].maxPp,
        })),
      })),
    };
  }

  return {
    rulesetVersion: COMPETITIVE_RULESET_VERSION,
    turn: 0,
    participantIds: canonicalParticipantIds,
    playersById,
    terminal: null,
  };
}
