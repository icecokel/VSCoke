import { loadBootstrapData } from "../bootstrap";
import { renderStarterSelectionScreen, type StarterSelectionOptions } from "../starter-selection";
import type { GameBootstrapData, StarterPokemon } from "../types";
import { bindPokeLoungeAudioPrimeListeners } from "./audio/poke-lounge-audio";
import { createPokeLoungeGame, type PokeLoungeGameResult } from "./createPokeLoungeGame";
import { loadRuntimeGameDataJson } from "./data/game-data-json";
import { readInitialBattleE2eScenario, readInitialGameScene } from "./gameStartup";
import { createRandomIndividualValues } from "./battle/individual-values";
import {
  getBattleCameraZoom,
  resolveGameCanvasSize,
  type GameViewportDisplaySize,
} from "./gameViewport";
import { renderMobileSettingsToggle } from "./input/settings-toggle";
import { renderMobileTouchControls } from "./input/mobileTouchControls";
import {
  LOCAL_TEST_MODE_START_QUERY_PARAM,
  activateLocalTestMode,
  createLocalTestModeSoloUrl,
  createLocalTestModeStartUrl,
  deactivateLocalTestMode,
  loadLocalTestModeState,
  resolveLocalTestModeState,
  type LocalTestModeState,
} from "./local-test-mode";
import { createMultiplayerRoom } from "./network/multiplayerRoomFactory";
import {
  POKE_LOUNGE_FRESH_SESSION_REQUIRED_EVENT,
  POKE_LOUNGE_SERVER_ROOM_ERROR_EVENT,
  type PokeLoungeServerRoomErrorDetail,
} from "./network/serverRoom";
import {
  applyRoomRoundDurationSearchParam,
  readRoomEntryFromLocation,
  type RoomEntryMode,
} from "./network/roomEntry";
import {
  renderRoomEntryScreen,
  shouldResetRoomEntrySession,
  type RoomEntrySelection,
} from "./network/roomEntryScreen";
import { renderWebRtcSignalingPanel } from "./network/webRtcSignalingPanel";
import { createWebRtcRoom, isWebRtcRoom } from "./network/webRtcRoom";
import { getDefaultGameStateStore } from "./state/defaultGameStateStore";
import type { GameStateStore, PlayerPokemon } from "./state/gameStateStore";
import {
  dispatchPokeLoungeNotice,
  POKE_LOUNGE_ROOM_LEAVE_REQUEST_EVENT,
  type PokeLoungeRoomLeaveRequestDetail,
} from "./ui/poke-lounge-ui-events";
import { getPokeLoungeCopyForUrl, type PokeLoungeCopy } from "../../poke-lounge-copy";
import { getServerRoomErrorMessage } from "./server-room-error-copy";

type GamePageLocation = URL;
type PokeLoungeGameInstance = ReturnType<typeof createPokeLoungeGame>;

export interface GamePageHandle {
  destroy(): void;
  setViewportSize(viewportSize: GameViewportDisplaySize): void;
}

export interface StartGamePageDependencies {
  accountId?: string;
  activateLocalTestMode?: typeof activateLocalTestMode;
  createMultiplayerRoom?: typeof createMultiplayerRoom;
  createPokeLoungeGame?: typeof createPokeLoungeGame;
  deactivateLocalTestMode?: typeof deactivateLocalTestMode;
  gameStateStore?: GameStateStore;
  idToken?: string;
  localTestModeActive?: boolean;
  getIdToken?: () => string | undefined;
  loadBootstrapData?: () => Promise<GameBootstrapData>;
  loadLocalTestModeState?: typeof loadLocalTestModeState;
  renderRoomEntryScreen?: typeof renderRoomEntryScreen;
  renderWebRtcSignalingPanel?: typeof renderWebRtcSignalingPanel;
  renderStarterSelectionScreen?: (
    mount: HTMLElement,
    bootstrap: GameBootstrapData,
    conversionDataOrManifest: null,
    options: StarterSelectionOptions,
  ) => void;
  onGameResult?: (result: PokeLoungeGameResult) => void;
  viewportSize?: GameViewportDisplaySize;
}

export async function startGamePage(
  mount: HTMLElement,
  location: GamePageLocation,
  dependencies: StartGamePageDependencies = {},
): Promise<GamePageHandle> {
  const gameStateStore = dependencies.gameStateStore ?? getDefaultGameStateStore();
  const initialScene = readInitialGameScene(location);
  const battleE2eScenario = readInitialBattleE2eScenario(location);
  const currentUrl = new URL(location.href);
  const copy = getPokeLoungeCopyForUrl(currentUrl);
  const activateTestMode = dependencies.activateLocalTestMode ?? activateLocalTestMode;
  const deactivateTestMode = dependencies.deactivateLocalTestMode ?? deactivateLocalTestMode;
  const loadTestModeState = dependencies.loadLocalTestModeState ?? loadLocalTestModeState;
  const renderEntryScreen = dependencies.renderRoomEntryScreen ?? renderRoomEntryScreen;
  const renderSelection = dependencies.renderStarterSelectionScreen ?? renderStarterSelectionScreen;
  let runtimeGameDataPromise: Promise<void> | null = null;
  let activeGame: PokeLoungeGameInstance | null = null;
  let activeMultiplayerRoom: ReturnType<typeof createMultiplayerRoom> | null = null;
  let activeViewportSize = dependencies.viewportSize;
  let localTestModeState: LocalTestModeState = { available: false, active: false };
  let destroyed = false;
  let roomEntrySelectionPending = false;
  let starterSelectionRequestId = 0;
  let removeFreshSessionListener: (() => void) | null = null;
  let removeServerRoomErrorListener: (() => void) | null = null;
  let removeServerRoomStatusListener: (() => void) | null = null;
  let removeAudioPrimeListeners: (() => void) | null = bindPokeLoungeAudioPrimeListeners(mount);

  const loadRuntimeGameData = async () => {
    runtimeGameDataPromise ??= loadRuntimeGameDataJson();

    try {
      await runtimeGameDataPromise;
    } catch (error) {
      runtimeGameDataPromise = null;
      throw error;
    }
  };

  const handle: GamePageHandle = {
    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      removeAudioPrimeListeners?.();
      removeAudioPrimeListeners = null;
      removeFreshSessionListener?.();
      removeFreshSessionListener = null;
      removeServerRoomErrorListener?.();
      removeServerRoomErrorListener = null;
      removeServerRoomStatusListener?.();
      removeServerRoomStatusListener = null;
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
    setViewportSize(nextViewportSize: GameViewportDisplaySize) {
      activeViewportSize = nextViewportSize;
      if (!activeGame) {
        return;
      }

      const canvasSize = resolveGameCanvasSize(activeViewportSize);
      activeGame.scale.resize(canvasSize.width, canvasSize.height);
      activeGame.scene.getScenes(true).forEach(scene => {
        scene.cameras.main.setSize(canvasSize.width, canvasSize.height);
        if (scene.scene.key === "battle") {
          scene.cameras.main.setZoom(getBattleCameraZoom(canvasSize.width));
        }
      });
    },
  };

  const startGame = async (gameUrl: URL) => {
    await loadRuntimeGameData();
    if (destroyed) {
      return;
    }

    const roomEntry = readRoomEntryFromLocation(gameUrl);
    const multiplayerRoom = (dependencies.createMultiplayerRoom ?? createMultiplayerRoom)({
      accountId: dependencies.accountId,
      createWebRtcRoom,
      idToken: dependencies.idToken,
      getIdToken: dependencies.getIdToken,
      searchParams: gameUrl.searchParams,
    });
    const competitiveRoundsEnabled = isCompetitiveRoomEntryMode(roomEntry.mode);
    activeMultiplayerRoom = multiplayerRoom;
    mount.innerHTML = "";
    const game = (dependencies.createPokeLoungeGame ?? createPokeLoungeGame)(mount, {
      ...(battleE2eScenario ? { battleE2eScenario } : {}),
      competitiveRoundsEnabled,
      gameStateStore,
      initialScene,
      multiplayerRoom,
      onGameResult: roomEntry.mode === "server-room" ? undefined : dependencies.onGameResult,
      viewportSize: activeViewportSize,
    });
    activeGame = game;
    renderMobileTouchControls(mount);
    if (mount.classList.contains("has-touch-game-device")) {
      renderMobileSettingsToggle(mount);
    }
    const returnToRoomEntry = () => {
      removeFreshSessionListener?.();
      removeFreshSessionListener = null;
      removeServerRoomErrorListener?.();
      removeServerRoomErrorListener = null;
      removeServerRoomStatusListener?.();
      removeServerRoomStatusListener = null;
      multiplayerRoom.dispose();
      gameStateStore.setSession({
        sessionId: null,
        roomId: null,
        connectionStatus: "offline",
      });
      clearRoomEntrySearchParams(currentUrl);
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
    const leaveAndReturnToRoomEntry = () => {
      multiplayerRoom.leave?.();
      returnToRoomEntry();
    };
    const handleFreshSessionRequired = () => {
      dispatchPokeLoungeNotice(mount.ownerDocument, {
        message: copy.roomEntry.freshSession,
        tone: "warning",
      });
      returnToRoomEntry();
    };
    window.addEventListener(POKE_LOUNGE_FRESH_SESSION_REQUIRED_EVENT, handleFreshSessionRequired);
    removeFreshSessionListener = () => {
      window.removeEventListener(
        POKE_LOUNGE_FRESH_SESSION_REQUIRED_EVENT,
        handleFreshSessionRequired,
      );
    };
    const handleServerRoomError = (event: Event) => {
      const detail = (event as CustomEvent<PokeLoungeServerRoomErrorDetail>).detail;

      if (!detail || readRoomEntryFromLocation(gameUrl).mode !== "server-room") {
        return;
      }

      renderServerRoomError(mount, copy, detail);
    };
    window.addEventListener(POKE_LOUNGE_SERVER_ROOM_ERROR_EVENT, handleServerRoomError);
    removeServerRoomErrorListener = () => {
      window.removeEventListener(POKE_LOUNGE_SERVER_ROOM_ERROR_EVENT, handleServerRoomError);
    };
    removeServerRoomStatusListener = multiplayerRoom.on(
      "CONNECTION_STATUS",
      ({ connectionStatus }) => {
        if (connectionStatus === "online") {
          mount.querySelector("[data-server-room-error='true']")?.remove();
        }
      },
    );

    if (competitiveRoundsEnabled) {
      renderRoomLeaveButton(
        mount,
        leaveAndReturnToRoomEntry,
        () => {
          const phase = gameStateStore.getState().round.phase;

          if (phase === "tournament") {
            return {
              title: copy.roomEntry.leaveTournamentTitle,
              description: copy.roomEntry.leaveTournamentDescription,
            };
          }

          return {
            title: copy.roomEntry.leaveRoomTitle,
            description: copy.roomEntry.leaveRoomDescription,
          };
        },
        copy.roomEntry.leaveRoom,
      );
    }

    if (isWebRtcRoom(multiplayerRoom)) {
      const renderSignalingPanel =
        dependencies.renderWebRtcSignalingPanel ?? renderWebRtcSignalingPanel;
      renderSignalingPanel(mount, multiplayerRoom, {
        onLeave: leaveAndReturnToRoomEntry,
      });
    }
  };
  const showStartupError = (retry: () => void) => {
    if (destroyed) {
      return;
    }

    roomEntrySelectionPending = false;
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
    renderGameStartupError(mount, copy, {
      onRetry: retry,
      onReturnToEntry: () => {
        clearRoomEntrySearchParams(currentUrl);
        replaceBrowserUrl(currentUrl);
        showRoomEntry();
      },
    });
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
      void startGame(gameUrl).catch(() => {
        showStartupError(() => startGameAfterStarterSelection(gameUrl));
      });
      return;
    }

    void showStarterSelection(() => {
      void startGame(gameUrl).catch(() => {
        showStartupError(() => startGameAfterStarterSelection(gameUrl));
      });
    }).catch(() => {
      showStartupError(() => startGameAfterStarterSelection(gameUrl));
    });
  };
  const selectRoomEntry = (selection: RoomEntrySelection) => {
    if (destroyed || roomEntrySelectionPending) {
      return;
    }

    roomEntrySelectionPending = true;
    setRoomEntryScreenPending(mount, copy.roomEntry.preparing);
    applyRoomEntrySelection(currentUrl, selection);
    replaceBrowserUrl(currentUrl);

    if (shouldResetRoomEntrySession(selection)) {
      gameStateStore.reset();
    }

    startGameAfterStarterSelection(currentUrl);
  };
  const showRoomEntry = () => {
    if (destroyed) {
      return;
    }

    roomEntrySelectionPending = false;
    renderEntryScreen(mount, {
      currentUrl: new URL(currentUrl.href),
      localTestMode: localTestModeState.available
        ? {
            active: localTestModeState.active,
            onStart: () => {
              if (localTestModeState.active) {
                selectRoomEntry({
                  mode: "solo",
                  roomCode: null,
                  inviteUrl: null,
                });
                return;
              }

              if (destroyed || roomEntrySelectionPending) {
                return;
              }

              roomEntrySelectionPending = true;
              setRoomEntryScreenPending(mount, copy.roomEntry.preparing);
              void activateTestMode(currentUrl)
                .then(() => {
                  if (destroyed || typeof window === "undefined") {
                    return;
                  }

                  window.location.assign(createLocalTestModeStartUrl(currentUrl).href);
                })
                .catch(() => {
                  if (destroyed) {
                    return;
                  }

                  showRoomEntry();
                  dispatchPokeLoungeNotice(mount.ownerDocument, {
                    message: copy.roomEntry.localTestRequestFailed,
                    tone: "warning",
                  });
                });
            },
            onExit: () => {
              if (destroyed || roomEntrySelectionPending) {
                return;
              }

              roomEntrySelectionPending = true;
              setRoomEntryScreenPending(mount, copy.roomEntry.preparing);
              void deactivateTestMode(currentUrl)
                .then(() => {
                  if (destroyed || typeof window === "undefined") {
                    return;
                  }

                  const exitUrl = new URL(currentUrl.href);
                  clearRoomEntrySearchParams(exitUrl);
                  exitUrl.searchParams.delete(LOCAL_TEST_MODE_START_QUERY_PARAM);
                  window.location.assign(exitUrl.href);
                })
                .catch(() => {
                  if (destroyed) {
                    return;
                  }

                  showRoomEntry();
                  dispatchPokeLoungeNotice(mount.ownerDocument, {
                    message: copy.roomEntry.localTestRequestFailed,
                    tone: "warning",
                  });
                });
            },
          }
        : undefined,
      serverRoomCapability:
        dependencies.getIdToken?.() || dependencies.idToken || isLocalE2eUrl(currentUrl)
          ? { enabled: true }
          : {
              enabled: false,
              disabledReason: copy.roomEntry.serverDisabled,
            },
      onSelect: selectRoomEntry,
    });
  };
  const continueToSelectedRoomOrEntry = () => {
    const localTestModeStartRequested =
      currentUrl.searchParams.get(LOCAL_TEST_MODE_START_QUERY_PARAM) === "1";
    if (localTestModeStartRequested) {
      const soloUrl = createLocalTestModeSoloUrl(currentUrl);
      currentUrl.search = soloUrl.search;
      replaceBrowserUrl(currentUrl);

      if (localTestModeState.active) {
        startGameAfterStarterSelection(currentUrl);
      } else {
        showRoomEntry();
      }
      return;
    }

    if (currentUrl.searchParams.has(LOCAL_TEST_MODE_START_QUERY_PARAM)) {
      currentUrl.searchParams.delete(LOCAL_TEST_MODE_START_QUERY_PARAM);
      replaceBrowserUrl(currentUrl);
    }

    const roomEntry = readRoomEntryFromLocation(currentUrl);

    if (localTestModeState.active && isCompetitiveRoomEntryMode(roomEntry.mode)) {
      clearRoomEntrySearchParams(currentUrl);
      applyRoomRoundDurationSearchParam(currentUrl);
      replaceBrowserUrl(currentUrl);
      showRoomEntry();
      return;
    }

    if (roomEntry.mode === "server-room" && !dependencies.idToken && !isLocalE2eUrl(currentUrl)) {
      currentUrl.searchParams.delete("create");
      currentUrl.searchParams.delete("network");
      currentUrl.searchParams.delete("room");
      replaceBrowserUrl(currentUrl);
      dispatchPokeLoungeNotice(mount.ownerDocument, {
        message: copy.roomEntry.serverInviteRequiresLogin,
        tone: "warning",
      });
      showRoomEntry();
      return;
    }

    if (isCompetitiveRoomEntryMode(roomEntry.mode)) {
      startGameAfterStarterSelection(currentUrl);
      return;
    }

    showRoomEntry();
  };

  localTestModeState = resolveLocalTestModeState(
    await loadTestModeState(currentUrl),
    dependencies.localTestModeActive === true,
  );
  if (!destroyed) {
    continueToSelectedRoomOrEntry();
  }
  return handle;
}

function isLocalE2eUrl(url: URL): boolean {
  return (
    url.searchParams.has("e2e") &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1")
  );
}

function isCompetitiveRoomEntryMode(mode: RoomEntryMode): boolean {
  return mode === "local-room" || mode === "server-room" || mode === "webrtc";
}

function applyRoomEntrySelection(url: URL, selection: RoomEntrySelection): void {
  if (selection.mode === "solo") {
    url.searchParams.delete("create");
    url.searchParams.delete("network");
    url.searchParams.delete("room");
    applyRoomRoundDurationSearchParam(url);
    return;
  }

  if (selection.mode === "webrtc") {
    url.searchParams.delete("create");
    url.searchParams.set("network", "webrtc");
    url.searchParams.delete("room");
    applyRoomRoundDurationSearchParam(url);
    return;
  }

  if (selection.mode === "server-room") {
    url.searchParams.set("network", "server");
    applyRoomRoundDurationSearchParam(url, selection.roundDurationMs);

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
    applyRoomRoundDurationSearchParam(url, selection.roundDurationMs);
  }
}

function clearRoomEntrySearchParams(url: URL): void {
  url.searchParams.delete("create");
  url.searchParams.delete("network");
  url.searchParams.delete("room");
  url.searchParams.delete("serverPlayerId");
  url.searchParams.delete("serverSessionId");
}

function replaceBrowserUrl(url: URL): void {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function setRoomEntryScreenPending(mount: HTMLElement, messageText: string): void {
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
    message.textContent = messageText;
  }
}

function renderRoomLeaveButton(
  mount: HTMLElement,
  onLeave: () => void,
  getCopy: () => Pick<PokeLoungeRoomLeaveRequestDetail, "title" | "description">,
  label: string,
): HTMLButtonElement {
  mount.querySelector("[data-room-leave]")?.remove();

  const button = document.createElement("button");
  button.type = "button";
  button.className = "room-leave-button";
  button.textContent = label;
  button.setAttribute("data-room-leave", "true");
  button.addEventListener("click", () => {
    const detail: PokeLoungeRoomLeaveRequestDetail = {
      ...getCopy(),
      confirm: onLeave,
    };
    const request = new CustomEvent<PokeLoungeRoomLeaveRequestDetail>(
      POKE_LOUNGE_ROOM_LEAVE_REQUEST_EVENT,
      {
        cancelable: true,
        detail,
      },
    );

    mount.ownerDocument.dispatchEvent(request);
    if (!request.defaultPrevented) {
      onLeave();
    }
  });
  mount.appendChild(button);

  return button;
}

interface GameStartupErrorOptions {
  onRetry(): void;
  onReturnToEntry(): void;
}

export function renderGameStartupError(
  mount: HTMLElement,
  copy: PokeLoungeCopy,
  options: GameStartupErrorOptions,
): HTMLElement {
  const screen = createStartupErrorScreen(mount.ownerDocument, copy, copy.startup.description);
  const actions = screen.querySelector<HTMLElement>("[data-game-startup-error-actions='true']");
  const retryButton = createStartupErrorButton(
    mount.ownerDocument,
    copy.startup.retry,
    "data-game-startup-retry",
  );
  const returnButton = createStartupErrorButton(
    mount.ownerDocument,
    copy.startup.lobby,
    "data-game-startup-return",
  );

  retryButton.addEventListener("click", () => {
    retryButton.disabled = true;
    returnButton.disabled = true;
    retryButton.textContent = copy.startup.retrying;
    options.onRetry();
  });
  returnButton.addEventListener("click", options.onReturnToEntry);
  actions?.append(retryButton, returnButton);
  mount.replaceChildren(screen);
  retryButton.focus();

  return screen;
}

function renderServerRoomError(
  mount: HTMLElement,
  copy: PokeLoungeCopy,
  detail: PokeLoungeServerRoomErrorDetail,
): HTMLElement {
  mount.querySelector("[data-server-room-error='true']")?.remove();

  const screen = createStartupErrorScreen(
    mount.ownerDocument,
    copy,
    getServerRoomErrorMessage(copy.locale, detail.code),
  );
  screen.classList.add("game-server-error");
  screen.setAttribute("data-server-room-error", "true");
  screen.setAttribute("data-server-room-error-code", detail.code);
  const actions = screen.querySelector<HTMLElement>("[data-game-startup-error-actions='true']");

  if (detail.recoverable && detail.retry) {
    const retryButton = createStartupErrorButton(
      mount.ownerDocument,
      copy.startup.retry,
      "data-server-room-error-retry",
    );
    retryButton.addEventListener("click", () => {
      screen.remove();
      detail.retry?.();
    });
    actions?.appendChild(retryButton);
  }

  const returnButton = createStartupErrorButton(
    mount.ownerDocument,
    copy.startup.lobby,
    "data-server-room-error-return",
  );
  returnButton.addEventListener("click", detail.cancel);
  actions?.appendChild(returnButton);
  mount.appendChild(screen);
  screen.querySelector<HTMLButtonElement>("button")?.focus();

  return screen;
}

function createStartupErrorScreen(
  documentRef: Document,
  copy: PokeLoungeCopy,
  descriptionText: string,
): HTMLElement {
  const screen = documentRef.createElement("section");
  screen.className = "room-entry-screen game-startup-screen";
  screen.setAttribute("data-game-startup-error", "true");
  screen.setAttribute("role", "alert");
  screen.setAttribute("aria-live", "assertive");

  const panel = documentRef.createElement("div");
  panel.className = "room-entry-panel game-startup-panel";
  const title = documentRef.createElement("h1");
  title.textContent = copy.startup.title;
  const description = documentRef.createElement("p");
  description.className = "room-entry-mode-copy";
  description.textContent = descriptionText || copy.startup.description;
  const actions = documentRef.createElement("div");
  actions.className = "room-entry-mode-actions";
  actions.setAttribute("data-game-startup-error-actions", "true");
  panel.append(title, description, actions);
  screen.appendChild(panel);

  return screen;
}

function createStartupErrorButton(
  documentRef: Document,
  label: string,
  dataAttribute: string,
): HTMLButtonElement {
  const button = documentRef.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute(dataAttribute, "true");

  return button;
}

export function createStarterPlayerPokemon(starter: StarterPokemon, level = 10): PlayerPokemon {
  return {
    speciesId: starter.speciesId,
    name: starter.displayName,
    level,
    individualValues: createRandomIndividualValues(),
  };
}
