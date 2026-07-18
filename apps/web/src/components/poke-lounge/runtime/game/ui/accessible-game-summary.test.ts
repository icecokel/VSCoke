import assert from "node:assert/strict";
import test from "node:test";
import { createGameStateStore } from "../state/gameStateStore";
import { createAccessibleGameSummary } from "./accessible-game-summary";

test("접근성 요약은 솔로 파티의 HP와 기술 PP 및 랭킹 제외를 설명한다", () => {
  const store = createGameStateStore();
  store.setStarterPokemon({
    speciesId: 155,
    name: "브케인",
    level: 10,
    currentHp: 24,
    maxHp: 30,
    status: "normal",
    moves: [{ id: 33, name: "몸통박치기", pp: 31, maxPp: 35 }],
  });
  store.setSession({
    sessionId: "local-preview-session",
    roomId: "local-preview",
    connectionStatus: "online",
  });

  const summary = createAccessibleGameSummary(store.getState());

  assert.match(summary, /솔로 플레이/);
  assert.match(summary, /공개 랭킹 미반영/);
  assert.match(summary, /선두 브케인 레벨 10/);
  assert.match(summary, /HP 24\/30/);
  assert.match(summary, /몸통박치기 PP 31\/35/);
});
