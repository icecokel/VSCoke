import {
  APPROVED_COMPETITIVE_RULESET_V1,
  canUseCompetitiveStruggle,
  COMPETITIVE_STRUGGLE_MOVE_ID,
} from "@vscoke/poke-lounge-battle";
import type { CompetitiveAction, CompetitiveProjection } from "../network/localPreviewRoom";
import { createDefaultBattleStatStages } from "./battle-stat-stages";
import { getBattlePokemonAssets } from "./battlePokemonAssets";
import { normalizeIndividualValues } from "./individual-values";
import type {
  BattleMove,
  BattleParticipant,
  BattlePartySlot,
  BattlePokemon,
  BattleScreenState,
} from "./battleTypes";

type CompetitivePlayer = CompetitiveProjection["currentState"]["playersById"][string];
type CompetitivePokemon = CompetitivePlayer["team"][number];

const SPECIES_VIEW = {
  "vscoke-alpha": { speciesId: 155, name: "브케인" },
  "vscoke-beta": { speciesId: 152, name: "치코리타" },
} as const;

const MOVE_VIEW = {
  "steady-strike": { id: 1, name: "안정 타격" },
  "stun-spark": { id: 2, name: "마비 불꽃" },
  "heavy-blow": { id: 3, name: "강타" },
} as const;

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
    const activePokemon = player.team[player.activeSlotIndex];
    return Boolean(
      activePokemon &&
      activePokemon.currentHp > 0 &&
      typeof action.moveId === "string" &&
      (activePokemon.moves.some(move => move.moveId === action.moveId && move.pp > 0) ||
        (action.moveId === COMPETITIVE_STRUGGLE_MOVE_ID &&
          canUseCompetitiveStruggle(activePokemon.moves))),
    );
  }

  if (action.kind === "switch") {
    if (!Number.isSafeInteger(action.slotIndex)) {
      return false;
    }
    const slotIndex = action.slotIndex as number;
    const target = player.team[slotIndex];
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
      pokemon: player.team[slotIndex] ? toBattlePokemon(player.team[slotIndex]) : null,
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
  const species = getSpeciesView(pokemon.speciesId);
  const rules = species.rules;
  const assets = getBattlePokemonAssets(species.speciesId);
  const status =
    pokemon.currentHp <= 0 ? "fainted" : pokemon.status === "paralyzed" ? "paralyzed" : "normal";

  return {
    speciesId: species.speciesId,
    name: species.name,
    level: rules.level,
    catchRate: 0,
    baseExpYield: 0,
    growthRate: 1_000_000,
    experience: 0,
    baseStats: {
      hp: rules.maxHp,
      attack: rules.attack,
      defense: rules.defense,
      speed: rules.speed,
      special_attack: 80,
      special_defense: 80,
    },
    individualValues: normalizeIndividualValues({}, () => 0),
    maxHp: pokemon.maxHp,
    currentHp: pokemon.currentHp,
    attack: rules.attack,
    defense: rules.defense,
    specialAttack: 80,
    specialDefense: 80,
    speed: rules.speed,
    statStages: createDefaultBattleStatStages(),
    typeIds: [0],
    status,
    frontSprite: assets.front,
    backSprite: assets.back,
    moves: pokemon.moves.map(toBattleMove),
  };
}

function toBattleMove(move: CompetitivePokemon["moves"][number]): BattleMove {
  const view = getMoveView(move.moveId);
  const rules = view.rules;

  return {
    id: view.id,
    name: view.name,
    pp: move.pp,
    maxPp: rules.maxPp,
    type: "normal",
    typeId: 0,
    category: "physical",
    effectCode: 0,
    accuracy: Math.round(rules.accuracy * 100),
    power: rules.power,
  };
}

function getSpeciesView(speciesId: string) {
  if (speciesId === "vscoke-alpha" || speciesId === "vscoke-beta") {
    const rules = APPROVED_COMPETITIVE_RULESET_V1.loadout.find(
      candidate => candidate.speciesId === speciesId,
    );

    if (rules) {
      return { ...SPECIES_VIEW[speciesId], rules };
    }
  }
  throw new Error(`Unsupported competitive species: ${speciesId}`);
}

function getMoveView(moveId: string) {
  if (moveId === "steady-strike" || moveId === "stun-spark" || moveId === "heavy-blow") {
    return {
      ...MOVE_VIEW[moveId],
      rules: APPROVED_COMPETITIVE_RULESET_V1.moves[moveId],
    };
  }
  throw new Error(`Unsupported competitive move: ${moveId}`);
}
