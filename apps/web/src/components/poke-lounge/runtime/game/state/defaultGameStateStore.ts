import { createGameStateStore, type GameStateStore } from "./gameStateStore";
import {
  DEFAULT_GAME_STATE_STORAGE_KEY,
  createWebStorageGameStateStorage,
} from "./gameStateStorage";

let defaultGameStateStore: GameStateStore | null = null;

export function getDefaultGameStateStore(): GameStateStore {
  defaultGameStateStore ??= createGameStateStore({
    storage: createBrowserStorageAdapter(),
  });

  return defaultGameStateStore;
}

export function resetDefaultGameStateStoreForTest(): void {
  defaultGameStateStore = null;
}

function createBrowserStorageAdapter() {
  if (typeof window === "undefined") {
    return undefined;
  }

  window.localStorage?.removeItem(DEFAULT_GAME_STATE_STORAGE_KEY);

  if (!window.sessionStorage) {
    return undefined;
  }

  return createWebStorageGameStateStorage({
    storage: window.sessionStorage,
  });
}
