import {
  createCanonicalIdRecord,
  type CanonicalBattleState,
  type CanonicalPlayerState,
} from "./canonical-state";
import {
  APPROVED_COMPETITIVE_RULESET_V1,
  COMPETITIVE_RULESET_VERSION,
  type CompetitiveMoveDefinition,
} from "./ruleset-contract";

export {
  APPROVED_COMPETITIVE_RULESET_V1,
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  type CompetitiveLoadoutEntry,
  type CompetitiveMoveDefinition,
} from "./ruleset-contract";

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
  const playersById = createCanonicalIdRecord<CanonicalPlayerState>(
    canonicalParticipantIds.map(playerId => [
      playerId,
      {
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
      },
    ]),
  );

  return {
    rulesetVersion: COMPETITIVE_RULESET_VERSION,
    turn: 0,
    participantIds: canonicalParticipantIds,
    playersById,
    terminal: null,
  };
}
