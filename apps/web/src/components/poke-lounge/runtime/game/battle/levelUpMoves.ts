import type { PlayerPokemon, PlayerPokemonMove } from "../state/gameStateStore";
import { getRuntimeLevelUpMoveTable } from "../data/game-data-json";
import { normalizeRomMoveRecord, type RomBattleMoveRecord } from "./battleRomData";
import type { BattleMove, BattlePokemon } from "./battleTypes";
import type { RomRefinedMoveCollection } from "./wildBattleFactory";

export const MAX_POKEMON_MOVE_COUNT = 4;

export interface LevelUpMoveDefinition {
  level: number;
  moveId: number;
  name: string;
}

export type LevelUpMoveChange<TMove> =
  | {
      kind: "learned";
      move: TMove;
    }
  | {
      kind: "replaced";
      move: TMove;
      replacedMove: TMove;
    };

export interface ApplyLevelUpMovesResult<TPokemon, TMove> {
  pokemon: TPokemon;
  changes: Array<LevelUpMoveChange<TMove>>;
  messages: string[];
}

interface ApplyMoveListLearningInput<TMove extends { id: number; name: string }> {
  pokemonName: string;
  moves: TMove[];
  moveDefinitions: LevelUpMoveDefinition[];
  createMove(moveId: number): TMove;
}

const MOVE_NAMES: Record<number, string> = {
  10: "할퀴기",
  16: "바람일으키기",
  22: "덩굴채찍",
  28: "모래뿌리기",
  33: "몸통박치기",
  39: "꼬리흔들기",
  43: "째려보기",
  44: "물기",
  45: "울음소리",
  52: "불꽃세례",
  55: "물대포",
  73: "씨뿌리기",
  75: "잎날가르기",
  77: "독가루",
  79: "수면가루",
  81: "실뿜기",
  98: "전광석화",
  99: "분노",
  108: "연막",
  115: "리플렉터",
  116: "기충전",
  145: "거품",
  172: "화염자동차",
  184: "겁나는얼굴",
  235: "광합성",
  345: "매지컬리프",
};

export const DEFAULT_LEVEL_UP_MOVE_TABLE: Record<number, LevelUpMoveDefinition[]> = {
  1: [
    moveAtLevel(3, 45),
    moveAtLevel(7, 73),
    moveAtLevel(9, 22),
    moveAtLevel(13, 77),
    moveAtLevel(13, 79),
  ],
  2: [
    moveAtLevel(3, 45),
    moveAtLevel(7, 73),
    moveAtLevel(9, 22),
    moveAtLevel(13, 77),
    moveAtLevel(13, 79),
  ],
  3: [
    moveAtLevel(3, 45),
    moveAtLevel(7, 73),
    moveAtLevel(9, 22),
    moveAtLevel(13, 77),
    moveAtLevel(13, 79),
  ],
  4: [moveAtLevel(7, 52), moveAtLevel(10, 108)],
  5: [moveAtLevel(7, 52), moveAtLevel(10, 108)],
  6: [moveAtLevel(7, 52), moveAtLevel(10, 108)],
  7: [moveAtLevel(7, 145), moveAtLevel(10, 55)],
  8: [moveAtLevel(7, 145), moveAtLevel(10, 55)],
  9: [moveAtLevel(7, 145), moveAtLevel(10, 55)],
  10: [moveAtLevel(1, 33), moveAtLevel(1, 81)],
  16: [moveAtLevel(5, 28), moveAtLevel(9, 16), moveAtLevel(13, 98)],
  19: [moveAtLevel(4, 98), moveAtLevel(7, 39), moveAtLevel(13, 116)],
  152: [
    moveAtLevel(6, 75),
    moveAtLevel(9, 77),
    moveAtLevel(12, 235),
    moveAtLevel(17, 115),
    moveAtLevel(20, 345),
  ],
  155: [moveAtLevel(6, 108), moveAtLevel(10, 52), moveAtLevel(13, 98), moveAtLevel(19, 172)],
  158: [moveAtLevel(6, 55), moveAtLevel(8, 99), moveAtLevel(13, 44), moveAtLevel(15, 184)],
};

export const LEVEL_UP_MOVE_TABLE = DEFAULT_LEVEL_UP_MOVE_TABLE;

export function getLevelUpMovesForSpecies(
  speciesId: number,
  previousLevel: number,
  currentLevel: number,
): LevelUpMoveDefinition[] {
  if (currentLevel <= previousLevel) {
    return [];
  }

  const levelUpMoveTable = getRuntimeLevelUpMoveTable(DEFAULT_LEVEL_UP_MOVE_TABLE);

  return (levelUpMoveTable[speciesId] ?? [])
    .filter(move => move.level > previousLevel && move.level <= currentLevel)
    .map(move => moveAtLevel(move.level, move.moveId));
}

export function createBattleMoveFromRom(
  moveId: number,
  moveRecords: RomRefinedMoveCollection,
): BattleMove {
  const normalized = normalizeRomMoveRecord(
    findMoveRecord(moveRecords, moveId),
    MOVE_NAMES[moveId] ?? `Move ${moveId}`,
  );

  return {
    id: normalized.id,
    name: normalized.name,
    pp: normalized.pp,
    maxPp: normalized.maxPp,
    type: normalized.typeName,
    typeId: normalized.typeId,
    category: normalized.category,
    effectCode: normalized.effectCode,
    accuracy: normalized.accuracy,
    power: normalized.power,
  };
}

export function createPlayerPokemonMoveFromRom(
  moveId: number,
  moveRecords: RomRefinedMoveCollection,
): PlayerPokemonMove {
  const move = createBattleMoveFromRom(moveId, moveRecords);

  return {
    id: move.id,
    name: move.name,
    pp: move.pp,
    maxPp: move.maxPp,
  };
}

export function applyLevelUpBattleMoves({
  pokemon,
  previousLevel,
  moveRecords,
}: {
  pokemon: BattlePokemon;
  previousLevel: number;
  moveRecords: RomRefinedMoveCollection;
}): ApplyLevelUpMovesResult<BattlePokemon, BattleMove> {
  const learning = applyMoveListLearning({
    pokemonName: pokemon.name,
    moves: pokemon.moves,
    moveDefinitions: getLevelUpMovesForSpecies(pokemon.speciesId, previousLevel, pokemon.level),
    createMove: moveId => createBattleMoveFromRom(moveId, moveRecords),
  });

  return {
    pokemon: {
      ...pokemon,
      moves: learning.moves,
    },
    changes: learning.changes,
    messages: learning.messages,
  };
}

export function applyLevelUpPlayerMoves({
  pokemon,
  previousLevel,
  moveRecords,
}: {
  pokemon: PlayerPokemon;
  previousLevel: number;
  moveRecords: RomRefinedMoveCollection;
}): ApplyLevelUpMovesResult<PlayerPokemon, PlayerPokemonMove> {
  const learning = applyMoveListLearning({
    pokemonName: pokemon.name,
    moves: pokemon.moves ?? [],
    moveDefinitions: getLevelUpMovesForSpecies(pokemon.speciesId, previousLevel, pokemon.level),
    createMove: moveId => createPlayerPokemonMoveFromRom(moveId, moveRecords),
  });

  return {
    pokemon: {
      ...pokemon,
      moves: learning.moves,
    },
    changes: learning.changes,
    messages: learning.messages,
  };
}

function applyMoveListLearning<TMove extends { id: number; name: string }>({
  pokemonName,
  moves: initialMoves,
  moveDefinitions,
  createMove,
}: ApplyMoveListLearningInput<TMove>): {
  moves: TMove[];
  changes: Array<LevelUpMoveChange<TMove>>;
  messages: string[];
} {
  let moves = initialMoves.slice(0, MAX_POKEMON_MOVE_COUNT);
  const changes: Array<LevelUpMoveChange<TMove>> = [];
  const messages: string[] = [];

  for (const definition of moveDefinitions) {
    if (moves.some(move => move.id === definition.moveId)) {
      continue;
    }

    const move = createMove(definition.moveId);

    if (moves.length < MAX_POKEMON_MOVE_COUNT) {
      moves = [...moves, move];
      changes.push({ kind: "learned", move });
      messages.push(formatLearnedMoveMessage(pokemonName, move.name));
      continue;
    }

    const [replacedMove, ...remainingMoves] = moves;

    if (!replacedMove) {
      moves = [move];
      changes.push({ kind: "learned", move });
      messages.push(formatLearnedMoveMessage(pokemonName, move.name));
      continue;
    }

    moves = [...remainingMoves, move];
    changes.push({ kind: "replaced", move, replacedMove });
    messages.push(formatReplacedMoveMessage(pokemonName, replacedMove.name, move.name));
  }

  return {
    moves,
    changes,
    messages,
  };
}

function moveAtLevel(level: number, moveId: number): LevelUpMoveDefinition {
  return {
    level,
    moveId,
    name: MOVE_NAMES[moveId] ?? `Move ${moveId}`,
  };
}

function findMoveRecord(collection: RomRefinedMoveCollection, moveId: number): RomBattleMoveRecord {
  const { moves } = collection;
  const record = Array.isArray(moves)
    ? moves.find(candidate => candidate.index === moveId)
    : moves[String(moveId)];

  if (!record) {
    throw new Error(`Missing ROM move record for move ${moveId}`);
  }

  return record;
}

function formatLearnedMoveMessage(pokemonName: string, moveName: string): string {
  return `${pokemonName}${topicParticle(pokemonName)} ${moveName}${objectParticle(moveName)} 배웠다!`;
}

function formatReplacedMoveMessage(
  pokemonName: string,
  replacedMoveName: string,
  moveName: string,
): string {
  return `${pokemonName}${topicParticle(pokemonName)} ${replacedMoveName}${objectParticle(replacedMoveName)} 잊고 ${moveName}${objectParticle(moveName)} 배웠다!`;
}

function topicParticle(value: string): "은" | "는" {
  return hasFinalConsonant(value) ? "은" : "는";
}

function objectParticle(value: string): "을" | "를" {
  return hasFinalConsonant(value) ? "을" : "를";
}

function hasFinalConsonant(value: string): boolean {
  const lastCharacter = value[value.length - 1];

  if (!lastCharacter) {
    return false;
  }

  const hangulOffset = lastCharacter.charCodeAt(0) - 0xac00;

  if (hangulOffset < 0 || hangulOffset > 11171) {
    return false;
  }

  return hangulOffset % 28 !== 0;
}
