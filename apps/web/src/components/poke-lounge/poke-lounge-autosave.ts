import {
  savePokeLoungeState,
  type PokeLoungeStateSaveResult,
} from "@/services/poke-lounge-state-service";
import type { GameStateStore } from "./runtime/game/state/gameStateStore";
import {
  buildPokeLoungeSaveSnapshot,
  type PokeLoungeSaveSnapshot,
} from "./runtime/game/state/poke-lounge-save-snapshot";

export const POKE_LOUNGE_AUTOSAVE_INTERVAL_MS = 30_000;
export const POKE_LOUNGE_AUTOSAVE_DEBOUNCE_MS = 2_000;

export interface PokeLoungeAutosavePayload {
  token: string;
  snapshot: PokeLoungeSaveSnapshot;
  clientUpdatedAt: string;
}

export interface PokeLoungeAutosaveScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
  setInterval(callback: () => void, delayMs: number): unknown;
  clearInterval(handle: unknown): void;
}

export interface StartPokeLoungeAutosaveOptions {
  gameStateStore: Pick<GameStateStore, "getState" | "subscribe">;
  token: string;
  intervalMs?: number;
  debounceMs?: number;
  scheduler?: PokeLoungeAutosaveScheduler;
  getClientUpdatedAt?: () => string;
  saveState?: (payload: PokeLoungeAutosavePayload) => Promise<PokeLoungeStateSaveResult>;
}

export interface PokeLoungeAutosaveController {
  flush(): Promise<void>;
  waitForIdle(): Promise<void>;
  dispose(options?: { flush?: boolean }): Promise<void>;
}

export interface PokeLoungeAutosaveLifecycle {
  disposeForRehydration(): Promise<void>;
  disposeForUnmount(): Promise<void>;
}

export function createPokeLoungeAutosaveLifecycle(
  autosave: PokeLoungeAutosaveController,
): PokeLoungeAutosaveLifecycle {
  return {
    disposeForRehydration() {
      return autosave.dispose({ flush: false });
    },
    disposeForUnmount() {
      return autosave.dispose();
    },
  };
}

export function startPokeLoungeAutosave({
  gameStateStore,
  token,
  intervalMs = POKE_LOUNGE_AUTOSAVE_INTERVAL_MS,
  debounceMs = POKE_LOUNGE_AUTOSAVE_DEBOUNCE_MS,
  scheduler = createDefaultScheduler(),
  getClientUpdatedAt = () => new Date().toISOString(),
  saveState = savePokeLoungeAutosavePayload,
}: StartPokeLoungeAutosaveOptions): PokeLoungeAutosaveController {
  let dirty = true;
  let disposed = false;
  let debounceHandle: unknown = null;
  let inFlight: Promise<void> | null = null;

  const clearDebounce = () => {
    if (debounceHandle === null) {
      return;
    }

    scheduler.clearTimeout(debounceHandle);
    debounceHandle = null;
  };

  const createPayload = (): PokeLoungeAutosavePayload => ({
    token,
    snapshot: buildPokeLoungeSaveSnapshot(gameStateStore),
    clientUpdatedAt: getClientUpdatedAt(),
  });

  const savePayload = async (payload: PokeLoungeAutosavePayload) => {
    inFlight = (async () => {
      const result = await saveState(payload);
      if (!result.success) {
        dirty = true;
      }
    })();

    try {
      await inFlight;
    } finally {
      inFlight = null;
    }
  };

  const flush = async () => {
    clearDebounce();

    if (!dirty) {
      return;
    }

    if (inFlight) {
      await inFlight;
      if (!dirty) {
        return;
      }
    }

    dirty = false;
    await savePayload(createPayload());
  };

  const scheduleDebouncedFlush = () => {
    if (disposed) {
      return;
    }

    clearDebounce();
    debounceHandle = scheduler.setTimeout(() => {
      debounceHandle = null;
      void flush();
    }, debounceMs);
  };

  const unsubscribe = gameStateStore.subscribe(() => {
    dirty = true;
    scheduleDebouncedFlush();
  });

  const intervalHandle = scheduler.setInterval(() => {
    void flush();
  }, intervalMs);

  const waitForIdle = async () => {
    if (inFlight) {
      await inFlight;
    }
  };

  return {
    flush,
    waitForIdle,
    async dispose({ flush: shouldFlush = true } = {}) {
      if (disposed) {
        await waitForIdle();
        return;
      }

      const finalPayload = shouldFlush ? createPayload() : null;
      disposed = true;
      clearDebounce();
      scheduler.clearInterval(intervalHandle);
      unsubscribe();

      if (finalPayload) {
        await waitForIdle();
        dirty = false;
        await savePayload(finalPayload);
        return;
      }

      await waitForIdle();
    },
  };
}

function savePokeLoungeAutosavePayload({
  token,
  snapshot,
  clientUpdatedAt,
}: PokeLoungeAutosavePayload): Promise<PokeLoungeStateSaveResult> {
  return savePokeLoungeState(
    {
      state: snapshot,
      clientUpdatedAt,
    },
    token,
  );
}

function createDefaultScheduler(): PokeLoungeAutosaveScheduler {
  return {
    setTimeout(callback, delayMs) {
      return globalThis.setTimeout(callback, delayMs);
    },
    clearTimeout(handle) {
      globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>);
    },
    setInterval(callback, delayMs) {
      return globalThis.setInterval(callback, delayMs);
    },
    clearInterval(handle) {
      globalThis.clearInterval(handle as ReturnType<typeof globalThis.setInterval>);
    },
  };
}
