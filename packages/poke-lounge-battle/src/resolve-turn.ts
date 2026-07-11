import type { CanonicalCompetitiveAction } from "./actions";
import {
  createCanonicalIdRecord,
  hashCanonicalState,
  type CanonicalBattleState,
  type CanonicalCombatantState,
  type CanonicalIdRecord,
  type CanonicalPlayerState,
  type CanonicalTerminalResult,
} from "./canonical-state";
import type { SeededRandom } from "./prng";
import {
  APPROVED_COMPETITIVE_RULESET_V1,
  COMPETITIVE_RULESET_VERSION,
  getCompetitiveMoveDefinition,
  type CompetitiveLoadoutEntry,
  type CompetitiveMoveDefinition,
} from "./ruleset";

export interface CompetitiveAssignmentV1 {
  matchId: string;
  assignmentRevision: number;
  rulesetVersion: 1;
  rulesetHash: string;
  participantIds: readonly [string, string];
  initialState: CanonicalBattleState;
}

export interface ResolvedTurnV1 {
  turn: number;
  state: CanonicalBattleState;
  stateHash: string;
  terminal: CanonicalTerminalResult | null;
}

function randomValue(random: SeededRandom): number {
  const value = random.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("SeededRandom.next() must return a value in [0, 1)");
  }
  return value;
}

function sortedParticipantIds(state: CanonicalBattleState): readonly [string, string] {
  if (state.rulesetVersion !== COMPETITIVE_RULESET_VERSION) {
    throw new Error("Unsupported competitive ruleset version");
  }
  if (
    !Number.isSafeInteger(state.turn) ||
    state.turn < 0 ||
    state.turn >= Number.MAX_SAFE_INTEGER
  ) {
    throw new Error("Battle turn must be a safe nonnegative integer below Number.MAX_SAFE_INTEGER");
  }

  const ids = [...state.participantIds].sort();
  if (ids.length !== 2 || ids[0] === ids[1] || !ids[0] || !ids[1]) {
    throw new Error("Canonical battle state requires exactly two participants");
  }

  const statePlayerIds = Object.keys(state.playersById).sort();
  if (statePlayerIds.length !== 2 || statePlayerIds.some((id, i) => id !== ids[i])) {
    throw new Error("Canonical battle state requires exactly two participant players");
  }

  return [ids[0], ids[1]];
}

function validateCombatant(
  combatant: CanonicalCombatantState,
  template: CompetitiveLoadoutEntry,
): void {
  if (
    combatant.speciesId !== template.speciesId ||
    combatant.level !== template.level ||
    combatant.maxHp !== template.maxHp ||
    combatant.attack !== template.attack ||
    combatant.defense !== template.defense ||
    combatant.speed !== template.speed ||
    combatant.moves.length !== template.moveIds.length ||
    combatant.moves.some((move, index) => move.moveId !== template.moveIds[index])
  ) {
    throw new Error("Canonical combatant does not match the approved loadout");
  }

  if (
    !Number.isInteger(combatant.currentHp) ||
    combatant.currentHp < 0 ||
    combatant.currentHp > combatant.maxHp ||
    !["none", "paralyzed"].includes(combatant.status)
  ) {
    throw new Error("Invalid canonical combatant state");
  }

  for (const move of combatant.moves) {
    const definition = getCompetitiveMoveDefinition(move.moveId);
    if (!definition || !Number.isInteger(move.pp) || move.pp < 0 || move.pp > definition.maxPp) {
      throw new Error("Invalid canonical move state");
    }
  }
}

function validatePlayer(playerId: string, player: CanonicalPlayerState): void {
  if (
    player.playerId !== playerId ||
    player.team.length !== APPROVED_COMPETITIVE_RULESET_V1.teamSize ||
    !Number.isInteger(player.activeSlotIndex) ||
    player.activeSlotIndex < 0 ||
    player.activeSlotIndex >= player.team.length
  ) {
    throw new Error("Invalid canonical player state");
  }
  player.team.forEach((combatant, index) =>
    validateCombatant(combatant, APPROVED_COMPETITIVE_RULESET_V1.loadout[index]!),
  );
}

function cloneState(
  state: CanonicalBattleState,
  participantIds: readonly [string, string],
): CanonicalBattleState {
  const playersById = createCanonicalIdRecord<CanonicalPlayerState>(
    participantIds.map(playerId => {
      const player = state.playersById[playerId]!;
      return [
        playerId,
        {
          playerId,
          activeSlotIndex: player.activeSlotIndex,
          team: player.team.map(member => ({
            ...member,
            moves: member.moves.map(move => ({ ...move })),
          })),
        },
      ];
    }),
  );

  return {
    rulesetVersion: COMPETITIVE_RULESET_VERSION,
    turn: state.turn,
    participantIds,
    playersById,
    terminal: state.terminal
      ? {
          ...state.terminal,
          scoreByPlayerId: createCanonicalIdRecord(Object.entries(state.terminal.scoreByPlayerId)),
        }
      : null,
  };
}

function activeCombatant(state: CanonicalBattleState, playerId: string): CanonicalCombatantState {
  const player = state.playersById[playerId]!;
  return player.team[player.activeSlotIndex]!;
}

function rejectUnsupportedAction(action: never): never {
  const runtimeKind = (action as { kind?: unknown }).kind;
  throw new Error(`Unsupported competitive action kind: ${String(runtimeKind)}`);
}

function validateAction(
  state: CanonicalBattleState,
  playerId: string,
  action: CanonicalCompetitiveAction,
): void {
  const player = state.playersById[playerId]!;
  const active = activeCombatant(state, playerId);

  switch (action.kind) {
    case "move": {
      if (active.currentHp === 0) {
        throw new Error("Cannot use a move while the active combatant is fainted");
      }
      const move = active.moves.find(candidate => candidate.moveId === action.moveId);
      if (!move || !getCompetitiveMoveDefinition(action.moveId)) {
        throw new Error("Cannot use an invalid move");
      }
      if (move.pp === 0) {
        throw new Error("Cannot use a move with zero PP");
      }
      return;
    }
    case "switch": {
      if (
        !Number.isInteger(action.slotIndex) ||
        action.slotIndex < 0 ||
        action.slotIndex >= player.team.length
      ) {
        throw new Error("Switch slot is out of range");
      }
      if (action.slotIndex === player.activeSlotIndex) {
        throw new Error("Cannot switch to the active slot");
      }
      if (player.team[action.slotIndex]!.currentHp === 0) {
        throw new Error("Cannot switch to a fainted slot");
      }
      return;
    }
    default:
      return rejectUnsupportedAction(action);
  }
}

function opponentId(participantIds: readonly [string, string], playerId: string): string {
  return participantIds[0] === playerId ? participantIds[1] : participantIds[0];
}

function calculateDamage(
  attacker: CanonicalCombatantState,
  defender: CanonicalCombatantState,
  move: CompetitiveMoveDefinition,
  criticalHit: boolean,
  rangePercent: number,
): number {
  const levelFactor = Math.floor((2 * attacker.level) / 5) + 2;
  const scaledPower = Math.floor((levelFactor * move.power * attacker.attack) / defender.defense);
  const baseDamage = Math.floor(scaledPower / 50) + 2;
  const criticalDamage = criticalHit ? Math.floor((baseDamage * 3) / 2) : baseDamage;
  return Math.max(1, Math.floor((criticalDamage * rangePercent) / 100));
}

function terminalForFaint(
  participantIds: readonly [string, string],
  winnerPlayerId: string,
  loserPlayerId: string,
): CanonicalTerminalResult {
  const scoreByPlayerId = createCanonicalIdRecord<50 | 100>(
    participantIds.map(playerId => [
      playerId,
      playerId === winnerPlayerId
        ? APPROVED_COMPETITIVE_RULESET_V1.scores.win
        : APPROVED_COMPETITIVE_RULESET_V1.scores.loss,
    ]),
  );
  return {
    winnerPlayerId,
    loserPlayerId,
    reason: "faint",
    scoreByPlayerId,
  };
}

function executeMove(
  state: CanonicalBattleState,
  participantIds: readonly [string, string],
  actorPlayerId: string,
  action: Extract<CanonicalCompetitiveAction, { kind: "move" }>,
  random: SeededRandom,
): void {
  const attacker = activeCombatant(state, actorPlayerId);
  if (attacker.currentHp === 0) {
    return;
  }

  const moveState = attacker.moves.find(move => move.moveId === action.moveId)!;
  const move = getCompetitiveMoveDefinition(action.moveId)!;
  moveState.pp -= 1;

  if (
    attacker.status === "paralyzed" &&
    randomValue(random) < APPROVED_COMPETITIVE_RULESET_V1.paralysisNoActionChance
  ) {
    return;
  }
  if (randomValue(random) >= move.accuracy) {
    return;
  }

  const criticalHit = randomValue(random) < move.criticalHitChance;
  const damageRange = APPROVED_COMPETITIVE_RULESET_V1.damageRangePercent;
  const rangePercent =
    damageRange.minimum +
    Math.floor(randomValue(random) * (damageRange.maximum - damageRange.minimum + 1));
  const targetPlayerId = opponentId(participantIds, actorPlayerId);
  const defender = activeCombatant(state, targetPlayerId);
  const damage = calculateDamage(attacker, defender, move, criticalHit, rangePercent);
  defender.currentHp = Math.max(0, defender.currentHp - damage);

  if (defender.currentHp === 0) {
    const targetTeam = state.playersById[targetPlayerId]!.team;
    if (targetTeam.every(member => member.currentHp === 0)) {
      state.terminal = terminalForFaint(participantIds, actorPlayerId, targetPlayerId);
    }
    return;
  }

  if (
    move.secondaryEffect &&
    randomValue(random) < move.secondaryEffect.chance &&
    defender.status === "none"
  ) {
    defender.status = move.secondaryEffect.status;
  }
}

function orderedMoveActors(
  state: CanonicalBattleState,
  participantIds: readonly [string, string],
  actionsByPlayerId: Readonly<Record<string, CanonicalCompetitiveAction>>,
  random: SeededRandom,
): string[] {
  const actors = participantIds.filter(playerId => actionsByPlayerId[playerId]!.kind === "move");
  if (actors.length < 2) {
    return actors;
  }

  const firstSpeed = activeCombatant(state, actors[0]!).speed;
  const secondSpeed = activeCombatant(state, actors[1]!).speed;
  if (firstSpeed === secondSpeed) {
    return randomValue(random) < 0.5 ? actors : [actors[1]!, actors[0]!];
  }
  return firstSpeed > secondSpeed ? actors : [actors[1]!, actors[0]!];
}

export function validateCompetitiveAction(input: {
  state: CanonicalBattleState;
  playerId: string;
  action: CanonicalCompetitiveAction;
}): void {
  if (input.state.terminal) {
    throw new Error("Cannot submit an action after a terminal result");
  }

  const participantIds = sortedParticipantIds(input.state);
  for (const playerId of participantIds) {
    validatePlayer(playerId, input.state.playersById[playerId]!);
  }
  if (!participantIds.includes(input.playerId)) {
    throw new Error("Competitive action actor is not a participant");
  }

  validateAction(input.state, input.playerId, input.action);
}

export function resolveTurn(input: {
  state: CanonicalBattleState;
  actionsByPlayerId: CanonicalIdRecord<CanonicalCompetitiveAction>;
  random: SeededRandom;
}): ResolvedTurnV1 {
  const stateWithSafeRecords: CanonicalBattleState = {
    ...input.state,
    playersById: createCanonicalIdRecord(Object.entries(input.state.playersById)),
    terminal: input.state.terminal
      ? {
          ...input.state.terminal,
          scoreByPlayerId: createCanonicalIdRecord(
            Object.entries(input.state.terminal.scoreByPlayerId),
          ),
        }
      : null,
  };
  const actionsByPlayerId = createCanonicalIdRecord(Object.entries(input.actionsByPlayerId));

  if (stateWithSafeRecords.terminal) {
    throw new Error("Cannot resolve actions after a terminal result");
  }

  const participantIds = sortedParticipantIds(stateWithSafeRecords);
  for (const playerId of participantIds) {
    validatePlayer(playerId, stateWithSafeRecords.playersById[playerId]!);
  }

  const actionPlayerIds = Object.keys(actionsByPlayerId).sort();
  if (
    actionPlayerIds.length !== 2 ||
    actionPlayerIds.some((playerId, index) => playerId !== participantIds[index])
  ) {
    throw new Error("A turn requires exactly one action from each participant");
  }
  for (const playerId of participantIds) {
    validateAction(stateWithSafeRecords, playerId, actionsByPlayerId[playerId]!);
  }

  const state = cloneState(stateWithSafeRecords, participantIds);
  for (const playerId of participantIds) {
    const action = actionsByPlayerId[playerId]!;
    if (action.kind === "switch") {
      state.playersById[playerId]!.activeSlotIndex = action.slotIndex;
    }
  }

  const moveActors = orderedMoveActors(state, participantIds, actionsByPlayerId, input.random);
  for (const actorPlayerId of moveActors) {
    if (state.terminal) {
      break;
    }
    executeMove(
      state,
      participantIds,
      actorPlayerId,
      actionsByPlayerId[actorPlayerId] as Extract<CanonicalCompetitiveAction, { kind: "move" }>,
      input.random,
    );
  }

  const resolvedTurn = state.turn;
  state.turn += 1;
  return {
    turn: resolvedTurn,
    state,
    stateHash: hashCanonicalState(state),
    terminal: state.terminal,
  };
}
