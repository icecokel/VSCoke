import {
  canUseCompetitiveStruggle,
  COMPETITIVE_STRUGGLE_MOVE_ID,
} from "@vscoke/poke-lounge-battle";
import type { CompetitiveAction, CompetitiveProjection } from "../network/localPreviewRoom";
import { createDefaultBattleStatStages } from "./battle-stat-stages";
import { getBattlePokemonAssets } from "./battlePokemonAssets";
import { normalizeIndividualValues } from "./individual-values";
import {
  getRuntimePokemonMoveDetails,
  getRuntimePokemonSpeciesSummary,
} from "../data/game-data-json";
import type {
  BattleMove,
  BattleParticipant,
  BattlePartySlot,
  BattlePokemon,
  BattleScreenState,
} from "./battleTypes";

type CompetitivePlayer = CompetitiveProjection["currentState"]["playersById"][string];
type CompetitivePokemon = CompetitivePlayer["team"][number];

export function isLegalAuthoritativeAction(
  projection: CompetitiveProjection,
  ownPlayerId: string,
  action: CompetitiveAction,
): boolean {
  const player = projection.currentState.playersById[ownPlayerId];
  if (!player || projection.terminal) {
    return false;
  }

  if (action.kind === "move") {
    const activePokemon = player.team.find(pokemon => pokemon.slotIndex === player.activeSlotIndex);
    const moveId = toNumericId(action.moveId);
    return Boolean(
      activePokemon &&
      activePokemon.currentHp > 0 &&
      moveId !== null &&
      (activePokemon.moves.some(move => move.moveId === moveId && move.pp > 0) ||
        (moveId === COMPETITIVE_STRUGGLE_MOVE_ID &&
          canUseCompetitiveStruggle(activePokemon.moves))),
    );
  }

  if (action.kind === "switch") {
    if (!Number.isSafeInteger(action.slotIndex)) {
      return false;
    }
    const slotIndex = action.slotIndex as number;
    const target = player.team.find(pokemon => pokemon.slotIndex === slotIndex);
    return slotIndex !== player.activeSlotIndex && Boolean(target && target.currentHp > 0);
  }

  return false;
}

export function toAuthoritativeBattleState(
  projection: CompetitiveProjection,
  ownPlayerId: string,
  returnToWorld?: BattleScreenState["returnToWorld"],
): BattleScreenState {
  const ownPlayer = projection.currentState.playersById[ownPlayerId];
  const opponentId = projection.playerIds.find(playerId => playerId !== ownPlayerId);
  const opponent = opponentId ? projection.currentState.playersById[opponentId] : undefined;

  if (!ownPlayer || !opponent || !opponentId) {
    throw new Error("Competitive projection does not contain both battle participants");
  }

  const waiting = projection.submittedPlayerIds.includes(ownPlayerId);
  const terminal = projection.terminal ?? projection.currentState.terminal;
  const result = terminal
    ? {
        winnerPlayerId: terminal.winnerPlayerId,
        loserPlayerId: terminal.loserPlayerId,
        reason: terminal.reason,
      }
    : null;

  return {
    battleKind: "trainer",
    phase: result ? "ended" : waiting ? "resolving" : "command",
    roundIndex: projection.assignmentRevision,
    matchIndex: 0,
    turn: projection.currentTurn,
    runAttemptCount: 0,
    player: toBattleParticipant(ownPlayer, "Player"),
    opponent: toBattleParticipant(opponent, "Opponent"),
    messageQueue: result
      ? [result.winnerPlayerId === ownPlayerId ? "승리했습니다." : "패배했습니다."]
      : waiting
        ? ["상대의 선택을 기다리는 중..."]
        : [],
    selectedMoveId: null,
    tournamentMatchId: projection.matchId,
    result,
    ...(returnToWorld ? { returnToWorld } : {}),
  };
}

function toBattleParticipant(player: CompetitivePlayer, fallbackName: string): BattleParticipant {
  const party = Array.from(
    { length: 6 },
    (_, slotIndex): BattlePartySlot => ({
      slotIndex,
      pokemon: player.team.find(candidate => candidate.slotIndex === slotIndex)
        ? toBattlePokemon(player.team.find(candidate => candidate.slotIndex === slotIndex)!)
        : null,
    }),
  );
  const activePokemon = party[player.activeSlotIndex]?.pokemon;

  if (!activePokemon) {
    throw new Error(`Competitive ${fallbackName} has no active Pokemon`);
  }

  return {
    playerId: player.playerId,
    displayName: fallbackName,
    pokemon: activePokemon,
    party,
    activePartySlotIndex: player.activeSlotIndex,
  };
}

function toBattlePokemon(pokemon: CompetitivePokemon): BattlePokemon {
  const speciesId = toNumericId(pokemon.speciesId) ?? 1;
  const species = getRuntimePokemonSpeciesSummary(speciesId);
  const assets = getBattlePokemonAssets(speciesId);
  const level = pokemon.level ?? 1;
  const attack = pokemon.attack ?? 10 + level;
  const defense = pokemon.defense ?? 10 + level;
  const speed = pokemon.speed ?? 10 + level;
  const status =
    pokemon.currentHp <= 0 ? "fainted" : pokemon.status === "paralyzed" ? "paralyzed" : "normal";

  return {
    speciesId,
    name: species?.name ?? `#${speciesId}`,
    level,
    catchRate: 0,
    baseExpYield: 0,
    growthRate: 1_000_000,
    experience: 0,
    baseStats: {
      hp: species?.baseStats.hp ?? pokemon.maxHp,
      attack: species?.baseStats.attack ?? attack,
      defense: species?.baseStats.defense ?? defense,
      speed: species?.baseStats.speed ?? speed,
      special_attack: species?.baseStats.specialAttack ?? attack,
      special_defense: species?.baseStats.specialDefense ?? defense,
    },
    individualValues: normalizeIndividualValues({}, () => 0),
    maxHp: pokemon.maxHp,
    currentHp: pokemon.currentHp,
    attack,
    defense,
    specialAttack: species?.baseStats.specialAttack ?? attack,
    specialDefense: species?.baseStats.specialDefense ?? defense,
    speed,
    statStages: createDefaultBattleStatStages(),
    typeIds: species?.typeIds ?? [0],
    status,
    frontSprite: assets.front,
    backSprite: assets.back,
    moves: pokemon.moves.map(toBattleMove),
  };
}

function toBattleMove(move: CompetitivePokemon["moves"][number]): BattleMove {
  const moveId = toNumericId(move.moveId) ?? 1;
  const view = getRuntimePokemonMoveDetails(moveId);
  const maxPp = view?.pp ?? Math.max(1, move.pp);

  return {
    id: moveId,
    name: view?.name ?? `Move #${moveId}`,
    pp: move.pp,
    maxPp,
    type: "normal",
    typeId: view?.typeId ?? 0,
    category: view?.category ?? "physical",
    effectCode: view?.effectCode ?? 0,
    accuracy: view?.accuracy ?? 100,
    power: view?.power ?? 0,
  };
}

function toNumericId(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
