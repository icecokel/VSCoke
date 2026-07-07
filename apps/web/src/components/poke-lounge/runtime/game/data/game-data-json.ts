export const LEVEL_UP_MOVE_TABLE_JSON_PATH = "/game-data/level-up-move-table.json";
export const WILD_BATTLE_MOVE_SETS_JSON_PATH = "/game-data/wild-battle-move-sets.json";
export const BATTLE_POKEMON_ASSETS_JSON_PATH = "/game-data/battle-pokemon-assets.json";

export interface LevelUpMoveRow {
  level: number;
  moveId: number;
}

export interface BattlePokemonSpriteAssetRecord {
  path: string;
  width: number;
  height: number;
}

export interface BattlePokemonAssetRecord {
  speciesId: number;
  front: BattlePokemonSpriteAssetRecord;
  back: BattlePokemonSpriteAssetRecord;
}

export interface BattlePokemonExtractedRangeRecord {
  startSpeciesId: number;
  endSpeciesId: number;
  front: BattlePokemonSpriteAssetRecordTemplate;
  back: BattlePokemonSpriteAssetRecordTemplate;
}

interface BattlePokemonSpriteAssetRecordTemplate {
  pathTemplate: string;
  width: number;
  height: number;
}

interface RuntimeGameDataJsonState {
  levelUpMoveTable: Record<number, LevelUpMoveRow[]> | null;
  wildBattleMoveSets: Record<number, number[]> | null;
  battlePokemonAssets: {
    species: Record<number, BattlePokemonAssetRecord>;
    extractedRanges: BattlePokemonExtractedRangeRecord[];
  } | null;
}

const runtimeGameDataJsonState: RuntimeGameDataJsonState = {
  levelUpMoveTable: null,
  wildBattleMoveSets: null,
  battlePokemonAssets: null,
};

export async function loadRuntimeGameDataJson(fetcher: typeof fetch = fetch): Promise<void> {
  const [levelUpMoveTable, wildBattleMoveSets, battlePokemonAssets] = await Promise.all([
    fetchJson(fetcher, LEVEL_UP_MOVE_TABLE_JSON_PATH),
    fetchJson(fetcher, WILD_BATTLE_MOVE_SETS_JSON_PATH),
    fetchJson(fetcher, BATTLE_POKEMON_ASSETS_JSON_PATH),
  ]);

  runtimeGameDataJsonState.levelUpMoveTable = normalizeLevelUpMoveTable(levelUpMoveTable);
  runtimeGameDataJsonState.wildBattleMoveSets = normalizeWildBattleMoveSets(wildBattleMoveSets);
  runtimeGameDataJsonState.battlePokemonAssets =
    normalizeBattlePokemonAssetManifest(battlePokemonAssets);
}

export function getRuntimeLevelUpMoveTable(
  fallbackTable: Record<number, LevelUpMoveRow[]>,
): Record<number, LevelUpMoveRow[]> {
  return runtimeGameDataJsonState.levelUpMoveTable ?? fallbackTable;
}

export function getRuntimeWildBattleMoveSets(
  fallbackMoveSets: Record<number, number[]>,
): Record<number, number[]> {
  return runtimeGameDataJsonState.wildBattleMoveSets ?? fallbackMoveSets;
}

export function getRuntimeBattlePokemonAssetManifest(input: {
  fallbackSpecies: Record<number, BattlePokemonAssetRecord>;
  fallbackExtractedRanges: BattlePokemonExtractedRangeRecord[];
}): {
  species: Record<number, BattlePokemonAssetRecord>;
  extractedRanges: BattlePokemonExtractedRangeRecord[];
} {
  return (
    runtimeGameDataJsonState.battlePokemonAssets ?? {
      species: input.fallbackSpecies,
      extractedRanges: input.fallbackExtractedRanges,
    }
  );
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

export function normalizeBattlePokemonAssetManifest(data: unknown): {
  species: Record<number, BattlePokemonAssetRecord>;
  extractedRanges: BattlePokemonExtractedRangeRecord[];
} | null {
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.species)) {
    return null;
  }

  const species = Object.entries(data.species).reduce<Record<number, BattlePokemonAssetRecord>>(
    (accumulator, [speciesIdKey, value]) => {
      const speciesId = readPositiveInteger(speciesIdKey);

      if (!speciesId) {
        return accumulator;
      }

      const normalized = normalizeBattlePokemonAssetRecord(speciesId, value);

      if (!normalized) {
        return accumulator;
      }

      accumulator[speciesId] = normalized;
      return accumulator;
    },
    {},
  );
  const extractedRanges = Array.isArray(data.extractedRanges)
    ? data.extractedRanges
        .map(normalizeBattlePokemonExtractedRangeRecord)
        .filter((range): range is BattlePokemonExtractedRangeRecord => range !== null)
    : [];

  if (Object.keys(species).length === 0 && extractedRanges.length === 0) {
    return null;
  }

  return { species, extractedRanges };
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

function normalizeBattlePokemonAssetRecord(
  speciesId: number,
  data: unknown,
): BattlePokemonAssetRecord | null {
  if (!speciesId || !isRecord(data)) {
    return null;
  }

  const front = normalizeBattlePokemonSpriteAssetRecord(data.front);
  const back = normalizeBattlePokemonSpriteAssetRecord(data.back);

  if (!front || !back) {
    return null;
  }

  return { speciesId, front, back };
}

function normalizeBattlePokemonExtractedRangeRecord(
  data: unknown,
): BattlePokemonExtractedRangeRecord | null {
  if (!isRecord(data)) {
    return null;
  }

  const startSpeciesId = readPositiveInteger(data.startSpeciesId);
  const endSpeciesId = readPositiveInteger(data.endSpeciesId);
  const front = normalizeBattlePokemonSpriteAssetRecordTemplate(data.front);
  const back = normalizeBattlePokemonSpriteAssetRecordTemplate(data.back);

  if (!startSpeciesId || !endSpeciesId || startSpeciesId > endSpeciesId || !front || !back) {
    return null;
  }

  return {
    startSpeciesId,
    endSpeciesId,
    front,
    back,
  };
}

function normalizeBattlePokemonSpriteAssetRecord(
  data: unknown,
): BattlePokemonSpriteAssetRecord | null {
  if (!isRecord(data)) {
    return null;
  }

  const path = typeof data.path === "string" && data.path.startsWith("/assets/") ? data.path : null;
  const width = readPositiveInteger(data.width);
  const height = readPositiveInteger(data.height);

  if (!path || !width || !height) {
    return null;
  }

  return { path, width, height };
}

function normalizeBattlePokemonSpriteAssetRecordTemplate(
  data: unknown,
): BattlePokemonSpriteAssetRecordTemplate | null {
  if (!isRecord(data)) {
    return null;
  }

  const pathTemplate =
    typeof data.pathTemplate === "string" && data.pathTemplate.startsWith("/assets/")
      ? data.pathTemplate
      : null;
  const width = readPositiveInteger(data.width);
  const height = readPositiveInteger(data.height);

  if (!pathTemplate || !width || !height) {
    return null;
  }

  return { pathTemplate, width, height };
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
