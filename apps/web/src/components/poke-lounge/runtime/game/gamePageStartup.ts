import { loadBootstrapData } from "../bootstrap";
import { renderStarterSelectionScreen, type StarterSelectionOptions } from "../starter-selection";
import type { GameBootstrapData, StarterPokemon } from "../types";
import { createPokeLoungeGame, type PokeLoungeGameResult } from "./createPokeLoungeGame";
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
): Promise<void> {
  const gameStateStore = dependencies.gameStateStore ?? getDefaultGameStateStore();
  const initialScene = readInitialGameScene(location);
  const battleE2eScenario = readInitialBattleE2eScenario(location);
  const currentUrl = new URL(location.href);
  const renderEntryScreen = dependencies.renderRoomEntryScreen ?? renderRoomEntryScreen;
  const renderSelection = dependencies.renderStarterSelectionScreen ?? renderStarterSelectionScreen;
  const startGame = (gameUrl: URL) => {
    const multiplayerRoom = (dependencies.createMultiplayerRoom ?? createMultiplayerRoom)({
      createWebRtcRoom,
      searchParams: gameUrl.searchParams,
    });
    const roomEntry = readRoomEntryFromLocation(gameUrl);
    mount.innerHTML = "";
    const game = (dependencies.createPokeLoungeGame ?? createPokeLoungeGame)(mount, {
      ...(battleE2eScenario ? { battleE2eScenario } : {}),
      gameStateStore,
      initialScene,
      multiplayerRoom,
      onGameResult: dependencies.onGameResult,
    });
    renderMobileTouchControls(mount);
    renderFullscreenToggle(mount);
    const returnToRoomEntry = () => {
      multiplayerRoom.dispose();
      gameStateStore.setSession({
        sessionId: null,
        roomId: null,
        connectionStatus: "offline",
      });
      currentUrl.searchParams.delete("network");
      currentUrl.searchParams.delete("room");
      replaceBrowserUrl(currentUrl);
      game?.destroy(true);
      showRoomEntry();
    };

    if (roomEntry.mode === "local-room" || roomEntry.mode === "webrtc") {
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
    const bootstrap = await (dependencies.loadBootstrapData ?? loadBootstrapData)();

    renderSelection(mount, bootstrap, null, {
      completeAfterSelection: true,
      onStarterSelect: starter => {
        gameStateStore.setStarterPokemon(createStarterPlayerPokemon(starter));
        afterSelection();
      },
    });
  };
  const showRoomEntry = () => {
    renderEntryScreen(mount, {
      currentUrl: new URL(currentUrl.href),
      onSelect: selection => {
        applyRoomEntrySelection(currentUrl, selection);
        replaceBrowserUrl(currentUrl);

        if (selection.resetSession) {
          gameStateStore.reset();
          void showStarterSelection(() => startGame(currentUrl));
          return;
        }

        startGame(currentUrl);
      },
    });
  };
  const continueAfterStarter = () => {
    const roomEntry = readRoomEntryFromLocation(currentUrl);

    if (roomEntry.mode === "local-room" || roomEntry.mode === "webrtc") {
      startGame(currentUrl);
      return;
    }

    showRoomEntry();
  };

  if (!gameStateStore.canChooseStarter()) {
    continueAfterStarter();
    return;
  }

  await showStarterSelection(continueAfterStarter);
}

function applyRoomEntrySelection(url: URL, selection: RoomEntrySelection): void {
  if (selection.mode === "solo") {
    url.searchParams.delete("network");
    url.searchParams.delete("room");
    return;
  }

  if (selection.mode === "webrtc") {
    url.searchParams.set("network", "webrtc");
    url.searchParams.delete("room");
    return;
  }

  if (selection.roomCode) {
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
