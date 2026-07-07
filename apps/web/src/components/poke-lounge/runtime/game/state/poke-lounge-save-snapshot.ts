import type { GameState, GameStateStore } from "./gameStateStore";

export const POKE_LOUNGE_SAVE_SNAPSHOT_VERSION = 1;

export interface PokeLoungeSaveSnapshot {
  version: typeof POKE_LOUNGE_SAVE_SNAPSHOT_VERSION;
  game: "poke-lounge";
  state: GameState;
}

export function buildPokeLoungeSaveSnapshot(
  gameStateStore: Pick<GameStateStore, "getState">,
): PokeLoungeSaveSnapshot {
  return {
    version: POKE_LOUNGE_SAVE_SNAPSHOT_VERSION,
    game: "poke-lounge",
    state: cloneJsonSerializableGameState(gameStateStore.getState()),
  };
}

function cloneJsonSerializableGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
