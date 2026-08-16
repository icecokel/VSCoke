import {
  createCanonicalIdRecord,
  type CanonicalBattleState,
  type CanonicalPlayerState,
} from "./canonical-state";
import {
  APPROVED_COMPETITIVE_RULESET_V2,
  canUseCompetitiveStruggle,
  COMPETITIVE_RULESET_VERSION,
  type CompetitiveMoveDefinition,
  getCompetitiveMoveDefinition as getMoveDefinition,
  type CompetitivePartyMemberInput,
  type CompetitivePartyInput,
} from "./ruleset-contract";

export {
  APPROVED_COMPETITIVE_RULESET_V1,
  APPROVED_COMPETITIVE_RULESET_V2,
  canUseCompetitiveStruggle,
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_STRUGGLE_MOVE_ID,
  COMPETITIVE_RULESET_VERSION,
  type CompetitiveLoadoutEntry,
  type CompetitiveMoveDefinition,
  type CompetitivePartyMemberInput,
  type CompetitivePartyInput,
} from "./ruleset-contract";

export function getCompetitiveMoveDefinition(
  moveId: number | string,
): CompetitiveMoveDefinition | undefined {
  return getMoveDefinition(moveId);
}

export function createInitialBattleState(
  participantIds: readonly [string, string],
  parties?: Readonly<
    Record<string, readonly CompetitivePartyMemberInput[] | CompetitivePartyInput>
  >,
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
      createCanonicalPlayerState(playerId, parties?.[playerId]),
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

function createCanonicalPlayerState(
  playerId: string,
  party: readonly CompetitivePartyMemberInput[] | CompetitivePartyInput | undefined,
): CanonicalPlayerState {
  const partyInput = isCompetitivePartyInput(party) ? party : undefined;
  const members: readonly CompetitivePartyMemberInput[] | undefined = partyInput
    ? partyInput.members
    : (party as readonly CompetitivePartyMemberInput[] | undefined);
  if (!members || members.length < APPROVED_COMPETITIVE_RULESET_V2.minTeamSize) {
    throw new Error("Competitive assignment requires a saved party");
  }

  const normalizedParty = [...members]
    .sort((left, right) => left.slotIndex - right.slotIndex)
    .map(member => ({
      speciesId: member.speciesId,
      slotIndex: member.slotIndex,
      level: member.level,
      maxHp: member.maxHp,
      currentHp: member.currentHp,
      attack: member.attack,
      defense: member.defense,
      speed: member.speed,
      status: member.status ?? "none",
      moves: member.moves.map(move => ({
        moveId: move.moveId,
        pp: move.pp,
      })),
    }));

  const requestedActiveSlotIndex = partyInput?.activeSlotIndex;
  const activeSlotIndex =
    requestedActiveSlotIndex !== undefined &&
    normalizedParty.some(
      member => member.slotIndex === requestedActiveSlotIndex && member.currentHp > 0,
    )
      ? requestedActiveSlotIndex
      : normalizedParty.find(member => member.currentHp > 0)?.slotIndex;
  if (activeSlotIndex === undefined) {
    throw new Error("Competitive assignment requires one healthy party member");
  }

  return {
    playerId,
    activeSlotIndex,
    team: normalizedParty,
  };
}

function isCompetitivePartyInput(
  value: readonly CompetitivePartyMemberInput[] | CompetitivePartyInput | undefined,
): value is CompetitivePartyInput {
  return Boolean(value && !Array.isArray(value) && "members" in value);
}
