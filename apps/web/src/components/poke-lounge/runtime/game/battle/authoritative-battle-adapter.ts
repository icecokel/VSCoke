import type { CompetitiveProjection } from "../network/localPreviewRoom";
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
  "steady-strike": { id: 1, name: "안정 타격", power: 40, accuracy: 100 },
  "stun-spark": { id: 2, name: "마비 불꽃", power: 30, accuracy: 90 },
  "heavy-blow": { id: 3, name: "강타", power: 60, accuracy: 80 },
} as const;

const MOVE_MAX_PP = {
  "steady-strike": 20,
  "stun-spark": 15,
  "heavy-blow": 10,
} as const;

export function toAuthoritativeBattleState(
  projection: CompetitiveProjection,
  ownPlayerId: string,
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
  const species =
    SPECIES_VIEW[pokemon.speciesId as keyof typeof SPECIES_VIEW] ?? SPECIES_VIEW["vscoke-alpha"];
  const assets = getBattlePokemonAssets(species.speciesId);
  const status =
    pokemon.currentHp <= 0 ? "fainted" : pokemon.status === "paralyzed" ? "paralyzed" : "normal";

  return {
    speciesId: species.speciesId,
    name: species.name,
    level: 50,
    catchRate: 0,
    baseExpYield: 0,
    growthRate: 1_000_000,
    experience: 0,
    baseStats: {
      hp: pokemon.maxHp,
      attack: 80,
      defense: 80,
      speed: 80,
      special_attack: 80,
      special_defense: 80,
    },
    individualValues: normalizeIndividualValues({}, () => 0),
    maxHp: pokemon.maxHp,
    currentHp: pokemon.currentHp,
    attack: 80,
    defense: 80,
    specialAttack: 80,
    specialDefense: 80,
    speed: 80,
    statStages: createDefaultBattleStatStages(),
    typeIds: [0],
    status,
    frontSprite: assets.front,
    backSprite: assets.back,
    moves: pokemon.moves.map(toBattleMove),
  };
}

function toBattleMove(move: CompetitivePokemon["moves"][number]): BattleMove {
  const view = MOVE_VIEW[move.moveId as keyof typeof MOVE_VIEW] ?? MOVE_VIEW["steady-strike"];
  const maxPp = MOVE_MAX_PP[move.moveId as keyof typeof MOVE_MAX_PP] ?? move.pp;

  return {
    id: view.id,
    name: view.name,
    pp: move.pp,
    maxPp,
    type: "normal",
    typeId: 0,
    category: "physical",
    effectCode: 0,
    accuracy: view.accuracy,
    power: view.power,
  };
}
