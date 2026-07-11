import type { CompetitiveProjection } from "./localPreviewRoom";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const PLAYER_ID_MAX_LENGTH = 256;
const MAX_COMPETITIVE_PROJECTION_DEPTH = 6;
const MAX_COMPETITIVE_RECORD_KEYS = 16;
const MAX_COMPETITIVE_ARRAY_ITEMS = 2;

export const APPROVED_COMPETITIVE_LOADOUT = [
  {
    speciesId: "vscoke-alpha",
    maxHp: 120,
    moves: [
      { moveId: "steady-strike", maxPp: 20 },
      { moveId: "stun-spark", maxPp: 15 },
    ],
  },
  {
    speciesId: "vscoke-beta",
    maxHp: 140,
    moves: [
      { moveId: "steady-strike", maxPp: 20 },
      { moveId: "heavy-blow", maxPp: 10 },
    ],
  },
] as const;

type CompetitiveTerminal = NonNullable<CompetitiveProjection["terminal"]>;

export class CompetitiveProjectionSchemaError extends Error {
  constructor() {
    super("Poke Lounge competitive projection is malformed");
  }
}

export function parseCompetitiveProjection(value: unknown): CompetitiveProjection {
  const projection = requireRecord(
    value,
    [
      "assignmentRevision",
      "currentState",
      "currentTurn",
      "matchId",
      "playerIds",
      "rulesetHash",
      "rulesetVersion",
      "stateHash",
      "status",
      "submittedPlayerIds",
      "terminal",
    ],
    0,
  );
  const matchId = requireString(projection.matchId);
  const assignmentRevision = requireNonnegativeSafeInteger(projection.assignmentRevision);
  const currentTurn = requireNonnegativeSafeInteger(projection.currentTurn);
  const rulesetVersion = projection.rulesetVersion;
  const rulesetHash = requireHash(projection.rulesetHash);
  const stateHash = requireHash(projection.stateHash);
  const status = projection.status;
  const playerIds = parsePlayerIds(projection.playerIds);
  const submittedPlayerIds = parseSubmittedPlayerIds(projection.submittedPlayerIds, playerIds);

  if (!UUID_V4_PATTERN.test(matchId) || rulesetVersion !== 1 || !isCompetitiveStatus(status)) {
    throw schemaError();
  }

  const currentState = parseCurrentState(projection.currentState, playerIds, currentTurn);
  const terminal = parseTerminal(projection.terminal, playerIds, 1);
  const stateTerminal = parseTerminal(currentState.terminal, playerIds, 1);

  if (
    JSON.stringify(terminal) !== JSON.stringify(stateTerminal) ||
    (status === "completed") !== Boolean(terminal)
  ) {
    throw schemaError();
  }

  return {
    matchId,
    assignmentRevision,
    rulesetVersion,
    rulesetHash,
    currentTurn,
    status,
    playerIds,
    stateHash,
    currentState: { ...currentState, terminal },
    submittedPlayerIds,
    terminal,
  };
}

function parseCurrentState(
  value: unknown,
  playerIds: [string, string],
  currentTurn: number,
): CompetitiveProjection["currentState"] {
  const state = requireRecord(
    value,
    ["participantIds", "playersById", "rulesetVersion", "terminal", "turn"],
    1,
  );
  const participantIds = parsePlayerIds(state.participantIds);
  const turn = requireNonnegativeSafeInteger(state.turn);
  if (
    state.rulesetVersion !== 1 ||
    turn !== currentTurn ||
    participantIds[0] !== playerIds[0] ||
    participantIds[1] !== playerIds[1]
  ) {
    throw schemaError();
  }

  const playersById = requireRecord(state.playersById, playerIds, 2);
  const parsedPlayers = Object.fromEntries(
    playerIds.map(playerId => [playerId, parsePlayer(playersById[playerId], playerId)] as const),
  );

  return {
    rulesetVersion: 1,
    turn,
    participantIds,
    playersById: parsedPlayers,
    terminal: state.terminal as CompetitiveProjection["currentState"]["terminal"],
  };
}

function parsePlayer(
  value: unknown,
  expectedPlayerId: string,
): CompetitiveProjection["currentState"]["playersById"][string] {
  const player = requireRecord(value, ["activeSlotIndex", "playerId", "team"], 3);
  const playerId = requireString(player.playerId);
  const activeSlotIndex = requireNonnegativeSafeInteger(player.activeSlotIndex);
  if (
    playerId !== expectedPlayerId ||
    !Array.isArray(player.team) ||
    player.team.length !== APPROVED_COMPETITIVE_LOADOUT.length ||
    activeSlotIndex >= player.team.length
  ) {
    throw schemaError();
  }

  return {
    playerId,
    activeSlotIndex,
    team: player.team.map((pokemon, slotIndex) =>
      parsePokemon(pokemon, APPROVED_COMPETITIVE_LOADOUT[slotIndex]),
    ),
  };
}

function parsePokemon(
  value: unknown,
  approved: (typeof APPROVED_COMPETITIVE_LOADOUT)[number],
): CompetitiveProjection["currentState"]["playersById"][string]["team"][number] {
  const pokemon = requireRecord(value, ["currentHp", "maxHp", "moves", "speciesId", "status"], 4);
  const maxHp = requireNonnegativeSafeInteger(pokemon.maxHp);
  const currentHp = requireNonnegativeSafeInteger(pokemon.currentHp);
  if (
    pokemon.speciesId !== approved.speciesId ||
    maxHp !== approved.maxHp ||
    currentHp > maxHp ||
    (pokemon.status !== "none" && pokemon.status !== "paralyzed") ||
    !Array.isArray(pokemon.moves) ||
    pokemon.moves.length !== approved.moves.length
  ) {
    throw schemaError();
  }

  return {
    speciesId: approved.speciesId,
    maxHp,
    currentHp,
    status: pokemon.status,
    moves: pokemon.moves.map((move, index) => parseMove(move, approved.moves[index])),
  };
}

function parseMove(
  value: unknown,
  approved: (typeof APPROVED_COMPETITIVE_LOADOUT)[number]["moves"][number],
): CompetitiveProjection["currentState"]["playersById"][string]["team"][number]["moves"][number] {
  const move = requireRecord(value, ["moveId", "pp"], 5);
  const pp = requireNonnegativeSafeInteger(move.pp);
  if (move.moveId !== approved.moveId || pp > approved.maxPp) {
    throw schemaError();
  }

  return { moveId: approved.moveId, pp };
}

function parsePlayerIds(value: unknown): [string, string] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw schemaError();
  }
  const playerIds = value.map(requirePlayerId) as [string, string];
  if (playerIds[0] === playerIds[1]) {
    throw schemaError();
  }
  return playerIds;
}

function parseSubmittedPlayerIds(value: unknown, playerIds: [string, string]): string[] {
  if (!Array.isArray(value) || value.length > MAX_COMPETITIVE_ARRAY_ITEMS) {
    throw schemaError();
  }
  const submitted = value.map(requirePlayerId);
  if (
    new Set(submitted).size !== submitted.length ||
    submitted.some(playerId => !playerIds.includes(playerId))
  ) {
    throw schemaError();
  }
  return submitted;
}

function parseTerminal(
  value: unknown,
  playerIds: [string, string],
  depth: number,
): CompetitiveTerminal | null {
  if (value === null) {
    return null;
  }
  const terminal = requireRecord(
    value,
    ["loserPlayerId", "reason", "scoreByPlayerId", "winnerPlayerId"],
    depth,
  );
  const winnerPlayerId = requirePlayerId(terminal.winnerPlayerId);
  const loserPlayerId = requirePlayerId(terminal.loserPlayerId);
  const scoreByPlayerId = requireRecord(terminal.scoreByPlayerId, playerIds, depth + 1);
  if (
    winnerPlayerId === loserPlayerId ||
    !playerIds.includes(winnerPlayerId) ||
    !playerIds.includes(loserPlayerId) ||
    (terminal.reason !== "faint" &&
      terminal.reason !== "forfeit" &&
      terminal.reason !== "timeout") ||
    scoreByPlayerId[winnerPlayerId] !== 100 ||
    scoreByPlayerId[loserPlayerId] !== 50
  ) {
    throw schemaError();
  }

  return {
    winnerPlayerId,
    loserPlayerId,
    reason: terminal.reason,
    scoreByPlayerId: {
      [playerIds[0]]: scoreByPlayerId[playerIds[0]] as 50 | 100,
      [playerIds[1]]: scoreByPlayerId[playerIds[1]] as 50 | 100,
    },
  };
}

function requireRecord(
  value: unknown,
  exactKeys: readonly string[],
  depth: number,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw schemaError();
  }
  if (depth > MAX_COMPETITIVE_PROJECTION_DEPTH || exactKeys.length > MAX_COMPETITIVE_RECORD_KEYS) {
    throw schemaError();
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  const keys = Object.keys(value);
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    keys.length !== exactKeys.length ||
    keys.length > MAX_COMPETITIVE_RECORD_KEYS
  ) {
    throw schemaError();
  }
  keys.sort();
  const sortedExpectedKeys = [...exactKeys].sort();
  if (keys.some((key, index) => key !== sortedExpectedKeys[index])) {
    throw schemaError();
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw schemaError();
  }
  return value;
}

function requirePlayerId(value: unknown): string {
  const playerId = requireString(value);
  if (playerId.trim() !== playerId || playerId.length > PLAYER_ID_MAX_LENGTH) {
    throw schemaError();
  }
  return playerId;
}

function requireHash(value: unknown): string {
  const hash = requireString(value);
  if (!HASH_PATTERN.test(hash)) {
    throw schemaError();
  }
  return hash;
}

function requireNonnegativeSafeInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw schemaError();
  }
  return value as number;
}

function isCompetitiveStatus(value: unknown): value is CompetitiveProjection["status"] {
  return value === "pending" || value === "active" || value === "completed";
}

function schemaError(): Error {
  return new CompetitiveProjectionSchemaError();
}
