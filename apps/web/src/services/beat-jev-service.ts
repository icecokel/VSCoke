import { apiClient } from "@/lib/api-client";
import type { components } from "@/types/api";

export type GameId = components["schemas"]["BeatJevGameId"];
export type GameView = components["schemas"]["BeatJevGameViewDto"];
export type MatchSnapshot = components["schemas"]["BeatJevMatchDto"];
export type Side = GameView["turn"];
export type GameResult = NonNullable<GameView["result"]>;

export const gameIds = [
  "connect-four",
  "othello",
  "dots-and-boxes",
  "isolation",
  "battleship",
  "codebreaker",
  "yacht-dice",
  "dice-stop",
  "bomb-dodge",
  "blind-card",
] as const satisfies readonly GameId[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getBeatJevAvailability = async (): Promise<boolean> => {
  const status = await apiClient.get<unknown>("/beat-jev/status", {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!isRecord(status) || typeof status.enabled !== "boolean") {
    throw new Error("Invalid JEV status response");
  }
  return status.enabled;
};

const isGameId = (value: unknown): value is GameId =>
  typeof value === "string" && gameIds.some(gameId => gameId === value);

const isResult = (value: unknown): value is GameResult =>
  value === "PLAYER" || value === "JEV" || value === "DRAW";

const parseMatch = (value: unknown): MatchSnapshot => {
  if (!isRecord(value)) throw new Error("Invalid match response");
  const { id, revision, games, gameIndex, playerWins, jevWins, status, game, history } = value;
  if (
    typeof id !== "string" ||
    !Number.isInteger(revision) ||
    !Array.isArray(games) ||
    games.length !== 3 ||
    !games.every(gameId => gameId === null || isGameId(gameId)) ||
    !Number.isInteger(gameIndex) ||
    !Number.isInteger(playerWins) ||
    !Number.isInteger(jevWins) ||
    (status !== "PLAYING" && status !== "ROUND_END" && status !== "COMPLETE") ||
    !Array.isArray(history) ||
    !history.every(entry => isRecord(entry) && isGameId(entry.gameId) && isResult(entry.result))
  ) {
    throw new Error("Invalid match response");
  }
  if (
    !isRecord(game) ||
    !isGameId(game.gameId) ||
    (game.turn !== "PLAYER" && game.turn !== "JEV") ||
    (game.result !== null && !isResult(game.result)) ||
    !isRecord(game.data) ||
    !Array.isArray(game.legalActions) ||
    !game.legalActions.every(action => typeof action === "string")
  ) {
    throw new Error("Invalid game response");
  }
  return value as unknown as MatchSnapshot;
};

export const createBeatJevMatch = async (): Promise<MatchSnapshot> =>
  parseMatch(await apiClient.post<unknown>("/beat-jev/matches"));

export const getBeatJevMatch = async (id: string): Promise<MatchSnapshot> =>
  parseMatch(await apiClient.get<unknown>(`/beat-jev/matches/${encodeURIComponent(id)}`));

export const playBeatJevAction = async (
  id: string,
  revision: number,
  action: string,
): Promise<MatchSnapshot> =>
  parseMatch(
    await apiClient.post<unknown>(`/beat-jev/matches/${encodeURIComponent(id)}/actions`, {
      revision,
      action,
    }),
  );

export const continueBeatJevMatch = async (id: string, revision: number): Promise<MatchSnapshot> =>
  parseMatch(
    await apiClient.post<unknown>(`/beat-jev/matches/${encodeURIComponent(id)}/continue`, {
      revision,
    }),
  );

export const nextBeatJevGame = async (id: string, revision: number): Promise<MatchSnapshot> =>
  parseMatch(
    await apiClient.post<unknown>(`/beat-jev/matches/${encodeURIComponent(id)}/next`, {
      revision,
    }),
  );
