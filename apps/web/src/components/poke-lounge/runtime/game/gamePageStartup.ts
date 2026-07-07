import { loadBootstrapData } from "../bootstrap";
import { renderStarterSelectionScreen, type StarterSelectionOptions } from "../starter-selection";
import type { GameBootstrapData, StarterPokemon } from "../types";
import { bindPokeLoungeAudioPrimeListeners } from "./audio/poke-lounge-audio";
import { createPokeLoungeGame, type PokeLoungeGameResult } from "./createPokeLoungeGame";
import { loadRuntimeGameDataJson } from "./data/game-data-json";
import { readInitialBattleE2eScenario, readInitialGameScene } from "./gameStartup";
import { renderFullscreenToggle } from "./input/fullscreenToggle";
import { renderMobileTouchControls } from "./input/mobileTouchControls";
import { createMultiplayerRoom } from "./network/multiplayerRoomFactory";
import { readRoomEntryFromLocation } from "./network/roomEntry";
import { renderRoomEntryScreen, type RoomEntrySelection } from "./network/roomEntryScreen";
import { renderWebRtcSignalingPanel } from "./network/webRtcSignalingPanel";
import { createWebRtcRoom, isWebRtcRoom } from "./network/webRtcRoom";
import { getDefaultGameStateStore } from "./state/defaultGameStateStore";
import type { GameStateStore, PlayerPokemon } from "./state/gameStateStore";

type GamePageLocation = URL;
type PokeLoungeGameInstance = ReturnType<typeof createPokeLoungeGame>;

export interface GamePageHandle {
  destroy(): void;
}

export interface StartGamePageDependencies {
  createMultiplayerRoom?: typeof createMultiplayerRoom;
  createPokeLoungeGame?: typeof createPokeLoungeGame;
  gameStateStore?: GameStateStore;
  loadBootstrapData?: () => Promise<GameBootstrapData>;
  renderRoomEntryScreen?: typeof renderRoomEntryScreen;
  renderWebRtcSignalingPanel?: typeof renderWebRtcSignalingPanel;
  renderStarterSelectionScreen?: (
    mount: HTMLElement,
    bootstrap: GameBootstrapData,
    conversionDataOrManifest: null,
    options: StarterSelectionOptions,
  ) => void;
  onGameResult?: (result: PokeLoungeGameResult) => void;
}

export async function startGamePage(
  mount: HTMLElement,
  location: GamePageLocation,
  dependencies: StartGamePageDependencies = {},
): Promise<GamePageHandle> {
  const gameStateStore = dependencies.gameStateStore ?? getDefaultGameStateStore();
  const runtimeGameDataPromise = loadRuntimeGameDataJson();
  const initialScene = readInitialGameScene(location);
  const battleE2eScenario = readInitialBattleE2eScenario(location);
  const currentUrl = new URL(location.href);
  const renderEntryScreen = dependencies.renderRoomEntryScreen ?? renderRoomEntryScreen;
  const renderSelection = dependencies.renderStarterSelectionScreen ?? renderStarterSelectionScreen;
  let activeGame: PokeLoungeGameInstance | null = null;
  let activeMultiplayerRoom: ReturnType<typeof createMultiplayerRoom> | null = null;
  let destroyed = false;
  let roomEntrySelectionPending = false;
  let starterSelectionRequestId = 0;
  let removeAudioPrimeListeners: (() => void) | null = bindPokeLoungeAudioPrimeListeners(mount);

  const handle: GamePageHandle = {
    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      removeAudioPrimeListeners?.();
      removeAudioPrimeListeners = null;
      if (activeGame) {
        activeGame.destroy(true);
      } else {
        activeMultiplayerRoom?.dispose();
      }
      activeGame = null;
      activeMultiplayerRoom = null;
      gameStateStore.setSession({
        sessionId: null,
        roomId: null,
        connectionStatus: "offline",
      });
      mount.replaceChildren();
    },
  };

  const startGame = async (gameUrl: URL) => {
    await runtimeGameDataPromise;
    if (destroyed) {
      return;
    }

    const multiplayerRoom = (dependencies.createMultiplayerRoom ?? createMultiplayerRoom)({
      createWebRtcRoom,
      searchParams: gameUrl.searchParams,
    });
    const roomEntry = readRoomEntryFromLocation(gameUrl);
    activeMultiplayerRoom = multiplayerRoom;
    mount.innerHTML = "";
    const game = (dependencies.createPokeLoungeGame ?? createPokeLoungeGame)(mount, {
      ...(battleE2eScenario ? { battleE2eScenario } : {}),
      gameStateStore,
      initialScene,
      multiplayerRoom,
      onGameResult: dependencies.onGameResult,
    });
    activeGame = game;
    renderMobileTouchControls(mount);
    if (mount.classList.contains("has-touch-game-device")) {
      renderFullscreenToggle(mount, {
        className: "fullscreen-toggle-button--mobile",
        placement: "mobile",
      });
    }
    const returnToRoomEntry = () => {
      multiplayerRoom.dispose();
      gameStateStore.setSession({
        sessionId: null,
        roomId: null,
        connectionStatus: "offline",
      });
      currentUrl.searchParams.delete("create");
      currentUrl.searchParams.delete("network");
      currentUrl.searchParams.delete("room");
      replaceBrowserUrl(currentUrl);
      game?.destroy(true);
      if (activeGame === game) {
        activeGame = null;
      }
      if (activeMultiplayerRoom === multiplayerRoom) {
        activeMultiplayerRoom = null;
      }
      showRoomEntry();
    };

    if (
      roomEntry.mode === "local-room" ||
      roomEntry.mode === "server-room" ||
      roomEntry.mode === "webrtc"
    ) {
      renderRoomLeaveButton(mount, returnToRoomEntry);
    }

    if (isWebRtcRoom(multiplayerRoom)) {
      const renderSignalingPanel =
        dependencies.renderWebRtcSignalingPanel ?? renderWebRtcSignalingPanel;
      renderSignalingPanel(mount, multiplayerRoom, {
        onLeave: returnToRoomEntry,
      });
    }
  };
  const showStarterSelection = async (afterSelection: () => void) => {
    const requestId = (starterSelectionRequestId += 1);
    const bootstrap = await (dependencies.loadBootstrapData ?? loadBootstrapData)();
    if (destroyed || requestId !== starterSelectionRequestId) {
      return;
    }

    let completed = false;
    renderSelection(mount, bootstrap, null, {
      completeAfterSelection: true,
      onStarterSelect: starter => {
        if (destroyed || completed || requestId !== starterSelectionRequestId) {
          return;
        }

        completed = true;
        starterSelectionRequestId += 1;
        gameStateStore.setStarterPokemon(createStarterPlayerPokemon(starter));
        afterSelection();
      },
    });
  };
  const startGameAfterStarterSelection = (gameUrl: URL) => {
    if (!gameStateStore.canChooseStarter()) {
      void startGame(gameUrl);
      return;
    }

    void showStarterSelection(() => {
      void startGame(gameUrl);
    });
  };
  const showRoomEntry = () => {
    if (destroyed) {
      return;
    }

    roomEntrySelectionPending = false;
    renderEntryScreen(mount, {
      currentUrl: new URL(currentUrl.href),
      onSelect: selection => {
        if (destroyed || roomEntrySelectionPending) {
          return;
        }

        roomEntrySelectionPending = true;
        setRoomEntryScreenPending(mount);
        applyRoomEntrySelection(currentUrl, selection);
        replaceBrowserUrl(currentUrl);

        if (selection.resetSession) {
          gameStateStore.reset();
        }

        startGameAfterStarterSelection(currentUrl);
      },
    });
  };
  const continueToSelectedRoomOrEntry = () => {
    const roomEntry = readRoomEntryFromLocation(currentUrl);

    if (
      roomEntry.mode === "local-room" ||
      roomEntry.mode === "server-room" ||
      roomEntry.mode === "webrtc"
    ) {
      startGameAfterStarterSelection(currentUrl);
      return;
    }

    showRoomEntry();
  };

  continueToSelectedRoomOrEntry();
  return handle;
}

function applyRoomEntrySelection(url: URL, selection: RoomEntrySelection): void {
  if (selection.mode === "solo") {
    url.searchParams.delete("create");
    url.searchParams.delete("network");
    url.searchParams.delete("room");
    return;
  }

  if (selection.mode === "webrtc") {
    url.searchParams.delete("create");
    url.searchParams.set("network", "webrtc");
    url.searchParams.delete("room");
    return;
  }

  if (selection.mode === "server-room") {
    url.searchParams.set("network", "server");

    if (selection.createRoom) {
      url.searchParams.set("create", "1");
      url.searchParams.delete("room");
      return;
    }

    url.searchParams.delete("create");

    if (selection.roomCode) {
      url.searchParams.set("room", selection.roomCode);
    }

    return;
  }

  if (selection.roomCode) {
    url.searchParams.delete("create");
    url.searchParams.set("network", "local");
    url.searchParams.set("room", selection.roomCode);
  }
}

function replaceBrowserUrl(url: URL): void {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function setRoomEntryScreenPending(mount: HTMLElement): void {
  const screen = mount.querySelector<HTMLElement>("[data-room-entry-screen='true']");

  if (!screen) {
    return;
  }

  screen.dataset.roomEntryPending = "true";
  screen
    .querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input")
    .forEach(control => {
      control.disabled = true;
    });

  const message = screen.querySelector<HTMLElement>("[data-room-entry-message='true']");

  if (message) {
    message.textContent = "준비 중...";
  }
}

function renderRoomLeaveButton(mount: HTMLElement, onLeave: () => void): HTMLButtonElement {
  mount.querySelector("[data-room-leave]")?.remove();

  const button = document.createElement("button");
  button.type = "button";
  button.className = "room-leave-button";
  button.textContent = "방 나가기";
  button.setAttribute("data-room-leave", "true");
  button.addEventListener("click", onLeave);
  mount.appendChild(button);

  return button;
}

export function createStarterPlayerPokemon(starter: StarterPokemon, level = 10): PlayerPokemon {
  return {
    speciesId: starter.speciesId,
    name: starter.displayName,
    level,
  };
}
