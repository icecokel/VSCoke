import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultGameState,
  createDefaultLocalPlayer,
  createGameStateStore,
  type PlayerPokemon,
} from "./gameStateStore";

const createPokemon = (
  speciesId: number,
  name: string,
  overrides: Partial<PlayerPokemon> = {},
): PlayerPokemon => ({
  speciesId,
  name,
  level: 10,
  currentHp: 30,
  maxHp: 30,
  status: "normal",
  ...overrides,
});

test("활성 슬롯은 기절한 박스 포켓몬과 교체하지 않는다", () => {
  const localPlayer = createDefaultLocalPlayer();
  localPlayer.party = [{ slotIndex: 0, pokemon: createPokemon(1, "이상해씨") }];
  localPlayer.pokemonBox = [createPokemon(2, "이상해풀", { currentHp: 0, status: "fainted" })];
  const defaultState = createDefaultGameState();
  const store = createGameStateStore({
    initialState: {
      ...defaultState,
      currentPlayerId: localPlayer.playerId,
      playersById: { [localPlayer.playerId]: localPlayer },
    },
  });

  assert.deepEqual(store.swapPartyPokemonWithBox(0, 0), {
    ok: false,
    reason: "fainted-active-replacement",
  });
  assert.equal(store.getCurrentLocalPlayer().party[0]?.pokemon?.name, "이상해씨");
  assert.equal(store.getCurrentLocalPlayer().pokemonBox[0]?.name, "이상해풀");
});

test("기절한 포켓몬도 비활성 파티 슬롯에는 교체할 수 있다", () => {
  const localPlayer = createDefaultLocalPlayer();
  localPlayer.party = [
    { slotIndex: 0, pokemon: createPokemon(1, "이상해씨") },
    { slotIndex: 1, pokemon: createPokemon(4, "파이리") },
  ];
  localPlayer.pokemonBox = [createPokemon(2, "이상해풀", { currentHp: 0, status: "fainted" })];
  const defaultState = createDefaultGameState();
  const store = createGameStateStore({
    initialState: {
      ...defaultState,
      currentPlayerId: localPlayer.playerId,
      playersById: { [localPlayer.playerId]: localPlayer },
    },
  });

  assert.deepEqual(store.swapPartyPokemonWithBox(1, 0), { ok: true });
  assert.equal(store.getCurrentLocalPlayer().party[1]?.pokemon?.name, "이상해풀");
  assert.equal(store.getCurrentLocalPlayer().activePartySlotIndex, 0);
});

test("지원 범위를 벗어난 포켓몬은 초기 파티와 PC에서 제거한다", () => {
  const localPlayer = createDefaultLocalPlayer();
  localPlayer.party = [
    { slotIndex: 0, pokemon: createPokemon(494, "알") },
    { slotIndex: 1, pokemon: createPokemon(493, "아르세우스") },
  ];
  localPlayer.activePartySlotIndex = 1;
  localPlayer.pokemonBox = [createPokemon(494, "알"), createPokemon(493, "아르세우스")];
  const defaultState = createDefaultGameState();
  const store = createGameStateStore({
    initialState: {
      ...defaultState,
      currentPlayerId: localPlayer.playerId,
      playersById: { [localPlayer.playerId]: localPlayer },
    },
  });

  assert.deepEqual(
    store.getCurrentLocalPlayer().party.map(slot => ({
      slotIndex: slot.slotIndex,
      speciesId: slot.pokemon?.speciesId,
    })),
    [{ slotIndex: 0, speciesId: 493 }],
  );
  assert.equal(store.getCurrentLocalPlayer().activePartySlotIndex, 0);
  assert.deepEqual(
    store.getCurrentLocalPlayer().pokemonBox.map(pokemon => pokemon.speciesId),
    [493],
  );
});
