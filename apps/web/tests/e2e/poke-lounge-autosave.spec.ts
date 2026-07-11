import { expect, test } from "@playwright/test";
import {
  buildPokeLoungeSaveSnapshot,
  POKE_LOUNGE_SAVE_SNAPSHOT_VERSION,
} from "../../src/components/poke-lounge/runtime/game/state/poke-lounge-save-snapshot";
import { createGameStateStore } from "../../src/components/poke-lounge/runtime/game/state/gameStateStore";
import {
  createPokeLoungeAutosaveLifecycle,
  createPokeLoungeTokenLifecycle,
  startPokeLoungeAutosave,
} from "../../src/components/poke-lounge/poke-lounge-autosave";
import {
  loadPokeLoungeState,
  savePokeLoungeState,
} from "../../src/services/poke-lounge-state-service";
import { ApiError } from "../../src/lib/api-client";

const CLIENT_UPDATED_AT = "2026-07-08T12:00:00.000Z";

const createStarterPokemon = (name = "브케인") => ({
  speciesId: 155,
  name,
  level: 5,
  maxHp: 20,
  currentHp: 20,
  experience: 0,
  growthRate: 1_000_000,
  status: "normal" as const,
  moves: [
    {
      id: 33,
      name: "몸통박치기",
      pp: 35,
      maxPp: 35,
    },
  ],
});

function createManualScheduler() {
  type ScheduledTask = {
    delayMs: number;
    callback: () => void;
  };

  const timeouts: ScheduledTask[] = [];
  const intervals: ScheduledTask[] = [];

  const removeTask = (tasks: ScheduledTask[], task: ScheduledTask) => {
    const index = tasks.indexOf(task);
    if (index >= 0) {
      tasks.splice(index, 1);
    }
  };

  return {
    timeouts,
    intervals,
    scheduler: {
      setTimeout(callback: () => void, delayMs: number) {
        const task = { delayMs, callback };
        timeouts.push(task);
        return task;
      },
      clearTimeout(task: ScheduledTask) {
        removeTask(timeouts, task);
      },
      setInterval(callback: () => void, delayMs: number) {
        const task = { delayMs, callback };
        intervals.push(task);
        return task;
      },
      clearInterval(task: ScheduledTask) {
        removeTask(intervals, task);
      },
    },
    runNextTimeout() {
      const task = timeouts.shift();
      task?.callback();
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

test.describe("Poke Lounge autosave", () => {
  test("저장 스냅샷은 현재 GameState를 JSON 직렬화 가능한 복사본으로 만든다", () => {
    const store = createGameStateStore();
    const starter = createStarterPokemon();
    store.setStarterPokemon(starter);

    const snapshot = buildPokeLoungeSaveSnapshot(store);

    expect(snapshot.version).toBe(POKE_LOUNGE_SAVE_SNAPSHOT_VERSION);
    expect(snapshot.game).toBe("poke-lounge");
    expect(snapshot.state.currentPlayerId).toBe("player-1");
    expect(snapshot.state.playersById["player-1"]?.party[0]?.pokemon?.name).toBe("브케인");
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);

    store.updateActivePokemon({
      ...starter,
      name: "리아코",
    });

    expect(snapshot.state.playersById["player-1"]?.party[0]?.pokemon?.name).toBe("브케인");
  });

  test("저장 서비스는 인증 토큰으로 권장 API 계약에 맞춰 PUT 요청을 보낸다", async () => {
    const state = {
      version: POKE_LOUNGE_SAVE_SNAPSHOT_VERSION,
      game: "poke-lounge",
      state: { currentPlayerId: "player-1" },
    };
    const calls: unknown[] = [];

    const result = await savePokeLoungeState(
      {
        state,
        clientUpdatedAt: CLIENT_UPDATED_AT,
      },
      "id-token",
      {
        put: async (...args) => {
          calls.push(args);
          return { saved: true };
        },
      },
    );

    expect(result).toEqual({ success: true });
    expect(calls).toEqual([
      [
        "/game/poke-lounge/state",
        {
          state,
          clientUpdatedAt: CLIENT_UPDATED_AT,
        },
        {
          token: "id-token",
        },
      ],
    ]);
  });

  test("인증된 GET이 완료되기 전에는 첫 PUT을 시작하지 않는다", async () => {
    const calls: string[] = [];
    const deferredGet = createDeferred<unknown>();
    const store = createGameStateStore();
    const snapshot = buildPokeLoungeSaveSnapshot(store);
    const manualScheduler = createManualScheduler();

    const startAfterHydration = async () => {
      const loaded = await loadPokeLoungeState("id-token", {
        get: async () => {
          calls.push("GET");
          return deferredGet.promise;
        },
      });

      if (!loaded.success) {
        return;
      }

      if (loaded.snapshot) {
        store.hydrateLocalPlayers(loaded.snapshot.state);
      }

      const autosave = startPokeLoungeAutosave({
        gameStateStore: store,
        token: "id-token",
        scheduler: manualScheduler.scheduler,
        saveState: async () => {
          calls.push("PUT");
          return { success: true };
        },
      });

      await autosave.flush();
      await autosave.dispose({ flush: false });
    };

    const startPromise = startAfterHydration();

    expect(calls).toEqual(["GET"]);

    deferredGet.resolve({ state: snapshot });
    await startPromise;

    expect(calls).toEqual(["GET", "PUT"]);
  });

  test("404 상태 조회는 빈 저장 상태로 정규화한다", async () => {
    const result = await loadPokeLoungeState("id-token", {
      get: async () => {
        throw new ApiError(404, "Poke Lounge state not found");
      },
    });

    expect(result).toEqual({ success: true, snapshot: null });
  });

  test("재수화 중 token A 자동 저장 cleanup은 token B GET 실패 전 PUT하지 않는다", async () => {
    const calls: string[] = [];
    const tokenBGet = createDeferred<unknown>();
    const store = createGameStateStore();
    const autosave = startPokeLoungeAutosave({
      gameStateStore: store,
      token: "token-a",
      saveState: async payload => {
        calls.push(`PUT:${payload.token}`);
        return { success: true };
      },
    });
    const lifecycle = createPokeLoungeAutosaveLifecycle(autosave);

    store.setStarterPokemon(createStarterPokemon());
    const nextHydration = loadPokeLoungeState("token-b", {
      get: async () => {
        calls.push("GET:token-b");
        return tokenBGet.promise;
      },
    });

    await lifecycle.disposeForRehydration();

    expect(calls).toEqual(["GET:token-b"]);

    tokenBGet.reject(new Error("network unavailable"));
    await expect(nextHydration).resolves.toMatchObject({ success: false, unavailable: true });
    expect(calls).toEqual(["GET:token-b"]);
  });

  test("token B hydration은 token A의 진행 중인 PUT이 끝난 뒤 최종 서버 상태를 조회한다", async () => {
    const calls: string[] = [];
    const store = createGameStateStore();
    const tokenAPut = createDeferred<{ success: true }>();
    let serverSnapshot = buildPokeLoungeSaveSnapshot(store);
    const autosave = startPokeLoungeAutosave({
      gameStateStore: store,
      token: "token-a",
      saveState: async payload => {
        calls.push("PUT:token-a");
        await tokenAPut.promise;
        serverSnapshot = payload.snapshot;
        return { success: true };
      },
    });
    const lifecycle = createPokeLoungeAutosaveLifecycle(autosave);
    const tokenLifecycle = createPokeLoungeTokenLifecycle();

    store.setStarterPokemon(createStarterPokemon("리아코"));
    const putPromise = autosave.flush();
    tokenLifecycle.disposeForRehydration(lifecycle);

    store.updateActivePokemon(createStarterPokemon("치코리타"));
    const hydrationPromise = tokenLifecycle.runHydration(async () => {
      calls.push("GET:token-b");
      const loaded = await loadPokeLoungeState("token-b", {
        get: async () => ({ state: serverSnapshot }),
      });
      if (loaded.success && loaded.snapshot) {
        store.hydrateLocalPlayers(loaded.snapshot.state);
      }
    });

    await Promise.resolve();
    expect(calls).toEqual(["PUT:token-a"]);

    tokenAPut.resolve({ success: true });
    await Promise.all([putPromise, hydrationPromise]);

    expect(calls).toEqual(["PUT:token-a", "GET:token-b"]);
    expect(store.getState().playersById["player-1"]?.party[0]?.pokemon?.name).toBe("리아코");
  });

  test("정상 unmount lifecycle은 마지막 자동 저장을 유지한다", async () => {
    const store = createGameStateStore();
    const saves: string[] = [];
    const autosave = startPokeLoungeAutosave({
      gameStateStore: store,
      token: "token-a",
      saveState: async payload => {
        saves.push(payload.token);
        return { success: true };
      },
    });
    const lifecycle = createPokeLoungeAutosaveLifecycle(autosave);

    store.setStarterPokemon(createStarterPokemon());
    await lifecycle.disposeForUnmount();

    expect(saves).toEqual(["token-a"]);
  });

  test("StrictMode 재실행 hydration은 unmount cleanup의 마지막 flush를 기다린다", async () => {
    const calls: string[] = [];
    const store = createGameStateStore();
    const autosave = startPokeLoungeAutosave({
      gameStateStore: store,
      token: "token-a",
      saveState: async () => {
        calls.push("PUT:token-a");
        return { success: true };
      },
    });
    const lifecycle = createPokeLoungeAutosaveLifecycle(autosave);
    const tokenLifecycle = createPokeLoungeTokenLifecycle();
    tokenLifecycle.registerAutosave(lifecycle);
    store.setStarterPokemon(createStarterPokemon());

    tokenLifecycle.disposeForUnmount(lifecycle);
    await tokenLifecycle.runHydration(async () => {
      calls.push("GET:token-a");
    });

    expect(calls).toEqual(["PUT:token-a", "GET:token-a"]);
  });

  test("dispose 대기 중 취소된 hydration은 GET 없이 끝나고 다음 hydration을 막지 않는다", async () => {
    const calls: string[] = [];
    const disposal = createDeferred<void>();
    const tokenLifecycle = createPokeLoungeTokenLifecycle();
    const lifecycle = {
      disposeForRehydration: () => disposal.promise,
      disposeForUnmount: () => disposal.promise,
    };
    let cancelled = false;
    tokenLifecycle.registerAutosave(lifecycle);

    const cancelledHydration = tokenLifecycle.runHydration(async () => {
      if (!cancelled) {
        calls.push("GET:cancelled");
      }
    });
    cancelled = true;
    const nextHydration = tokenLifecycle.runHydration(async () => {
      calls.push("GET:next");
    });

    disposal.resolve();
    await Promise.all([cancelledHydration, nextHydration]);

    expect(calls).toEqual(["GET:next"]);
  });

  test("저장 서비스는 토큰이 없으면 요청을 보내지 않고 조용히 건너뛴다", async () => {
    const calls: unknown[] = [];

    const result = await savePokeLoungeState(
      {
        state: {
          version: POKE_LOUNGE_SAVE_SNAPSHOT_VERSION,
          game: "poke-lounge",
          state: { currentPlayerId: "player-1" },
        },
        clientUpdatedAt: CLIENT_UPDATED_AT,
      },
      undefined,
      {
        put: async (...args) => {
          calls.push(args);
          return { saved: true };
        },
      },
    );

    expect(result).toEqual({ success: false, skipped: true, requiresAuth: true });
    expect(calls).toEqual([]);
  });

  test("자동 저장 클라이언트는 상태 변경을 debounce하고 마지막 cleanup flush를 수행한다", async () => {
    const store = createGameStateStore();
    const manualScheduler = createManualScheduler();
    const saves: unknown[] = [];
    const autosave = startPokeLoungeAutosave({
      gameStateStore: store,
      token: "id-token",
      intervalMs: 30_000,
      debounceMs: 2_000,
      scheduler: manualScheduler.scheduler,
      getClientUpdatedAt: () => CLIENT_UPDATED_AT,
      saveState: async payload => {
        saves.push(payload);
        return { success: true };
      },
    });

    expect(manualScheduler.intervals[0]?.delayMs).toBe(30_000);

    store.setStarterPokemon(createStarterPokemon());

    expect(manualScheduler.timeouts[0]?.delayMs).toBe(2_000);

    manualScheduler.runNextTimeout();
    await autosave.waitForIdle();

    expect(saves).toHaveLength(1);
    expect(saves[0]).toMatchObject({
      token: "id-token",
      clientUpdatedAt: CLIENT_UPDATED_AT,
      snapshot: {
        version: POKE_LOUNGE_SAVE_SNAPSHOT_VERSION,
        game: "poke-lounge",
      },
    });

    store.updateActivePokemon(createStarterPokemon("리아코"));
    await autosave.dispose();

    expect(saves).toHaveLength(2);
    expect(saves[1]).toMatchObject({
      token: "id-token",
      clientUpdatedAt: CLIENT_UPDATED_AT,
      snapshot: {
        state: {
          playersById: {
            "player-1": {
              party: [
                {
                  pokemon: {
                    name: "리아코",
                  },
                },
              ],
            },
          },
        },
      },
    });
  });

  test("in-flight 저장 중 dispose하면 dispose 시점 스냅샷을 마지막으로 저장한다", async () => {
    const store = createGameStateStore();
    const manualScheduler = createManualScheduler();
    const firstSave = createDeferred<{ success: true }>();
    const saves: unknown[] = [];
    const autosave = startPokeLoungeAutosave({
      gameStateStore: store,
      token: "id-token",
      intervalMs: 30_000,
      debounceMs: 2_000,
      scheduler: manualScheduler.scheduler,
      getClientUpdatedAt: () => CLIENT_UPDATED_AT,
      saveState: payload => {
        saves.push(payload);
        return saves.length === 1 ? firstSave.promise : Promise.resolve({ success: true });
      },
    });

    store.setStarterPokemon(createStarterPokemon("브케인"));
    manualScheduler.runNextTimeout();

    store.updateActivePokemon(createStarterPokemon("리아코"));
    const disposePromise = autosave.dispose();

    store.updateActivePokemon(createStarterPokemon("치코리타"));
    firstSave.resolve({ success: true });
    await disposePromise;

    expect(saves).toHaveLength(2);
    expect(saves[1]).toMatchObject({
      snapshot: {
        state: {
          playersById: {
            "player-1": {
              party: [
                {
                  pokemon: {
                    name: "리아코",
                  },
                },
              ],
            },
          },
        },
      },
    });
  });
});
