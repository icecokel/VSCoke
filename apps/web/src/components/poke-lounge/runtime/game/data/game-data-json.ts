import {
  MAX_SUPPORTED_POKEMON_SPECIES_ID,
  MIN_SUPPORTED_POKEMON_SPECIES_ID,
} from "../battle/pokemon-species";

export const LEVEL_UP_MOVE_TABLE_JSON_PATH = "/game-data/level-up-move-table.json";
export const WILD_BATTLE_MOVE_SETS_JSON_PATH = "/game-data/wild-battle-move-sets.json";
export const BATTLE_POKEMON_ASSETS_JSON_PATH = "/game-data/battle-pokemon-assets.json";
export const POKEMON_DATA_JSON_PATH = "/game-data/pokemon-data.json";
export const BATTLE_POKEMON_SPRITE_FRAME_SIZE = 80;
export const BATTLE_POKEMON_SPRITE_SHEET_GRID_SIZE = 16;

const BATTLE_POKEMON_ASSET_MANIFEST_VERSION = 2;

export interface LevelUpMoveRow {
  level: number;
  moveId: number;
}

export interface BattlePokemonSpriteSheetAssetRecord {
  path: string;
}

export interface BattlePokemonSpriteSheetRangeRecord {
  startSpeciesId: number;
  endSpeciesId: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  front: BattlePokemonSpriteSheetAssetRecord;
  back: BattlePokemonSpriteSheetAssetRecord;
}

interface RuntimeGameDataJsonState {
  pokemonDataRecordCount: number | null;
  levelUpMoveTable: Record<number, LevelUpMoveRow[]> | null;
  wildBattleMoveSets: Record<number, number[]> | null;
  battlePokemonAssets: { spriteSheetRanges: BattlePokemonSpriteSheetRangeRecord[] } | null;
}

const runtimeGameDataJsonState: RuntimeGameDataJsonState = {
  pokemonDataRecordCount: null,
  levelUpMoveTable: null,
  wildBattleMoveSets: null,
  battlePokemonAssets: null,
};

export async function loadRuntimeGameDataJson(fetcher: typeof fetch = fetch): Promise<void> {
  const [pokemonData, levelUpMoveTable, wildBattleMoveSets, battlePokemonAssets] =
    await Promise.all([
      fetchJson(fetcher, POKEMON_DATA_JSON_PATH),
      fetchJson(fetcher, LEVEL_UP_MOVE_TABLE_JSON_PATH),
      fetchJson(fetcher, WILD_BATTLE_MOVE_SETS_JSON_PATH),
      fetchJson(fetcher, BATTLE_POKEMON_ASSETS_JSON_PATH),
    ]);

  runtimeGameDataJsonState.pokemonDataRecordCount = normalizePokemonDataRecordCount(pokemonData);
  runtimeGameDataJsonState.levelUpMoveTable = normalizeLevelUpMoveTable(levelUpMoveTable);
  runtimeGameDataJsonState.wildBattleMoveSets = normalizeWildBattleMoveSets(wildBattleMoveSets);
  runtimeGameDataJsonState.battlePokemonAssets =
    normalizeBattlePokemonAssetManifest(battlePokemonAssets);
}

export function getRuntimeLevelUpMoveTable(
  fallbackTable: Record<number, LevelUpMoveRow[]>,
): Record<number, LevelUpMoveRow[]> {
  return runtimeGameDataJsonState.levelUpMoveTable
    ? {
        ...fallbackTable,
        ...runtimeGameDataJsonState.levelUpMoveTable,
      }
    : fallbackTable;
}

export function getRuntimeWildBattleMoveSets(
  fallbackMoveSets: Record<number, number[]>,
): Record<number, number[]> {
  return runtimeGameDataJsonState.wildBattleMoveSets
    ? {
        ...fallbackMoveSets,
        ...runtimeGameDataJsonState.wildBattleMoveSets,
      }
    : fallbackMoveSets;
}

export function getRuntimeBattlePokemonSpriteSheetRanges(
  fallbackRanges: BattlePokemonSpriteSheetRangeRecord[],
): BattlePokemonSpriteSheetRangeRecord[] {
  if (!runtimeGameDataJsonState.battlePokemonAssets) {
    return fallbackRanges;
  }

  return runtimeGameDataJsonState.battlePokemonAssets.spriteSheetRanges;
}

export function getRuntimePokemonDataRecordCountForTest(): number | null {
  return runtimeGameDataJsonState.pokemonDataRecordCount;
}

export function resetRuntimeGameDataJsonStateForTest(): void {
  runtimeGameDataJsonState.pokemonDataRecordCount = null;
  runtimeGameDataJsonState.levelUpMoveTable = null;
  runtimeGameDataJsonState.wildBattleMoveSets = null;
  runtimeGameDataJsonState.battlePokemonAssets = null;
}

export function normalizePokemonDataRecordCount(data: unknown): number | null {
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.species)) {
    return null;
  }

  const recordCount = Object.values(data.species).filter(value => {
    if (!isRecord(value)) {
      return false;
    }

    return readPositiveInteger(value.speciesId) !== null && isRecord(value.baseStats);
  }).length;

  return recordCount > 0 ? recordCount : null;
}

export function normalizeLevelUpMoveTable(data: unknown): Record<number, LevelUpMoveRow[]> | null {
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.species)) {
    return null;
  }

  const species = Object.entries(data.species).reduce<Record<number, LevelUpMoveRow[]>>(
    (accumulator, [speciesIdKey, value]) => {
      const speciesId = readPositiveInteger(speciesIdKey);
      const rows = normalizeLevelUpMoveRows(value);

      if (!speciesId || rows.length === 0) {
        return accumulator;
      }

      accumulator[speciesId] = rows;
      return accumulator;
    },
    {},
  );

  return Object.keys(species).length > 0 ? species : null;
}

export function normalizeWildBattleMoveSets(data: unknown): Record<number, number[]> | null {
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.species)) {
    return null;
  }

  const species = Object.entries(data.species).reduce<Record<number, number[]>>(
    (accumulator, [speciesIdKey, value]) => {
      const speciesId = readPositiveInteger(speciesIdKey);
      const moveIds = normalizeWildBattleMoveSet(value);

      if (!speciesId || moveIds.length === 0) {
        return accumulator;
      }

      accumulator[speciesId] = moveIds;
      return accumulator;
    },
    {},
  );

  return Object.keys(species).length > 0 ? species : null;
}

export function normalizeBattlePokemonAssetManifest(
  data: unknown,
): { spriteSheetRanges: BattlePokemonSpriteSheetRangeRecord[] } | null {
  if (
    !isRecord(data) ||
    data.version !== BATTLE_POKEMON_ASSET_MANIFEST_VERSION ||
    !Array.isArray(data.spriteSheetRanges)
  ) {
    return null;
  }

  const spriteSheetRanges = data.spriteSheetRanges
    .map(normalizeBattlePokemonSpriteSheetRangeRecord)
    .filter((range): range is BattlePokemonSpriteSheetRangeRecord => range !== null)
    .sort((left, right) => left.startSpeciesId - right.startSpeciesId);

  if (
    spriteSheetRanges.length === 0 ||
    spriteSheetRanges.length !== data.spriteSheetRanges.length ||
    !hasCompleteBattlePokemonSpriteSheetCoverage(spriteSheetRanges)
  ) {
    return null;
  }

  return { spriteSheetRanges };
}

function normalizeLevelUpMoveRows(data: unknown): LevelUpMoveRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const uniqueRows = new Map<string, LevelUpMoveRow>();

  for (const row of data) {
    if (!isRecord(row)) {
      continue;
    }

    const level = readPositiveInteger(row.level);
    const moveId = readPositiveInteger(row.moveId);

    if (!level || !moveId) {
      continue;
    }

    uniqueRows.set(`${level}:${moveId}`, { level, moveId });
  }

  return [...uniqueRows.values()].sort(
    (left, right) => left.level - right.level || left.moveId - right.moveId,
  );
}

function normalizeWildBattleMoveSet(data: unknown): number[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const moveIds: number[] = [];
  const seenMoveIds = new Set<number>();

  for (const value of data) {
    const moveId = readPositiveInteger(value);

    if (!moveId || seenMoveIds.has(moveId)) {
      continue;
    }

    moveIds.push(moveId);
    seenMoveIds.add(moveId);

    if (moveIds.length === 4) {
      break;
    }
  }

  return moveIds;
}

function normalizeBattlePokemonSpriteSheetRangeRecord(
  data: unknown,
): BattlePokemonSpriteSheetRangeRecord | null {
  if (!isRecord(data)) {
    return null;
  }

  const startSpeciesId = readPositiveInteger(data.startSpeciesId);
  const endSpeciesId = readPositiveInteger(data.endSpeciesId);
  const frameWidth = readPositiveInteger(data.frameWidth);
  const frameHeight = readPositiveInteger(data.frameHeight);
  const columns = readPositiveInteger(data.columns);
  const rows = readPositiveInteger(data.rows);
  const front = normalizeBattlePokemonSpriteSheetAssetRecord(data.front);
  const back = normalizeBattlePokemonSpriteSheetAssetRecord(data.back);

  if (
    !startSpeciesId ||
    !endSpeciesId ||
    !frameWidth ||
    !frameHeight ||
    !columns ||
    !rows ||
    frameWidth !== BATTLE_POKEMON_SPRITE_FRAME_SIZE ||
    frameHeight !== BATTLE_POKEMON_SPRITE_FRAME_SIZE ||
    columns !== BATTLE_POKEMON_SPRITE_SHEET_GRID_SIZE ||
    rows !== BATTLE_POKEMON_SPRITE_SHEET_GRID_SIZE ||
    startSpeciesId > endSpeciesId ||
    endSpeciesId - startSpeciesId + 1 > columns * rows ||
    !front ||
    !back
  ) {
    return null;
  }

  return {
    startSpeciesId,
    endSpeciesId,
    frameWidth,
    frameHeight,
    columns,
    rows,
    front,
    back,
  };
}

function normalizeBattlePokemonSpriteSheetAssetRecord(
  data: unknown,
): BattlePokemonSpriteSheetAssetRecord | null {
  if (!isRecord(data)) {
    return null;
  }

  const path = typeof data.path === "string" && data.path.startsWith("/assets/") ? data.path : null;

  if (!path) {
    return null;
  }

  return { path };
}

function readPositiveInteger(value: unknown): number | null {
  const candidate =
    typeof value === "string" && value.trim().length > 0 ? Number.parseInt(value, 10) : value;

  return typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0
    ? candidate
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasCompleteBattlePokemonSpriteSheetCoverage(
  ranges: BattlePokemonSpriteSheetRangeRecord[],
): boolean {
  if (
    ranges[0].startSpeciesId !== MIN_SUPPORTED_POKEMON_SPECIES_ID ||
    ranges[ranges.length - 1].endSpeciesId !== MAX_SUPPORTED_POKEMON_SPECIES_ID
  ) {
    return false;
  }

  return ranges.every(
    (range, index) => index === 0 || range.startSpeciesId === ranges[index - 1].endSpeciesId + 1,
  );
}

async function fetchJson(fetcher: typeof fetch, path: string): Promise<unknown> {
  try {
    const response = await fetcher(path);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}
