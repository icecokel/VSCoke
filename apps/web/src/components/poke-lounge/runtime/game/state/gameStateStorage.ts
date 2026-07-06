import type { GameStateStorage, LocalPlayersSaveState } from "./gameStateStore";

export const GAME_STATE_STORAGE_VERSION = 1;
export const DEFAULT_GAME_STATE_STORAGE_KEY = "poke-lounge:game-state";

export interface WebStorageGameStateStorageOptions {
  storage: Storage;
  key?: string;
}

interface SavedGameStatePayload {
  version: typeof GAME_STATE_STORAGE_VERSION;
  currentPlayerId: string;
  playersById: LocalPlayersSaveState["playersById"];
}

export function createWebStorageGameStateStorage({
  key = DEFAULT_GAME_STATE_STORAGE_KEY,
  storage,
}: WebStorageGameStateStorageOptions): GameStateStorage {
  return {
    loadLocalPlayers() {
      const rawValue = storage.getItem(key);

      if (!rawValue) {
        return null;
      }

      try {
        const payload = JSON.parse(rawValue) as Partial<SavedGameStatePayload>;

        if (
          payload.version !== GAME_STATE_STORAGE_VERSION ||
          !payload.currentPlayerId ||
          !payload.playersById
        ) {
          storage.removeItem(key);
          return null;
        }

        return {
          currentPlayerId: payload.currentPlayerId,
          playersById: payload.playersById,
        };
      } catch {
        storage.removeItem(key);
        return null;
      }
    },
    saveLocalPlayers({ currentPlayerId, playersById }) {
      const payload: SavedGameStatePayload = {
        version: GAME_STATE_STORAGE_VERSION,
        currentPlayerId,
        playersById,
      };

      storage.setItem(key, JSON.stringify(payload));
    },
    clear() {
      storage.removeItem(key);
    },
  };
}
