import type { LocalPlayerState, PlayerPokemon, PlayerPokemonMove } from "../state/gameStateStore";
import { BATTLE_PARTY_SLOT_COUNT } from "./battleParty";
import { getBattlePokemonAssets } from "./battlePokemonAssets";
import type {
  BattleMove,
  BattleParticipant,
  BattlePartySlot,
  BattlePokemon,
  BattleScreenState,
} from "./battleTypes";
import type { Gen4BaseStats } from "./gen4PokemonStats";
import { createDefaultBattleStatStages } from "./battle-stat-stages";
import { normalizeIndividualValues } from "./individual-values";

export interface CreatePvpBattleStateInput {
  roundIndex: number;
  matchIndex: number;
  matchId?: string;
  player: LocalPlayerState;
  opponent: LocalPlayerState;
}

const DEFAULT_MOVE_TYPE = "normal";
const DEFAULT_MOVE_TYPE_ID = 0;
const DEFAULT_MOVE_POWER = 40;
const DEFAULT_MOVE_ACCURACY = 100;

export function createPvpBattleState({
  roundIndex,
  matchIndex,
  matchId,
  player,
  opponent,
}: CreatePvpBattleStateInput): BattleScreenState {
  return {
    battleKind: "trainer",
    phase: "intro",
    roundIndex,
    matchIndex,
    turn: 1,
    runAttemptCount: 0,
    player: createBattleParticipant(player, "Player"),
    opponent: createBattleParticipant(opponent, "Opponent"),
    messageQueue: [
      `${opponent.displayName}가 ${getActivePokemonName(opponent)}을 내보냈다!`,
      `가랏! ${getActivePokemonName(player)}!`,
    ],
    selectedMoveId: null,
    ...(matchId ? { tournamentMatchId: matchId } : {}),
    result: null,
  };
}

function createBattleParticipant(
  localPlayer: LocalPlayerState,
  participantLabel: "Player" | "Opponent",
): BattleParticipant {
  const party = createConvertedParty(localPlayer.party);
  const activePokemon = party.find(
    slot => slot.slotIndex === localPlayer.activePartySlotIndex,
  )?.pokemon;

  if (!activePokemon) {
    throw new Error(
      `${participantLabel} "${localPlayer.displayName}" has no active Pokemon in slot ${localPlayer.activePartySlotIndex}`,
    );
  }

  if (activePokemon.status === "fainted" || activePokemon.currentHp <= 0) {
    throw new Error(`${participantLabel} "${localPlayer.displayName}" active Pokemon has fainted`);
  }

  return {
    playerId: localPlayer.playerId,
    displayName: localPlayer.displayName,
    pokemon: activePokemon,
    party,
    activePartySlotIndex: localPlayer.activePartySlotIndex,
  };
}

function createConvertedParty(storedParty: LocalPlayerState["party"]): BattlePartySlot[] {
  return Array.from({ length: BATTLE_PARTY_SLOT_COUNT }, (_, slotIndex) => {
    const storedPokemon = storedParty.find(slot => slot.slotIndex === slotIndex)?.pokemon;

    return {
      slotIndex,
      pokemon: storedPokemon ? createBattlePokemon(storedPokemon) : null,
    };
  });
}

function createBattlePokemon(pokemon: PlayerPokemon): BattlePokemon {
  const maxHp = resolveMaxHp(pokemon);
  const currentHp = clampHp(pokemon.currentHp ?? maxHp, maxHp);
  const baseStats = createDefaultBaseStats(maxHp, pokemon.level);
  const individualValues = normalizeIndividualValues(pokemon.individualValues);
  const assets = getBattlePokemonAssets(pokemon.speciesId);

  return {
    speciesId: pokemon.speciesId,
    name: pokemon.name,
    level: pokemon.level,
    catchRate: 0,
    baseExpYield: 0,
    growthRate: pokemon.growthRate ?? 0,
    experience: pokemon.experience ?? 0,
    baseStats,
    individualValues,
    maxHp,
    currentHp,
    attack: baseStats.attack,
    defense: baseStats.defense,
    specialAttack: baseStats.special_attack,
    specialDefense: baseStats.special_defense,
    speed: baseStats.speed,
    statStages: createDefaultBattleStatStages(),
    typeIds: [DEFAULT_MOVE_TYPE_ID],
    status: currentHp <= 0 ? "fainted" : (pokemon.status ?? "normal"),
    frontSprite: assets.front,
    backSprite: assets.back,
    moves: pokemon.moves?.map(createBattleMove) ?? [],
  };
}

function resolveMaxHp(pokemon: PlayerPokemon): number {
  const levelBasedMaxHp = 20 + pokemon.level;

  return pokemon.maxHp ?? Math.max(levelBasedMaxHp, pokemon.currentHp ?? 0);
}

function clampHp(currentHp: number, maxHp: number): number {
  return Math.max(0, Math.min(maxHp, Math.trunc(Number.isFinite(currentHp) ? currentHp : maxHp)));
}

function createDefaultBaseStats(maxHp: number, level: number): Gen4BaseStats {
  const defaultStat = Math.max(1, level);

  return {
    hp: maxHp,
    attack: defaultStat,
    defense: defaultStat,
    special_attack: defaultStat,
    special_defense: defaultStat,
    speed: defaultStat,
  };
}

function createBattleMove(move: PlayerPokemonMove): BattleMove {
  return {
    id: move.id,
    name: move.name,
    pp: move.pp,
    maxPp: move.maxPp,
    type: DEFAULT_MOVE_TYPE,
    typeId: DEFAULT_MOVE_TYPE_ID,
    category: "physical",
    effectCode: 0,
    accuracy: DEFAULT_MOVE_ACCURACY,
    power: DEFAULT_MOVE_POWER,
  };
}

function getActivePokemonName(localPlayer: LocalPlayerState): string {
  return (
    localPlayer.party.find(slot => slot.slotIndex === localPlayer.activePartySlotIndex)?.pokemon
      ?.name ?? localPlayer.displayName
  );
}
