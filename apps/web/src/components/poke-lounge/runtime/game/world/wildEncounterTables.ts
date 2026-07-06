import type { WildEncounterSlot } from "./wildEncounters";

export const DEFAULT_WILD_ENCOUNTER_TABLE_ID = "starter-field";
export const WILD_ENCOUNTER_TABLES_JSON_ASSET = [
  "wildEncounterTables",
  "/game-data/wild-encounter-tables.json",
] as const;

export interface WildEncounterTableData {
  version: number;
  defaultTableId: string;
  tables: WildEncounterTable[];
}

export interface WildEncounterTable {
  id: string;
  mapKeys: string[];
  areaIds?: string[];
  encounterRate?: number;
  slots: WildEncounterSlot[];
}

export function selectWildEncounterSlots(
  data: unknown,
  mapKey: string,
  areaId?: string | null,
): ReadonlyArray<WildEncounterSlot> | undefined {
  const tableData = normalizeWildEncounterTableData(data);

  if (!tableData) {
    return undefined;
  }

  const areaTable = areaId
    ? tableData.tables.find(
        table => table.mapKeys.includes(mapKey) && table.areaIds?.includes(areaId),
      )
    : undefined;
  const mapTable = tableData.tables.find(
    table => table.mapKeys.includes(mapKey) && !table.areaIds?.length,
  );
  const defaultTable = tableData.tables.find(table => table.id === tableData.defaultTableId);

  return areaTable?.slots ?? mapTable?.slots ?? defaultTable?.slots;
}

export function normalizeWildEncounterTableData(data: unknown): WildEncounterTableData | null {
  if (!isRecord(data) || data.version !== 1 || typeof data.defaultTableId !== "string") {
    return null;
  }

  if (!Array.isArray(data.tables)) {
    return null;
  }

  const tables = data.tables
    .map(normalizeWildEncounterTable)
    .filter((table): table is WildEncounterTable => table !== null);

  if (tables.length === 0) {
    return null;
  }

  return {
    version: 1,
    defaultTableId: data.defaultTableId,
    tables,
  };
}

function normalizeWildEncounterTable(data: unknown): WildEncounterTable | null {
  if (!isRecord(data) || typeof data.id !== "string" || data.id.length === 0) {
    return null;
  }

  if (!Array.isArray(data.slots)) {
    return null;
  }

  const slots = data.slots
    .map(normalizeWildEncounterSlot)
    .filter((slot): slot is WildEncounterSlot => slot !== null);

  if (slots.length === 0) {
    return null;
  }

  return {
    id: data.id,
    ...(Array.isArray(data.areaIds)
      ? { areaIds: data.areaIds.filter((areaId): areaId is string => typeof areaId === "string") }
      : {}),
    mapKeys: Array.isArray(data.mapKeys)
      ? data.mapKeys.filter((mapKey): mapKey is string => typeof mapKey === "string")
      : [],
    slots,
    ...(typeof data.encounterRate === "number" && Number.isFinite(data.encounterRate)
      ? { encounterRate: Math.max(0, Math.min(1, data.encounterRate)) }
      : {}),
  };
}

function normalizeWildEncounterSlot(data: unknown): WildEncounterSlot | null {
  if (!isRecord(data)) {
    return null;
  }

  if (
    typeof data.speciesId !== "number" ||
    !Number.isInteger(data.speciesId) ||
    data.speciesId < 1 ||
    typeof data.name !== "string" ||
    data.name.length === 0 ||
    typeof data.minLevel !== "number" ||
    !Number.isFinite(data.minLevel) ||
    typeof data.maxLevel !== "number" ||
    !Number.isFinite(data.maxLevel) ||
    typeof data.weight !== "number" ||
    !Number.isFinite(data.weight) ||
    data.weight <= 0
  ) {
    return null;
  }

  const minLevel = Math.max(1, Math.min(100, Math.round(data.minLevel)));
  const maxLevel = Math.max(1, Math.min(100, Math.round(data.maxLevel)));

  return {
    speciesId: data.speciesId,
    name: data.name,
    minLevel: Math.min(minLevel, maxLevel),
    maxLevel: Math.max(minLevel, maxLevel),
    weight: data.weight,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
