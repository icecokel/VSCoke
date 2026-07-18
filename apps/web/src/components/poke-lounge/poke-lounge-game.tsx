"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGame } from "@/contexts/game-context";
import { getSessionApiIdToken, isAuthSessionError, type ApiTokenSession } from "@/lib/auth-token";
import { getGameRanking, submitScore, type GameHistory } from "@/services/score-service";
import { loadPokeLoungeState } from "@/services/poke-lounge-state-service";
import {
  createPokeLoungeAutosaveLifecycle,
  getPokeLoungeTokenLifecycle,
  startPokeLoungeAutosave,
  type PokeLoungeAutosaveStatus,
} from "./poke-lounge-autosave";
import { usePokeLoungeAccessibleStatus } from "./use-poke-lounge-accessible-status";
import { setPokeLoungeMasterVolume } from "./runtime/game/audio/poke-lounge-audio";
import { getDefaultGameStateStore } from "./runtime/game/state/defaultGameStateStore";
import { detectTouchGameDevice } from "./runtime/game/input/mobileTouchControls";
import { GAME_SETTINGS_OPEN_EVENT } from "./runtime/game/input/settings-toggle";
import {
  GAME_VIEWPORT_SIZE_PRESETS,
  type GameViewportDisplaySize,
  type GameViewportSizePreset,
} from "./runtime/game/gameViewport";
import {
  GAME_FULLSCREEN_STATE_EVENT,
  isGameFullscreenActive,
  toggleGameFullscreen,
} from "./runtime/web-fullscreen";
import {
  POKE_LOUNGE_NOTICE_EVENT,
  POKE_LOUNGE_ROOM_LEAVE_REQUEST_EVENT,
  type PokeLoungeNoticeDetail,
  type PokeLoungeRoomLeaveRequestDetail,
} from "./runtime/game/ui/poke-lounge-ui-events";
import styles from "./poke-lounge.module.css";

type PokeLoungeWindow = Window & {
  __POKE_LOUNGE_GAME__?: { destroy: (removeCanvas?: boolean) => void };
  __POKE_LOUNGE_CLEANUP_FOR_TEST__?: () => void;
  __POKE_LOUNGE_E2E__?: unknown;
};

interface FinalResultState {
  score: number;
  playTime: number;
}

const POKE_LOUNGE_VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;
const POKE_LOUNGE_CONTAINER_WIDTH_VAR = "--poke-lounge-container-width";
const POKE_LOUNGE_CONTAINER_HEIGHT_VAR = "--poke-lounge-container-height";
const POKE_LOUNGE_VOLUME_STORAGE_KEY = "poke-lounge:volume-level";
const POKE_LOUNGE_UI_SIZE_STORAGE_KEY = "poke-lounge:ui-size";
const OPEN_MODAL_DIALOG_SELECTOR = [
  "dialog[open]",
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
].join(",");

type PokeLoungeUiSize = GameViewportSizePreset;
type PokeLoungeGamePageHandle = {
  destroy(): void;
  setViewportSize(viewportSize: GameViewportDisplaySize): void;
};
type PokeLoungeRoomShareStatus = "idle" | "success" | "error";
type PokeLoungeStateHydrationStatus = "pending" | "ready" | "unavailable";
type PokeLoungeRankingStatus = "idle" | "loading" | "ready" | "error";
type PokeLoungeConnectionSummary = {
  connectionStatus: "offline" | "connecting" | "online";
  roomId: string | null;
};

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function hasOpenModalDialog(ownerDocument: Document): boolean {
  return ownerDocument.querySelector(OPEN_MODAL_DIALOG_SELECTOR) !== null;
}

function createPokeLoungeRoomShareUrlFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return createPokeLoungeRoomShareUrl(new URL(window.location.href));
}

function createPokeLoungeRoomShareUrl(currentUrl: URL): string | null {
  const network = currentUrl.searchParams.get("network");
  const roomCode = currentUrl.searchParams.get("room");

  if ((network !== "local" && network !== "server") || !roomCode) {
    return null;
  }

  const shareUrl = new URL(currentUrl.href);
  shareUrl.searchParams.set("network", network);
  shareUrl.searchParams.set("room", roomCode);
  shareUrl.searchParams.delete("create");
  shareUrl.searchParams.delete("e2e");
  shareUrl.searchParams.delete("e2eBattle");
  shareUrl.searchParams.delete("scene");

  return shareUrl.href;
}

function readStoredVolumeLevelIndex(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const parsed = Number.parseInt(
    window.sessionStorage.getItem(POKE_LOUNGE_VOLUME_STORAGE_KEY) ?? "",
    10,
  );

  return Number.isInteger(parsed) && parsed >= 0 && parsed < POKE_LOUNGE_VOLUME_STEPS.length
    ? parsed
    : null;
}

function readStoredUiSize(): PokeLoungeUiSize | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem(POKE_LOUNGE_UI_SIZE_STORAGE_KEY);
  return stored === "normal" || stored === "large" ? stored : null;
}

function getRankingDisplayName(entry: GameHistory): string {
  return entry.user.displayName.trim() || "이름 없는 트레이너";
}

export function PokeLoungeGame() {
  const { setGamePlaying } = useGame();
  const { data: session, status } = useSession();
  const accessibleGameStatus = usePokeLoungeAccessibleStatus();
  const pageRef = useRef<HTMLElement>(null);
  const gamePageHandleRef = useRef<PokeLoungeGamePageHandle | null>(null);
  const startedAtMsRef = useRef(Date.now());
  const isUnmountingRef = useRef(false);
  const tokenLifecycle = getPokeLoungeTokenLifecycle();
  const [finalResult, setFinalResult] = useState<FinalResultState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [touchGameDevice, setTouchGameDevice] = useState(false);
  const [gameCanvasMounted, setGameCanvasMounted] = useState(false);
  const [volumeLevelIndex, setVolumeLevelIndex] = useState(POKE_LOUNGE_VOLUME_STEPS.length - 1);
  const [uiSize, setUiSize] = useState<PokeLoungeUiSize>("large");
  const [roomShareStatus, setRoomShareStatus] = useState<PokeLoungeRoomShareStatus>("idle");
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "submitting" | "success" | "auth" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState<string>("");
  const [stateHydrationStatus, setStateHydrationStatus] =
    useState<PokeLoungeStateHydrationStatus>("pending");
  const [stateHydrationMessage, setStateHydrationMessage] = useState("");
  const [stateHydrationAttempt, setStateHydrationAttempt] = useState(0);
  const [hydratedToken, setHydratedToken] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<PokeLoungeAutosaveStatus>("idle");
  const [connectionSummary, setConnectionSummary] = useState<PokeLoungeConnectionSummary>({
    connectionStatus: "offline",
    roomId: null,
  });
  const [leaveRequest, setLeaveRequest] = useState<PokeLoungeRoomLeaveRequestDetail | null>(null);
  const [notice, setNotice] = useState<PokeLoungeNoticeDetail | null>(null);
  const [rankingStatus, setRankingStatus] = useState<PokeLoungeRankingStatus>("idle");
  const [rankingAttempt, setRankingAttempt] = useState(0);
  const [ranking, setRanking] = useState<GameHistory[]>([]);
  const volumeValue = POKE_LOUNGE_VOLUME_STEPS[volumeLevelIndex];
  const volumePercent = Math.round(volumeValue * 100);
  const volumeLabel = volumePercent === 0 ? "소리 꺼짐" : `소리 ${volumePercent}%`;
  const uiSizeLabel = uiSize === "large" ? "UI 크게" : "UI 보통";
  const roomShareUrl = settingsOpen ? createPokeLoungeRoomShareUrlFromLocation() : null;
  const multiplayerRoomId =
    connectionSummary.roomId && connectionSummary.roomId !== "local-preview"
      ? connectionSummary.roomId
      : null;
  const connectionLabel =
    connectionSummary.connectionStatus === "online"
      ? "방 연결됨"
      : connectionSummary.connectionStatus === "connecting"
        ? "방 연결 중"
        : "방 연결 끊김";
  const autosaveLabel =
    status !== "authenticated"
      ? "현재 탭에 자동 저장"
      : autosaveStatus === "saving"
        ? "계정에 저장 중"
        : autosaveStatus === "error"
          ? "저장 실패 · 재시도 대기"
          : autosaveStatus === "pending"
            ? "변경사항 저장 대기"
            : autosaveStatus === "saved"
              ? "계정에 저장됨"
              : "계정 저장 준비됨";

  const syncFullscreenState = useCallback(() => {
    const page = pageRef.current;
    setFullscreenActive(page ? isGameFullscreenActive(page) : false);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    const page = pageRef.current;
    if (!page) {
      return;
    }

    void toggleGameFullscreen(page).finally(syncFullscreenState);
  }, [syncFullscreenState]);

  const handleVolumeCycle = useCallback(() => {
    setVolumeLevelIndex(currentIndex => (currentIndex + 1) % POKE_LOUNGE_VOLUME_STEPS.length);
  }, []);

  const handleUiSizeToggle = useCallback(() => {
    setUiSize(currentSize => (currentSize === "large" ? "normal" : "large"));
  }, []);

  const handleRoomShare = useCallback(async () => {
    const shareUrl = createPokeLoungeRoomShareUrlFromLocation();

    if (!shareUrl || !navigator.clipboard?.writeText) {
      setRoomShareStatus("error");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setRoomShareStatus("success");
    } catch {
      setRoomShareStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!settingsOpen) {
      setRoomShareStatus("idle");
    }
  }, [settingsOpen]);

  useEffect(() => {
    const storedVolumeLevelIndex = readStoredVolumeLevelIndex();
    const storedUiSize = readStoredUiSize();

    if (storedVolumeLevelIndex !== null) {
      setVolumeLevelIndex(storedVolumeLevelIndex);
    }
    if (storedUiSize) {
      setUiSize(storedUiSize);
    }
  }, []);

  useEffect(() => {
    setPokeLoungeMasterVolume(POKE_LOUNGE_VOLUME_STEPS[volumeLevelIndex]);
    window.sessionStorage.setItem(POKE_LOUNGE_VOLUME_STORAGE_KEY, String(volumeLevelIndex));
  }, [volumeLevelIndex]);

  useEffect(() => {
    return () => {
      setPokeLoungeMasterVolume(1);
    };
  }, []);

  useEffect(() => {
    gamePageHandleRef.current?.setViewportSize(GAME_VIEWPORT_SIZE_PRESETS[uiSize]);
    window.sessionStorage.setItem(POKE_LOUNGE_UI_SIZE_STORAGE_KEY, uiSize);
  }, [uiSize]);

  useEffect(() => {
    const store = getDefaultGameStateStore();
    const syncConnectionSummary = () => {
      const sessionState = store.getState().session;
      setConnectionSummary(current => {
        if (
          current.connectionStatus === sessionState.connectionStatus &&
          current.roomId === sessionState.roomId
        ) {
          return current;
        }

        return {
          connectionStatus: sessionState.connectionStatus,
          roomId: sessionState.roomId,
        };
      });
    };

    syncConnectionSummary();
    return store.subscribe(syncConnectionSummary);
  }, []);

  useEffect(() => {
    const handleLeaveRequest = (event: Event) => {
      const requestEvent = event as CustomEvent<PokeLoungeRoomLeaveRequestDetail>;
      requestEvent.preventDefault();
      setLeaveRequest(requestEvent.detail);
    };
    const handleNotice = (event: Event) => {
      setNotice((event as CustomEvent<PokeLoungeNoticeDetail>).detail);
    };

    document.addEventListener(POKE_LOUNGE_ROOM_LEAVE_REQUEST_EVENT, handleLeaveRequest);
    document.addEventListener(POKE_LOUNGE_NOTICE_EVENT, handleNotice);

    return () => {
      document.removeEventListener(POKE_LOUNGE_ROOM_LEAVE_REQUEST_EVENT, handleLeaveRequest);
      document.removeEventListener(POKE_LOUNGE_NOTICE_EVENT, handleNotice);
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    let cancelled = false;
    setRankingStatus("loading");
    void getGameRanking("POKE_LOUNGE")
      .then(rows => {
        if (cancelled) {
          return;
        }

        setRanking(rows.slice(0, 5));
        setRankingStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setRanking([]);
          setRankingStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rankingAttempt, settingsOpen]);

  useEffect(() => {
    setTouchGameDevice(
      detectTouchGameDevice({
        maxTouchPoints: navigator.maxTouchPoints ?? 0,
        coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
        platform: navigator.platform ?? "",
        userAgent: navigator.userAgent ?? "",
      }),
    );
  }, []);

  useEffect(() => {
    const gameRoot = pageRef.current?.querySelector("#game-root");

    if (!gameRoot) {
      return;
    }

    const syncGameCanvasState = () => {
      setGameCanvasMounted(Boolean(gameRoot.querySelector("canvas")));
    };

    syncGameCanvasState();

    const observer = new MutationObserver(syncGameCanvasState);
    observer.observe(gameRoot, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    const parent = page?.parentElement;

    if (!page || !parent) {
      return;
    }

    const updateContainerSize = () => {
      if (
        document.fullscreenElement === page ||
        page.classList.contains("is-game-fullscreen-fallback")
      ) {
        page.style.setProperty(POKE_LOUNGE_CONTAINER_WIDTH_VAR, `${window.innerWidth}px`);
        page.style.setProperty(POKE_LOUNGE_CONTAINER_HEIGHT_VAR, `${window.innerHeight}px`);
        return;
      }

      const parentRect = parent.getBoundingClientRect();
      const parentStyle = window.getComputedStyle(parent);
      const paddingLeft = Number.parseFloat(parentStyle.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(parentStyle.paddingRight) || 0;
      const paddingTop = Number.parseFloat(parentStyle.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(parentStyle.paddingBottom) || 0;
      const visibleLeft = Math.max(parentRect.left + paddingLeft, 0);
      const visibleRight = Math.min(parentRect.right - paddingRight, window.innerWidth);
      const visibleTop = Math.max(parentRect.top + paddingTop, 0);
      const visibleBottom = Math.min(parentRect.bottom - paddingBottom, window.innerHeight);
      const width = Math.max(0, visibleRight - visibleLeft);
      const height = Math.max(0, visibleBottom - visibleTop);

      page.style.setProperty(POKE_LOUNGE_CONTAINER_WIDTH_VAR, `${Math.floor(width)}px`);
      page.style.setProperty(POKE_LOUNGE_CONTAINER_HEIGHT_VAR, `${Math.floor(height)}px`);
    };

    updateContainerSize();

    const resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(parent);
    window.addEventListener("resize", updateContainerSize);
    window.visualViewport?.addEventListener("resize", updateContainerSize);
    document.addEventListener("fullscreenchange", updateContainerSize);
    document.addEventListener(GAME_FULLSCREEN_STATE_EVENT, updateContainerSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateContainerSize);
      window.visualViewport?.removeEventListener("resize", updateContainerSize);
      document.removeEventListener("fullscreenchange", updateContainerSize);
      document.removeEventListener(GAME_FULLSCREEN_STATE_EVENT, updateContainerSize);
      page.style.removeProperty(POKE_LOUNGE_CONTAINER_WIDTH_VAR);
      page.style.removeProperty(POKE_LOUNGE_CONTAINER_HEIGHT_VAR);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenStateChange = () => syncFullscreenState();

    document.addEventListener("fullscreenchange", handleFullscreenStateChange);
    document.addEventListener(GAME_FULLSCREEN_STATE_EVENT, handleFullscreenStateChange);
    syncFullscreenState();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenStateChange);
      document.removeEventListener(GAME_FULLSCREEN_STATE_EVENT, handleFullscreenStateChange);
    };
  }, [syncFullscreenState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        isEditableEventTarget(event.target) ||
        hasOpenModalDialog(document)
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setSettingsOpen(open => !open);
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    const handleSettingsOpen = () => setSettingsOpen(true);

    document.addEventListener(GAME_SETTINGS_OPEN_EVENT, handleSettingsOpen);

    return () => {
      document.removeEventListener(GAME_SETTINGS_OPEN_EVENT, handleSettingsOpen);
    };
  }, []);

  useEffect(() => {
    const apiSession = session as ApiTokenSession | null;
    const token = getSessionApiIdToken(apiSession);

    if (status === "loading") {
      setStateHydrationStatus("pending");
      setHydratedToken(null);
      return;
    }

    if (status !== "authenticated" || !token || isAuthSessionError(apiSession?.error)) {
      setStateHydrationStatus("ready");
      setStateHydrationMessage("");
      setHydratedToken(null);
      return;
    }

    let cancelled = false;
    setStateHydrationStatus("pending");
    setStateHydrationMessage("");
    setHydratedToken(null);

    void tokenLifecycle.runHydration(async () => {
      if (cancelled) {
        return;
      }

      const result = await loadPokeLoungeState(token);
      if (cancelled) {
        return;
      }

      if (!result.success) {
        setStateHydrationStatus("unavailable");
        setStateHydrationMessage(result.message);
        setHydratedToken(null);
        return;
      }

      if (result.snapshot) {
        getDefaultGameStateStore().hydrateLocalPlayers(result.snapshot.state);
      }

      setStateHydrationStatus("ready");
      setHydratedToken(token);
    });

    return () => {
      cancelled = true;
    };
  }, [session, stateHydrationAttempt, status, tokenLifecycle]);

  useEffect(() => {
    isUnmountingRef.current = false;

    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  useEffect(() => {
    const apiSession = session as ApiTokenSession | null;
    const token = getSessionApiIdToken(apiSession);

    if (
      stateHydrationStatus !== "ready" ||
      hydratedToken !== token ||
      status !== "authenticated" ||
      !token ||
      isAuthSessionError(apiSession?.error)
    ) {
      return;
    }

    const autosave = startPokeLoungeAutosave({
      gameStateStore: getDefaultGameStateStore(),
      token,
      onStatusChange: setAutosaveStatus,
    });
    const autosaveLifecycle = createPokeLoungeAutosaveLifecycle(autosave);
    tokenLifecycle.registerAutosave(autosaveLifecycle);

    return () => {
      if (isUnmountingRef.current) {
        tokenLifecycle.disposeForUnmount(autosaveLifecycle);
      } else {
        tokenLifecycle.disposeForRehydration(autosaveLifecycle);
      }
    };
  }, [hydratedToken, session, stateHydrationStatus, status, tokenLifecycle]);

  useEffect(() => {
    if (stateHydrationStatus === "pending") {
      return;
    }

    let cancelled = false;
    let cleanedUp = false;
    let destroyGamePage: (() => void) | null = null;
    const apiSession = session as ApiTokenSession | null;
    const idToken =
      status === "authenticated" && !isAuthSessionError(apiSession?.error)
        ? getSessionApiIdToken(apiSession)
        : undefined;
    setGamePlaying(true);
    startedAtMsRef.current = Date.now();
    const pokeWindow = window as PokeLoungeWindow;
    const cleanupGamePage = () => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      cancelled = true;
      setGamePlaying(false);

      if (destroyGamePage) {
        destroyGamePage();
      } else {
        pokeWindow.__POKE_LOUNGE_GAME__?.destroy(true);
      }
      gamePageHandleRef.current = null;
      delete pokeWindow.__POKE_LOUNGE_GAME__;
      delete pokeWindow.__POKE_LOUNGE_CLEANUP_FOR_TEST__;
      delete pokeWindow.__POKE_LOUNGE_E2E__;
      delete document.documentElement.dataset.pokeLoungeE2eBattle;
      setGameCanvasMounted(false);
      pageRef.current?.classList.remove("is-game-fullscreen-fallback");
      document.body.classList.remove("is-game-fullscreen-fallback-active");
      document.querySelector<HTMLElement>("#game-root")?.replaceChildren();
    };

    if (new URLSearchParams(window.location.search).has("e2e")) {
      pokeWindow.__POKE_LOUNGE_CLEANUP_FOR_TEST__ = cleanupGamePage;
    }

    void import("./runtime/game-page").then(async ({ startGamePageFromDocument }) => {
      if (!cancelled) {
        const gamePage = await startGamePageFromDocument(document, new URL(window.location.href), {
          idToken,
          onGameResult: result => {
            setFinalResult({
              score: result.score,
              playTime: Math.max(1, Math.floor((Date.now() - startedAtMsRef.current) / 1000)),
            });
            setSubmitStatus("idle");
            setSubmitMessage("");
          },
          viewportSize: GAME_VIEWPORT_SIZE_PRESETS.large,
        });

        if (cancelled) {
          gamePage.destroy();
          return;
        }

        gamePageHandleRef.current = gamePage;
        destroyGamePage = () => {
          if (gamePageHandleRef.current === gamePage) {
            gamePageHandleRef.current = null;
          }
          gamePage.destroy();
        };
      }
    });

    return cleanupGamePage;
  }, [session, setGamePlaying, stateHydrationStatus, status]);

  const handleSubmitResult = useCallback(async () => {
    if (!finalResult || submitStatus === "submitting" || submitStatus === "success") {
      return;
    }

    const apiSession = session as ApiTokenSession | null;
    const token = getSessionApiIdToken(apiSession);

    if (status !== "authenticated" || !token || isAuthSessionError(apiSession?.error)) {
      setSubmitStatus("auth");
      setSubmitMessage("로그인 후 점수를 기록할 수 있습니다.");
      return;
    }

    setSubmitStatus("submitting");
    setSubmitMessage("점수를 기록하는 중입니다.");

    const result = await submitScore(
      {
        gameName: "poke-lounge",
        score: finalResult.score,
        playTime: finalResult.playTime,
      },
      token,
    );

    if (result.success) {
      setSubmitStatus("success");
      setSubmitMessage("Poke Lounge 점수가 기록되었습니다.");
      return;
    }

    setSubmitStatus(result.requiresAuth ? "auth" : "error");
    setSubmitMessage(
      result.requiresAuth
        ? "로그인 후 점수를 기록할 수 있습니다."
        : (result.message ?? "점수 기록에 실패했습니다."),
    );
  }, [finalResult, session, status, submitStatus]);

  return (
    <main
      ref={pageRef}
      className={`${styles.page} ${touchGameDevice ? styles.touchGameDevice : ""} phaser-game-page`}
      data-testid="poke-lounge-page"
      data-poke-lounge-ui-size={uiSize}
    >
      <div
        className={styles.gameFrame}
        data-poke-lounge-game-frame="true"
        data-poke-lounge-canvas-mounted={gameCanvasMounted}
      >
        <div
          id="game-root"
          role="region"
          aria-label="Poke Lounge 게임 화면"
          aria-describedby="poke-lounge-accessible-status"
          data-testid="poke-lounge-game-root"
        />
        {!touchGameDevice && gameCanvasMounted ? (
          <button
            type="button"
            className={styles.desktopSettingsButton}
            onClick={() => setSettingsOpen(true)}
            aria-label="Poke Lounge 설정 열기"
            data-poke-lounge-desktop-settings-toggle="true"
          >
            ⚙
          </button>
        ) : null}
        {touchGameDevice && gameCanvasMounted ? (
          <button
            type="button"
            className="fullscreen-toggle-button fullscreen-toggle-button--mobile"
            onClick={handleFullscreenToggle}
            aria-label={fullscreenActive ? "전체화면 끄기" : "전체화면 켜기"}
            aria-pressed={fullscreenActive}
            data-fullscreen-toggle="true"
            data-fullscreen-toggle-placement="mobile"
            data-poke-lounge-web-fullscreen-toggle="true"
          >
            ⛶
          </button>
        ) : null}
      </div>
      {stateHydrationStatus === "pending" ? (
        <section className={styles.loadingOverlay} role="status" aria-live="polite">
          <p className={styles.resultEyebrow}>Poke Lounge</p>
          <p className={styles.resultStatus}>저장된 모험을 불러오는 중입니다.</p>
        </section>
      ) : null}
      {stateHydrationStatus === "unavailable" ? (
        <section className={styles.resultOverlay} data-testid="poke-lounge-state-hydration-error">
          <p className={styles.resultStatus} aria-live="polite">
            {stateHydrationMessage}
          </p>
          <Button
            type="button"
            onClick={() => setStateHydrationAttempt(attempt => attempt + 1)}
            data-testid="poke-lounge-state-hydration-retry"
          >
            저장 상태 다시 불러오기
          </Button>
        </section>
      ) : null}
      {gameCanvasMounted ? (
        <aside
          className={styles.statusRail}
          aria-label="게임 저장과 연결 상태"
          data-poke-lounge-status-rail="true"
        >
          {multiplayerRoomId ? (
            <p
              className={styles.statusChip}
              data-tone={connectionSummary.connectionStatus === "online" ? "success" : "warning"}
              data-poke-lounge-connection-status={connectionSummary.connectionStatus}
            >
              {connectionLabel} · {multiplayerRoomId}
            </p>
          ) : null}
          <p
            className={styles.statusChip}
            data-tone={autosaveStatus === "error" ? "error" : "neutral"}
            data-poke-lounge-save-status={status === "authenticated" ? autosaveStatus : "local"}
          >
            {autosaveLabel}
          </p>
        </aside>
      ) : null}
      {notice ? (
        <aside
          className={styles.noticeBanner}
          data-tone={notice.tone}
          role={notice.tone === "error" ? "alert" : "status"}
          data-poke-lounge-notice="true"
        >
          <p>{notice.message}</p>
          <Button type="button" variant="outline" onClick={() => setNotice(null)}>
            확인
          </Button>
        </aside>
      ) : null}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          className={styles.settingsDialog}
          showCloseButton={false}
          data-poke-lounge-settings="true"
        >
          <DialogHeader className={styles.settingsHeader}>
            <DialogTitle className={styles.settingsTitle}>설정과 검증 랭킹</DialogTitle>
            <DialogDescription className={styles.settingsDescription}>
              화면과 소리를 조절하고 현재 방·저장 상태를 확인합니다.
            </DialogDescription>
          </DialogHeader>
          <div className={styles.settingsOptions}>
            <Button
              type="button"
              variant="outline"
              className={styles.settingsOptionButton}
              onClick={handleFullscreenToggle}
              aria-label={fullscreenActive ? "전체화면 끄기" : "전체화면 켜기"}
              aria-pressed={fullscreenActive}
              data-fullscreen-toggle="true"
              data-fullscreen-toggle-placement="settings"
              data-poke-lounge-setting-option="true"
              data-poke-lounge-setting-action="fullscreen"
            >
              전체화면
            </Button>
            <Button
              type="button"
              variant="outline"
              className={styles.settingsOptionButton}
              onClick={handleVolumeCycle}
              aria-label={volumePercent === 0 ? "소리 음소거" : `소리 볼륨 ${volumePercent}퍼센트`}
              data-poke-lounge-setting-option="true"
              data-poke-lounge-setting-action="volume"
              data-poke-lounge-volume-level={volumeLevelIndex}
            >
              {volumeLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={styles.settingsOptionButton}
              onClick={handleUiSizeToggle}
              aria-label="UI 사이즈 2단계"
              aria-pressed={uiSize === "large"}
              data-poke-lounge-setting-option="true"
              data-poke-lounge-setting-action="ui-size"
              data-poke-lounge-ui-size={uiSize}
            >
              {uiSizeLabel}
            </Button>
            {roomShareUrl ? (
              <Button
                type="button"
                variant="outline"
                className={styles.settingsOptionButton}
                onClick={handleRoomShare}
                aria-label="방 링크 공유"
                data-poke-lounge-setting-option="true"
                data-poke-lounge-setting-action="share-link"
              >
                {roomShareStatus === "success"
                  ? "링크 복사됨"
                  : roomShareStatus === "error"
                    ? "복사 실패"
                    : "링크 공유"}
              </Button>
            ) : null}
            <div className={styles.settingsStateSummary} aria-live="polite">
              <span>{multiplayerRoomId ? connectionLabel : "솔로 플레이"}</span>
              <span>{autosaveLabel}</span>
            </div>
            <section className={styles.rankingSection} aria-labelledby="poke-lounge-ranking-title">
              <div className={styles.rankingHeader}>
                <h3 id="poke-lounge-ranking-title">검증된 1:1 랭킹</h3>
                <span>서버 검증 결과만 반영</span>
              </div>
              {rankingStatus === "loading" ? (
                <p className={styles.rankingEmpty}>랭킹을 불러오는 중입니다.</p>
              ) : rankingStatus === "error" ? (
                <div className={styles.rankingEmpty}>
                  <p>랭킹을 불러오지 못했습니다.</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRankingAttempt(attempt => attempt + 1)}
                  >
                    다시 시도
                  </Button>
                </div>
              ) : ranking.length === 0 ? (
                <p className={styles.rankingEmpty}>아직 검증된 기록이 없습니다.</p>
              ) : (
                <ol className={styles.rankingList}>
                  {ranking.map(entry => (
                    <li key={`${entry.rank}-${entry.createdAt}`}>
                      <span>#{entry.rank}</span>
                      <strong>{getRankingDisplayName(entry)}</strong>
                      <b>{entry.score.toLocaleString("ko-KR")}</b>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <Button
              type="button"
              variant="outline"
              className={styles.settingsOptionButton}
              onClick={() => setSettingsOpen(false)}
              data-poke-lounge-setting-option="true"
              data-poke-lounge-settings-cancel="true"
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(leaveRequest)}
        onOpenChange={open => {
          if (!open) {
            setLeaveRequest(null);
          }
        }}
      >
        <AlertDialogContent className={styles.confirmDialog} data-poke-lounge-leave-dialog="true">
          <AlertDialogHeader>
            <AlertDialogTitle>{leaveRequest?.title ?? "방에서 나갈까요?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveRequest?.description ?? "현재 방 연결이 해제됩니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 플레이</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const request = leaveRequest;
                setLeaveRequest(null);
                request?.confirm();
              }}
            >
              방 나가기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {finalResult ? (
        <section className={styles.resultOverlay} data-testid="poke-lounge-result-panel">
          <p className={styles.resultEyebrow}>플레이 결과</p>
          <div className={styles.resultScore} data-testid="poke-lounge-result-score">
            {finalResult.score}
          </div>
          <p className={styles.resultMeta}>플레이 시간 {finalResult.playTime}초</p>
          <p className={styles.resultStatus}>일반 플레이 기록 · 공개 검증 랭킹 미반영</p>
          <Button
            type="button"
            onClick={handleSubmitResult}
            disabled={submitStatus === "submitting" || submitStatus === "success"}
            data-testid="poke-lounge-result-submit"
          >
            {submitStatus === "submitting" ? "기록 중" : "일반 기록 저장"}
          </Button>
          <p
            className={styles.resultStatus}
            data-testid="poke-lounge-result-status"
            aria-live="polite"
          >
            {submitMessage}
          </p>
        </section>
      ) : null}
      <div
        id="poke-lounge-accessible-status"
        className={styles.srOnly}
        role="status"
        aria-live="polite"
      >
        {accessibleGameStatus} {multiplayerRoomId ? `${connectionLabel}. ` : ""}
        {autosaveLabel}. 게임 조작 도움말은 H 키 또는 물음표 버튼으로 열 수 있습니다.
      </div>
    </main>
  );
}
