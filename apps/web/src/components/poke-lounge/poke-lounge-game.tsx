"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/contexts/game-context";
import { getSessionApiIdToken, isAuthSessionError, type ApiTokenSession } from "@/lib/auth-token";
import { submitScore } from "@/services/score-service";
import { loadPokeLoungeState } from "@/services/poke-lounge-state-service";
import { startPokeLoungeAutosave } from "./poke-lounge-autosave";
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

const POKE_LOUNGE_VOLUME_STEPS = [0.25, 0.5, 0.75, 1] as const;
const POKE_LOUNGE_CONTAINER_WIDTH_VAR = "--poke-lounge-container-width";
const POKE_LOUNGE_CONTAINER_HEIGHT_VAR = "--poke-lounge-container-height";

type PokeLoungeUiSize = GameViewportSizePreset;
type PokeLoungeGamePageHandle = {
  destroy(): void;
  setViewportSize(viewportSize: GameViewportDisplaySize): void;
};
type PokeLoungeRoomShareStatus = "idle" | "success" | "error";
type PokeLoungeStateHydrationStatus = "pending" | "ready" | "unavailable";

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

export function PokeLoungeGame() {
  const { setGamePlaying } = useGame();
  const { data: session, status } = useSession();
  const pageRef = useRef<HTMLElement>(null);
  const gamePageHandleRef = useRef<PokeLoungeGamePageHandle | null>(null);
  const startedAtMsRef = useRef(Date.now());
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
  const volumeLevel = volumeLevelIndex + 1;
  const uiSizeLabel = uiSize === "large" ? "UI 크게" : "UI 보통";
  const roomShareUrl = settingsOpen ? createPokeLoungeRoomShareUrlFromLocation() : null;

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
    setPokeLoungeMasterVolume(POKE_LOUNGE_VOLUME_STEPS[volumeLevelIndex]);
  }, [volumeLevelIndex]);

  useEffect(() => {
    return () => {
      setPokeLoungeMasterVolume(1);
    };
  }, []);

  useEffect(() => {
    gamePageHandleRef.current?.setViewportSize(GAME_VIEWPORT_SIZE_PRESETS[uiSize]);
  }, [uiSize]);

  useEffect(() => {
    setTouchGameDevice(
      detectTouchGameDevice({
        maxTouchPoints: navigator.maxTouchPoints ?? 0,
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
      if (event.key !== "Escape" || isEditableEventTarget(event.target)) {
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
      return;
    }

    if (status !== "authenticated" || !token || isAuthSessionError(apiSession?.error)) {
      setStateHydrationStatus("ready");
      setStateHydrationMessage("");
      return;
    }

    let cancelled = false;
    setStateHydrationStatus("pending");
    setStateHydrationMessage("");

    void loadPokeLoungeState(token).then(result => {
      if (cancelled) {
        return;
      }

      if (!result.success) {
        setStateHydrationStatus("unavailable");
        setStateHydrationMessage(result.message);
        return;
      }

      if (result.snapshot) {
        getDefaultGameStateStore().hydrateLocalPlayers(result.snapshot.state);
      }

      setStateHydrationStatus("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [session, stateHydrationAttempt, status]);

  useEffect(() => {
    const apiSession = session as ApiTokenSession | null;
    const token = getSessionApiIdToken(apiSession);

    if (
      stateHydrationStatus !== "ready" ||
      status !== "authenticated" ||
      !token ||
      isAuthSessionError(apiSession?.error)
    ) {
      return;
    }

    const autosave = startPokeLoungeAutosave({
      gameStateStore: getDefaultGameStateStore(),
      token,
    });

    return () => {
      void autosave.dispose();
    };
  }, [session, stateHydrationStatus, status]);

  useEffect(() => {
    if (stateHydrationStatus === "pending") {
      return;
    }

    let cancelled = false;
    let cleanedUp = false;
    let destroyGamePage: (() => void) | null = null;
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
  }, [setGamePlaying, stateHydrationStatus]);

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
      <div className={styles.gameFrame} data-poke-lounge-game-frame="true">
        <div id="game-root" data-testid="poke-lounge-game-root" />
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
      {settingsOpen ? (
        <section
          className={styles.settingsOverlay}
          data-poke-lounge-settings="true"
          aria-label="Poke Lounge 설정"
        >
          <div className={styles.settingsHeader}>
            <p className={styles.settingsTitle}>설정</p>
          </div>
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
              aria-label="소리 볼륨 4단계"
              data-poke-lounge-setting-option="true"
              data-poke-lounge-setting-action="volume"
              data-poke-lounge-volume-level={volumeLevel}
            >
              소리 {volumeLevel}/4
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
            <Button
              type="button"
              variant="outline"
              className={styles.settingsOptionButton}
              onClick={() => setSettingsOpen(false)}
              data-poke-lounge-setting-option="true"
              data-poke-lounge-settings-cancel="true"
            >
              취소
            </Button>
          </div>
        </section>
      ) : null}
      {finalResult ? (
        <section className={styles.resultOverlay} data-testid="poke-lounge-result-panel">
          <p className={styles.resultEyebrow}>Final Result</p>
          <div className={styles.resultScore} data-testid="poke-lounge-result-score">
            {finalResult.score}
          </div>
          <p className={styles.resultMeta}>{finalResult.playTime}s</p>
          <Button
            type="button"
            onClick={handleSubmitResult}
            disabled={submitStatus === "submitting" || submitStatus === "success"}
            data-testid="poke-lounge-result-submit"
          >
            {submitStatus === "submitting" ? "기록 중" : "점수 기록"}
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
    </main>
  );
}
