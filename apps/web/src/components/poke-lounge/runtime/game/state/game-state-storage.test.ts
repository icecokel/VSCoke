import assert from "node:assert/strict";
import test from "node:test";
import {
  ANONYMOUS_GAME_STATE_STORAGE_SCOPE,
  createWebStorageGameStateStorage,
} from "./gameStateStorage";
import { createAuthenticatedGameStateStorageScope } from "./defaultGameStateStore";
import { createDefaultLocalPlayer } from "./gameStateStore";

test("session storage save는 anonymous와 authenticated scope 사이에서 노출되지 않는다", () => {
  const storage = createMemoryStorage();
  let scope = ANONYMOUS_GAME_STATE_STORAGE_SCOPE;
  const adapter = createWebStorageGameStateStorage({
    storage,
    getScope: () => scope,
  });
  const anonymousPlayer = createDefaultLocalPlayer("anonymous-player");
  adapter.saveLocalPlayers({
    currentPlayerId: anonymousPlayer.playerId,
    playersById: { [anonymousPlayer.playerId]: anonymousPlayer },
  });

  const accountAScope = createAuthenticatedGameStateStorageScope("account-a");
  const accountBScope = createAuthenticatedGameStateStorageScope("account-b");
  scope = accountAScope;
  assert.equal(adapter.loadLocalPlayers(), null);

  const accountPlayer = createDefaultLocalPlayer("account-player");
  adapter.saveLocalPlayers({
    currentPlayerId: accountPlayer.playerId,
    playersById: { [accountPlayer.playerId]: accountPlayer },
  });
  assert.equal(adapter.loadLocalPlayers()?.currentPlayerId, "account-player");

  scope = accountBScope;
  assert.equal(adapter.loadLocalPlayers(), null);

  const accountBPlayer = createDefaultLocalPlayer("account-b-player");
  adapter.saveLocalPlayers({
    currentPlayerId: accountBPlayer.playerId,
    playersById: { [accountBPlayer.playerId]: accountBPlayer },
  });

  scope = accountAScope;
  assert.equal(adapter.loadLocalPlayers()?.currentPlayerId, "account-player");

  scope = ANONYMOUS_GAME_STATE_STORAGE_SCOPE;
  assert.equal(adapter.loadLocalPlayers()?.currentPlayerId, "anonymous-player");

  scope = accountBScope;
  assert.equal(adapter.loadLocalPlayers()?.currentPlayerId, "account-b-player");
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}
