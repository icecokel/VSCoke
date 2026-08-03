import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultGameState,
  createDefaultLocalPlayer,
  createGameStateStore,
} from "../state/gameStateStore";
import {
  createWorldSceneEncounters,
  type WorldSceneEncountersDependencies,
} from "./world-scene-encounters";

interface EncounterHarness {
  controller: ReturnType<typeof createWorldSceneEncounters>;
  getStartedBattle(): object | null;
  moveTo(position: { x: number; y: number }): void;
}

const createEncounterHarness = (
  hasTallGrassAt: WorldSceneEncountersDependencies["hasTallGrassAt"],
): EncounterHarness => {
  const player = createDefaultLocalPlayer();
  player.party = [
    {
      slotIndex: 0,
      pokemon: {
        speciesId: 152,
        name: "치코리타",
        level: 10,
        currentHp: 30,
        maxHp: 30,
        status: "normal",
      },
    },
  ];
  const defaultState = createDefaultGameState();
  const gameStateStore = createGameStateStore({
    initialState: {
      ...defaultState,
      currentPlayerId: player.playerId,
      playersById: {
        [player.playerId]: player,
      },
    },
  });
  let playerPosition = { x: 656, y: 446 };
  let startedBattle: object | null = null;

  const controller = createWorldSceneEncounters({
    gameStateStore,
    getPlayerPosition: () => playerPosition,
    getPlayerFacing: () => "front",
    hasTallGrassAt,
    stopPlayer: () => undefined,
    getLocationUrl: () => new URL("https://example.com/ko-KR/game/poke-lounge?wildEncounterRate=1"),
    getEncounterTableData: () => ({
      version: 1,
      defaultTableId: "test-field",
      tables: [
        {
          id: "test-field",
          mapKeys: ["town"],
          slots: [
            {
              speciesId: 1,
              name: "이상해씨",
              minLevel: 5,
              maxLevel: 5,
              weight: 1,
            },
          ],
        },
      ],
    }),
    getPokemonData: () => null,
    persistPlayerPosition: () => undefined,
    getViewportSize: () => ({ width: 800, height: 600 }),
    createRectangle: () => createRectangleStub(),
    shakeCamera: () => undefined,
    addTween: () => undefined,
    delay: (_ms, onComplete) => onComplete(),
    startBattle: data => {
      startedBattle = data;
    },
  });

  controller.initialize(playerPosition);

  return {
    controller,
    getStartedBattle: () => startedBattle,
    moveTo(position) {
      playerPosition = position;
    },
  };
};

test("일반 바닥에서 이동을 완료해도 야생 조우를 시작하지 않는다", () => {
  const harness = createEncounterHarness(() => false);

  harness.moveTo({ x: 688, y: 446 });
  harness.controller.afterMovement();

  assert.deepEqual(harness.controller.getE2eSnapshot(), {
    encounterLocked: false,
    battleIntroPlaying: false,
  });
  assert.equal(harness.getStartedBattle(), null);
});

test("긴 풀 타일에서 이동을 완료하면 야생 조우를 시작한다", () => {
  const harness = createEncounterHarness(tile => tile.x === 21 && tile.y === 13);

  harness.moveTo({ x: 688, y: 446 });
  harness.controller.afterMovement();

  assert.deepEqual(harness.controller.getE2eSnapshot(), {
    encounterLocked: true,
    battleIntroPlaying: true,
  });
  assert.ok(harness.getStartedBattle());
});

const createRectangleStub = (): ReturnType<WorldSceneEncountersDependencies["createRectangle"]> => {
  const rectangle = {
    destroy: () => undefined,
    setDepth: () => rectangle,
    setOrigin: () => rectangle,
    setScrollFactor: () => rectangle,
  };

  return rectangle as unknown as ReturnType<WorldSceneEncountersDependencies["createRectangle"]>;
};
