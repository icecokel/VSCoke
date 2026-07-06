import * as Phaser from "phaser";
import { resolveGameCanvasSize } from "./gameViewport";
import type { InitialGameScene } from "./gameStartup";
import { BootScene } from "./scenes/BootScene";
import { BattleScene, type BattleE2eScenario, type BattleE2eSnapshot } from "./scenes/BattleScene";
import { WorldScene } from "./scenes/WorldScene";
import type { MultiplayerRoom } from "./network/localPreviewRoom";
import { getDefaultGameStateStore } from "./state/defaultGameStateStore";
import type { GameState, GameStateStore } from "./state/gameStateStore";
import { isDevelopmentRuntime } from "../runtimeEnvironment";

declare global {
  interface Window {
    __POKE_LOUNGE_GAME__?: Phaser.Game;
    __POKE_LOUNGE_E2E__?: PokeLoungeE2eController;
  }
}

export interface PokeLoungeE2eController {
  getActiveSceneKey(): string | null;
  getBattleSnapshot(): BattleE2eSnapshot | null;
  setBattleScenario(scenario: BattleE2eScenario): BattleE2eSnapshot | null;
  setBattleCommand(command: BattleE2eSnapshot["selectedCommand"]): BattleE2eSnapshot | null;
  setBattleMoveIndex(index: number): BattleE2eSnapshot | null;
  confirmBattle(): BattleE2eSnapshot | null;
  drainBattleMessages(maxMessages?: number): BattleE2eSnapshot | null;
  getCanvasSnapshot(): {
    width: number;
    height: number;
    clientWidth: number;
    clientHeight: number;
  } | null;
  getGameStateSnapshot(): GameState;
  getRoomSnapshot(): {
    roomId: string | null;
    sessionId: string | null;
  };
}

export interface PokeLoungeGameOptions {
  initialScene?: InitialGameScene;
  battleE2eScenario?: BattleE2eScenario | null;
  gameStateStore?: GameStateStore;
  multiplayerRoom?: MultiplayerRoom;
}

export function createPokeLoungeGame(
  parent: HTMLElement,
  options: PokeLoungeGameOptions = {},
): Phaser.Game {
  const gameStateStore = options.gameStateStore ?? getDefaultGameStateStore();
  const parentRect = parent.getBoundingClientRect();
  const displaySize = {
    width: parent.clientWidth || parentRect.width,
    height: parent.clientHeight || parentRect.height,
  };
  const canvasSize = resolveGameCanvasSize(displaySize);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: canvasSize.width,
    height: canvasSize.height,
    backgroundColor: "#4A4242",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
      },
    },
    scene: [
      new BootScene(options.initialScene ?? "world", options.battleE2eScenario ?? null),
      new WorldScene(gameStateStore, options.multiplayerRoom),
      new BattleScene(gameStateStore),
    ],
  });

  if (shouldExposePokeLoungeE2eGlobals()) {
    window.__POKE_LOUNGE_GAME__ = game;
    window.__POKE_LOUNGE_E2E__ = createPokeLoungeE2eController(
      game,
      gameStateStore,
      options.multiplayerRoom,
    );
  }

  return game;
}

function shouldExposePokeLoungeE2eGlobals(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (isDevelopmentRuntime()) {
    return true;
  }

  const { hostname, search } = window.location;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1";

  return isLocalHost && new URLSearchParams(search).has("e2eBattle");
}

function createPokeLoungeE2eController(
  game: Phaser.Game,
  gameStateStore: GameStateStore,
  multiplayerRoom?: MultiplayerRoom,
): PokeLoungeE2eController {
  const getBattleScene = (): BattleScene | null => {
    const sceneManager = getSceneManager(game);
    const scene = sceneManager?.getScene("battle");

    return scene instanceof BattleScene ? scene : null;
  };

  const getBattleSnapshot = (): BattleE2eSnapshot | null =>
    getBattleScene()?.getE2eSnapshotForTest() ?? null;

  return {
    getActiveSceneKey() {
      const sceneManager = getSceneManager(game);
      const activeScene = sceneManager?.getScenes(true)[0];

      return activeScene?.scene.key ?? null;
    },
    getBattleSnapshot,
    setBattleScenario(scenario) {
      const battleScene = getBattleScene();

      if (!battleScene) {
        return null;
      }

      battleScene.setBattleScenarioForTest(scenario);
      return battleScene.getE2eSnapshotForTest();
    },
    setBattleCommand(command) {
      const battleScene = getBattleScene();

      if (!battleScene) {
        return null;
      }

      battleScene.setSelectedCommandForTest(command);
      return battleScene.getE2eSnapshotForTest();
    },
    setBattleMoveIndex(index) {
      const battleScene = getBattleScene();

      if (!battleScene) {
        return null;
      }

      battleScene.setSelectedMoveIndexForTest(index);
      return battleScene.getE2eSnapshotForTest();
    },
    confirmBattle() {
      const battleScene = getBattleScene();

      if (!battleScene) {
        return null;
      }

      battleScene.confirmSelectionForTest();
      return battleScene.getE2eSnapshotForTest();
    },
    drainBattleMessages(maxMessages = 20) {
      const battleScene = getBattleScene();

      if (!battleScene) {
        return null;
      }

      let snapshot = battleScene.getE2eSnapshotForTest();
      let remaining = Math.max(0, Math.floor(maxMessages));

      while (snapshot.message && remaining > 0) {
        battleScene.confirmSelectionForTest();
        snapshot = battleScene.getE2eSnapshotForTest();
        remaining -= 1;
      }

      return snapshot;
    },
    getCanvasSnapshot() {
      const canvas = (game as Phaser.Game & { canvas?: HTMLCanvasElement }).canvas;

      if (!canvas) {
        return null;
      }

      return {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
      };
    },
    getGameStateSnapshot() {
      return structuredClone(gameStateStore.getState());
    },
    getRoomSnapshot() {
      return {
        roomId: multiplayerRoom?.roomId ?? gameStateStore.getState().session.roomId,
        sessionId: multiplayerRoom?.sessionId ?? gameStateStore.getState().session.sessionId,
      };
    },
  };
}

function getSceneManager(game: Phaser.Game): Phaser.Scenes.SceneManager | null {
  const sceneManager = (
    game as Phaser.Game & {
      scene?: Phaser.Scenes.SceneManager;
    }
  ).scene;

  return sceneManager && typeof sceneManager.getScene === "function" ? sceneManager : null;
}
