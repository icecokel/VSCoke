import fs from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { applyLevelUpPlayerMoves } from "../../src/components/poke-lounge/runtime/game/battle/levelUpMoves";
import { createWildBattleState } from "../../src/components/poke-lounge/runtime/game/battle/wildBattleFactory";
import { getBattlePokemonAssets } from "../../src/components/poke-lounge/runtime/game/battle/battlePokemonAssets";
import {
  BATTLE_POKEMON_ASSETS_JSON_PATH,
  LEVEL_UP_MOVE_TABLE_JSON_PATH,
  WILD_BATTLE_MOVE_SETS_JSON_PATH,
  loadRuntimeGameDataJson,
  resetRuntimeGameDataJsonStateForTest,
} from "../../src/components/poke-lounge/runtime/game/data/game-data-json";
import { selectWildEncounterConfig } from "../../src/components/poke-lounge/runtime/game/world/wildEncounterTables";
import { escapeRegExp, gotoWithRetry, resolveLocaleAndMessages } from "./test-helpers";

type PokeLoungeSceneKey = "world" | "battle";
type PokeLoungeBattleScenario = "wild-victory" | "wild-defeat";
type PokeLoungeBattleResultReason = "faint" | "timeout" | "forfeit" | "run" | "capture";

interface PokeLoungeBattleSnapshot {
  battleKind: "sample" | "wild" | "trainer";
  phase:
    | "intro"
    | "command"
    | "move-select"
    | "party-select"
    | "bag-select"
    | "resolving"
    | "ended";
  selectedCommand: "fight" | "bag" | "pokemon" | "run";
  selectedCommandLabel: string;
  result: {
    winnerPlayerId: string;
    loserPlayerId: string;
    reason: PokeLoungeBattleResultReason;
  } | null;
  battleEntrancePlaying: boolean;
  battleEntrancePlayed: boolean;
  hpAnimationPlaying: boolean;
  hpAnimationStartedCount: number;
  hitAnimationPlaying: boolean;
  hitAnimationStartedCount: number;
  player: {
    currentHp: number;
    maxHp: number;
    displayedCurrentHp: number;
    hitAnimationStartedCount: number;
  };
  opponent: {
    currentHp: number;
    maxHp: number;
    displayedCurrentHp: number;
    hitAnimationStartedCount: number;
  };
}

interface PokeLoungeGameStateSnapshot {
  session: {
    roomId: string | null;
    sessionId: string | null;
    connectionStatus: "offline" | "connecting" | "online";
  };
  round: {
    phase: "waiting" | "preparation" | "tournament" | "round-result" | "game-result";
  };
}

interface PokeLoungeWorldSnapshot {
  player: {
    x: number;
    y: number;
    facing: "front" | "back" | "left" | "right";
  } | null;
  shortcutGuideOpen: boolean;
  encounterLocked: boolean;
  battleIntroPlaying: boolean;
}

interface PokeLoungeCanvasSnapshot {
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
}

interface PokeLoungeE2eController {
  getActiveSceneKey(): PokeLoungeSceneKey | null;
  getBattleSnapshot(): PokeLoungeBattleSnapshot | null;
  setBattleCommand(
    command: PokeLoungeBattleSnapshot["selectedCommand"],
  ): PokeLoungeBattleSnapshot | null;
  setBattleMoveIndex(index: number): PokeLoungeBattleSnapshot | null;
  confirmBattle(): PokeLoungeBattleSnapshot | null;
  drainBattleMessages(maxMessages?: number): PokeLoungeBattleSnapshot | null;
  getWorldSnapshot(): PokeLoungeWorldSnapshot | null;
  closeWorldShortcutGuide(): void;
  pressVirtualGamepad(
    button: "up" | "down" | "left" | "right" | "confirm" | "back" | "bag" | "help",
  ): void;
  releaseVirtualGamepad(
    button: "up" | "down" | "left" | "right" | "confirm" | "back" | "bag" | "help",
  ): void;
  getCanvasSnapshot(): PokeLoungeCanvasSnapshot | null;
  getGameStateSnapshot(): PokeLoungeGameStateSnapshot;
  getRoomSnapshot(): {
    roomId: string | null;
    sessionId: string | null;
  };
  completeTournamentForTest?(): void;
}

type PokeLoungeWindow = Window & {
  __POKE_LOUNGE_E2E__?: PokeLoungeE2eController;
};

const POKE_LOUNGE_LOCALE = "ko-KR";
const LOCAL_ROOM_CODE = "ABC123";

test.describe("Poke Lounge", () => {
  test.afterEach(() => {
    resetRuntimeGameDataJsonStateForTest();
  });

  test("게임 데이터 JSON과 런타임 fallback이 문서화된 배틀 데이터를 유지한다", () => {
    const levelUpMoveTable = readPublicJson("/game-data/level-up-move-table.json") as {
      species?: Record<string, Array<{ level: number; moveId: number }>>;
    };
    const wildBattleMoveSets = readPublicJson("/game-data/wild-battle-move-sets.json") as {
      species?: Record<string, number[]>;
    };

    expect(levelUpMoveTable.species?.["155"]).toContainEqual({ level: 19, moveId: 172 });
    expect(wildBattleMoveSets.species?.["155"]).toEqual([52, 43]);

    const learnedMoves = applyLevelUpPlayerMoves({
      pokemon: {
        speciesId: 155,
        name: "브케인",
        level: 19,
        moves: [
          { id: 52, name: "불꽃세례", pp: 25, maxPp: 25 },
          { id: 108, name: "연막", pp: 20, maxPp: 20 },
          { id: 98, name: "전광석화", pp: 30, maxPp: 30 },
          { id: 52, name: "불꽃세례", pp: 25, maxPp: 25 },
        ],
      },
      previousLevel: 18,
      moveRecords: createTestMoveRecords([52, 98, 108, 172]),
    });

    expect(learnedMoves.pokemon.moves?.map(move => move.id)).toEqual([108, 98, 52, 172]);
    expect(learnedMoves.pokemon.moves?.filter(move => move.id === 172)).toHaveLength(1);
    expect(learnedMoves.pokemon.moves).toHaveLength(4);

    const wildBattleState = createWildBattleState({
      encounter: {
        mapKey: "test-map",
        step: { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
        speciesId: 155,
        name: "브케인",
        level: 10,
      },
      personalRecords: createTestPersonalRecords([152, 155]),
      moveRecords: createTestMoveRecords([33, 43, 45, 52]),
    });

    expect(wildBattleState.opponent.playerId).toBe("wild");
    expect(wildBattleState.opponent.displayName).toBe("야생 브케인");
    expect(wildBattleState.opponent.pokemon.moves.map(move => move.id)).toEqual([52, 43]);
  });

  test("startup-loaded runtime game data는 유효한 species만 JSON을 우선하고 누락/오염 species는 fallback한다", async () => {
    await loadRuntimeGameDataJson(
      createRuntimeGameDataFetcher({
        [LEVEL_UP_MOVE_TABLE_JSON_PATH]: {
          version: 1,
          species: {
            "155": [{ level: 19, moveId: 345 }],
            "158": { invalid: true },
          },
        },
        [WILD_BATTLE_MOVE_SETS_JSON_PATH]: {
          version: 1,
          species: {
            "155": [345, 43, 345],
            "152": "bad-data",
          },
        },
        [BATTLE_POKEMON_ASSETS_JSON_PATH]: {
          version: 1,
          species: {
            "155": {
              front: { path: "/assets/pokemon/front/155-runtime.png", width: 161, height: 81 },
              back: {
                path: "/assets/pokemon/battle/155/back-runtime.png",
                width: 162,
                height: 82,
              },
            },
            "158": {
              front: { path: "/broken/front.png", width: 160, height: 80 },
              back: { path: "/assets/pokemon/back/158-runtime.png", width: 160, height: 80 },
            },
          },
          extractedRanges: [{ startSpeciesId: 1, endSpeciesId: 10, front: null, back: null }],
        },
      }),
    );

    const runtimePreferredMoves = applyLevelUpPlayerMoves({
      pokemon: {
        speciesId: 155,
        name: "브케인",
        level: 19,
        moves: [
          { id: 52, name: "불꽃세례", pp: 25, maxPp: 25 },
          { id: 108, name: "연막", pp: 20, maxPp: 20 },
          { id: 98, name: "전광석화", pp: 30, maxPp: 30 },
        ],
      },
      previousLevel: 18,
      moveRecords: createTestMoveRecords([52, 98, 108, 345]),
    });
    expect(runtimePreferredMoves.pokemon.moves?.map(move => move.id)).toEqual([52, 108, 98, 345]);

    const fallbackLevelUpMoves = applyLevelUpPlayerMoves({
      pokemon: {
        speciesId: 158,
        name: "리아코",
        level: 15,
        moves: [
          { id: 10, name: "할퀴기", pp: 35, maxPp: 35 },
          { id: 43, name: "째려보기", pp: 30, maxPp: 30 },
        ],
      },
      previousLevel: 14,
      moveRecords: createTestMoveRecords([10, 43, 184]),
    });
    expect(fallbackLevelUpMoves.pokemon.moves?.map(move => move.id)).toEqual([10, 43, 184]);

    const runtimePreferredWildBattleState = createWildBattleState({
      encounter: {
        mapKey: "test-map",
        step: { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
        speciesId: 155,
        name: "브케인",
        level: 10,
      },
      personalRecords: createTestPersonalRecords([152, 155]),
      moveRecords: createTestMoveRecords([33, 43, 45, 345]),
    });
    expect(runtimePreferredWildBattleState.opponent.pokemon.moves.map(move => move.id)).toEqual([
      345, 43,
    ]);

    const fallbackWildBattleState = createWildBattleState({
      encounter: {
        mapKey: "test-map",
        step: { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
        speciesId: 152,
        name: "치코리타",
        level: 10,
      },
      personalRecords: createTestPersonalRecords([152, 155]),
      moveRecords: createTestMoveRecords([33, 43, 45, 345]),
    });
    expect(fallbackWildBattleState.opponent.pokemon.moves.map(move => move.id)).toEqual([33, 45]);

    expect(getBattlePokemonAssets(155)).toEqual(
      expect.objectContaining({
        front: expect.objectContaining({
          path: "/assets/pokemon/front/155-runtime.png",
          width: 161,
          height: 81,
        }),
        back: expect.objectContaining({
          path: "/assets/pokemon/battle/155/back-runtime.png",
          width: 162,
          height: 82,
        }),
      }),
    );
    expect(getBattlePokemonAssets(158)).toEqual(
      expect.objectContaining({
        front: expect.objectContaining({
          path: "/assets/pokemon/front/158.png",
          width: 160,
          height: 80,
        }),
        back: expect.objectContaining({
          path: "/assets/pokemon/back/158.png",
          width: 160,
          height: 80,
        }),
      }),
    );
    expect(getBattlePokemonAssets(16)).toEqual(
      expect.objectContaining({
        front: expect.objectContaining({
          path: "/assets/pokemon/front/16.png",
          width: 160,
          height: 80,
        }),
        back: expect.objectContaining({
          path: "/assets/pokemon/back/16.png",
          width: 160,
          height: 80,
        }),
      }),
    );
  });

  test("브케인 상대 스프라이트는 160x80 front sheet를 사용한다", () => {
    const assets = getBattlePokemonAssets(155);

    expect(assets.front).toEqual(
      expect.objectContaining({
        path: "/assets/pokemon/front/155.png",
        width: 160,
        height: 80,
      }),
    );
    expect(readPublicPngDimensions(assets.front.path)).toEqual({ width: 160, height: 80 });
  });

  test("야생 조우 설정은 지역별 encounter rate와 slot을 함께 선택한다", () => {
    const config = selectWildEncounterConfig(
      {
        version: 1,
        defaultTableId: "default",
        tables: [
          {
            id: "default",
            mapKeys: ["town"],
            encounterRate: 0.05,
            slots: [{ speciesId: 10, name: "캐터피", minLevel: 3, maxLevel: 5, weight: 1 }],
          },
          {
            id: "rare-field",
            mapKeys: ["town"],
            areaIds: ["rare-field"],
            encounterRate: 0.42,
            slots: [{ speciesId: 16, name: "구구", minLevel: 7, maxLevel: 9, weight: 3 }],
          },
        ],
      },
      "town",
      "rare-field",
    );

    expect(config).toEqual({
      encounterRate: 0.42,
      slots: [{ speciesId: 16, name: "구구", minLevel: 7, maxLevel: 9, weight: 3 }],
    });
  });

  test("게임 센터 카드와 world scene 직접 진입을 검증한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await gotoWithRetry(page, `/${locale}/game`);
    await expect(
      page.getByRole("button", {
        name: new RegExp(escapeRegExp(messages.Game.pokeLoungeTitle)),
      }),
    ).toBeVisible();

    await startSoloGame(page, `/${locale}/game/poke-lounge?scene=world&e2e=1`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game/poke-lounge`));
    await expectActiveScene(page, "world");
    await expect(page.locator("#game-root canvas")).toBeVisible();

    expect(browserErrors.join("\n")).toBe("");
  });

  test("solo 선택 후 스타터를 고르면 world canvas로 진입한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await gotoWithRetry(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("[data-screen='starter-selection']")).toBeHidden();
    await page.locator("[data-room-entry-solo]").click();
    await chooseStarter(page);
    await waitForGameCanvas(page);
    await expect(page.locator("#game-root canvas")).toBeVisible();
    await expectActiveScene(page, "world");

    expect(browserErrors.join("\n")).toBe("");
  });

  test("wild-victory battle scenario가 battle result 상태까지 도달한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await startBattleScenario(page, "wild-victory");
    const result = await resolveBattleResult(page);

    expect(result?.reason).toBe("faint");
    expect(result?.winnerPlayerId).not.toBe("wild");
    await expectActiveScene(page, "battle");
    expect(browserErrors.join("\n")).toBe("");
  });

  test("wild-defeat battle scenario가 battle result 상태까지 도달한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await startBattleScenario(page, "wild-defeat");
    const result = await resolveBattleResult(page);

    expect(result?.reason).toBe("faint");
    expect(result?.winnerPlayerId).toBe("wild");
    await expectActiveScene(page, "battle");
    expect(browserErrors.join("\n")).toBe("");
  });

  test("wildEncounterRate=1 필드 이동 후 야생 전투로 전환한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await startSoloGame(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?wildEncounterRate=1&e2e=1`);
    await dismissWorldShortcutGuide(page);
    await moveUntilWildBattle(page);

    expect(browserErrors.join("\n")).toBe("");
  });

  test("battle command menu에서 싸운다 선택 후 move select로 전환한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await startBattleScenario(page, "wild-victory");
    await chooseFightCommand(page);

    const snapshot = await getBattleSnapshot(page);
    expect(snapshot?.selectedCommand).toBe("fight");
    expect(snapshot?.selectedCommandLabel).toBe("싸운다");
    expect(snapshot?.phase).toBe("move-select");
    expect(browserErrors.join("\n")).toBe("");
  });

  test("battle 진입 연출과 HP 감소 및 피격 애니메이션을 노출한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await startBattleScenario(page, "wild-victory");
    expect((await getBattleSnapshot(page))?.battleEntrancePlayed).toBe(true);
    await expect
      .poll(
        () => getBattleSnapshot(page).then(snapshot => snapshot?.battleEntrancePlaying ?? true),
        {
          timeout: 5000,
        },
      )
      .toBe(false);

    await chooseFightCommand(page);
    const before = await getBattleSnapshot(page);
    expect(before?.opponent.currentHp).toBeGreaterThan(0);

    await page.evaluate(() => {
      const pokeWindow = window as PokeLoungeWindow;

      pokeWindow.__POKE_LOUNGE_E2E__?.setBattleMoveIndex(0);
      pokeWindow.__POKE_LOUNGE_E2E__?.confirmBattle();
    });

    await expect
      .poll(
        async () => {
          const snapshot = await getBattleSnapshot(page);

          return Boolean(
            snapshot &&
            snapshot.hpAnimationStartedCount > (before?.hpAnimationStartedCount ?? 0) &&
            snapshot.hitAnimationStartedCount > (before?.hitAnimationStartedCount ?? 0) &&
            snapshot.opponent.hitAnimationStartedCount >
              (before?.opponent.hitAnimationStartedCount ?? 0) &&
            snapshot.opponent.currentHp < (before?.opponent.currentHp ?? 0) &&
            snapshot.opponent.displayedCurrentHp >= snapshot.opponent.currentHp,
          );
        },
        { timeout: 2000 },
      )
      .toBe(true);
    await expect
      .poll(
        async () => {
          const snapshot = await getBattleSnapshot(page);

          return Boolean(
            snapshot &&
            !snapshot.hpAnimationPlaying &&
            !snapshot.hitAnimationPlaying &&
            snapshot.opponent.displayedCurrentHp === snapshot.opponent.currentHp,
          );
        },
        { timeout: 5000 },
      )
      .toBe(true);

    expect(browserErrors.join("\n")).toBe("");
  });

  test("network=local room 생성, 참가, 나가기 흐름을 검증한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await gotoWithRetry(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("[data-screen='starter-selection']")).toBeHidden();

    await page.locator("[data-room-entry-create]").click();
    await chooseStarter(page);
    await waitForGameCanvas(page);
    await expectRoomOnline(page);
    await page.locator("[data-room-leave]").click();
    await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30000 });

    await page.locator("[data-room-entry-code]").fill(LOCAL_ROOM_CODE);
    await page.locator("[data-room-entry-join]").click();
    await waitForGameCanvas(page);
    await expectRoomOnline(page, LOCAL_ROOM_CODE);
    await page.locator("[data-room-leave]").click();
    await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30000 });

    await gotoWithRetry(
      page,
      `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?network=local&room=${LOCAL_ROOM_CODE}&e2e=1`,
    );
    await continuePastOptionalStarter(page);
    await expectRoomOnline(page, LOCAL_ROOM_CODE);
    await page.locator("[data-room-leave]").click();
    await expect(page).not.toHaveURL(/network=local|room=/);
    await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30000 });

    expect(browserErrors.join("\n")).toBe("");
  });

  test("roundMs=1000로 라운드 타이머가 tournament phase로 넘어간다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await startSoloGame(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?roundMs=1000&e2e=1`);
    await expect
      .poll(() => getGameStateSnapshot(page).then(state => state?.round.phase ?? null), {
        timeout: 10000,
      })
      .toBe("tournament");

    expect(browserErrors.join("\n")).toBe("");
  });

  test("desktop/mobile canvas framing과 fullscreen fallback을 검증한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "maxTouchPoints", {
        configurable: true,
        get: () => 5,
      });
      Object.defineProperty(navigator, "platform", {
        configurable: true,
        get: () => "iPhone",
      });
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () =>
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      });
      Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
        configurable: true,
        value: undefined,
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await startSoloGame(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await expectCanvasFramed(page, { maxWidth: 1024, viewportWidth: 1280, viewportHeight: 900 });

    await page.setViewportSize({ width: 390, height: 844 });
    await expectCanvasFramed(page, { maxWidth: 390, viewportWidth: 390, viewportHeight: 844 });
    await expectMobileTouchLayout(page);
    await expectMobileTouchPressAnimation(page);

    await page.setViewportSize({ width: 360, height: 780 });
    await expectCanvasFramed(page, { maxWidth: 360, viewportWidth: 360, viewportHeight: 780 });
    await expectMobileTouchLayout(page);

    await page.setViewportSize({ width: 844, height: 390 });
    await expectCanvasFramed(page, { maxWidth: 844, viewportWidth: 844, viewportHeight: 390 });
    await expectNoViewportOverflow(page);

    await page.locator("[data-fullscreen-toggle]").click();
    await expect(page.getByTestId("poke-lounge-page")).toHaveClass(/is-game-fullscreen-fallback/);
    await expect
      .poll(() =>
        page.evaluate(() => document.body.classList.contains("is-game-fullscreen-fallback-active")),
      )
      .toBe(true);

    expect(browserErrors.join("\n")).toBe("");
  });

  test("mobile room entry와 starter 선택 UI가 뷰포트 폭을 넘지 않는다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await page.setViewportSize({ width: 360, height: 780 });
    await gotoWithRetry(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await continueToRoomEntry(page);
    await expectNoViewportOverflow(page);

    await page.locator("[data-room-entry-solo]").click();
    await expect(page.locator("[data-screen='starter-selection']")).toBeVisible({ timeout: 30000 });
    await expectNoViewportOverflow(page);

    expect(browserErrors.join("\n")).toBe("");
  });

  test("최종 결과에서 Poke Lounge 점수를 명시적으로 제출한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    const submittedPayloads: unknown[] = [];

    await mockAuthenticatedSession(page);
    await page.route("**/game/result", async route => {
      const request = route.request();
      submittedPayloads.push(request.postDataJSON());

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "123e4567-e89b-42d3-a456-426614174000",
            score: 300,
            gameType: "POKE_LOUNGE",
            createdAt: new Date("2026-07-06T00:00:00.000Z").toISOString(),
            user: { displayName: "Poke Player" },
            rank: 1,
            bestScore: 300,
            allTimeRank: 1,
            weeklyRank: 1,
          },
        }),
      });
    });

    await startSoloGame(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await page.evaluate(() => {
      const pokeWindow = window as PokeLoungeWindow;

      pokeWindow.__POKE_LOUNGE_E2E__?.completeTournamentForTest?.();
    });

    await expect(page.getByTestId("poke-lounge-result-submit")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("poke-lounge-result-score")).toHaveText("300");
    await page.getByTestId("poke-lounge-result-submit").click();

    await expect(page.getByTestId("poke-lounge-result-status")).toContainText("기록되었습니다");
    expect(submittedPayloads).toHaveLength(1);
    expect(submittedPayloads[0]).toMatchObject({
      score: 300,
      gameType: "POKE_LOUNGE",
    });
    expect((submittedPayloads[0] as { playTime?: number }).playTime).toBeGreaterThanOrEqual(1);
    expect(browserErrors.join("\n")).toBe("");
  });
});

function readPublicPngDimensions(publicPath: string): { width: number; height: number } {
  const filePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  const header = fs.readFileSync(filePath).subarray(16, 24);

  return {
    width: header.readUInt32BE(0),
    height: header.readUInt32BE(4),
  };
}

function readPublicJson(publicPath: string): unknown {
  const filePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function createRuntimeGameDataFetcher(fixtures: Record<string, unknown>) {
  return async (input: string | URL | Request): Promise<Response> => {
    const requestPath =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.pathname
          : new URL(input.url).pathname;
    const body = fixtures[requestPath];

    if (body === undefined) {
      return new Response(null, { status: 404 });
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function createTestMoveRecords(moveIds: number[]) {
  return {
    moves: Object.fromEntries(
      moveIds.map(moveId => [
        String(moveId),
        {
          index: moveId,
          raw_hex: "",
          refined_candidate_fields: {
            pp: { value: 20, offset: 0, width: 1 },
            type: { value: 10, offset: 0, width: 1 },
            power: { value: 40, offset: 0, width: 1 },
            accuracy: { value: 100, offset: 0, width: 1 },
            effect: { value: 0, offset: 0, width: 1 },
            category: { value: 2, offset: 0, width: 1 },
          },
        },
      ]),
    ),
  };
}

function createTestPersonalRecords(speciesIds: number[]) {
  return {
    records: speciesIds.map(speciesId => ({
      index: speciesId,
      catch_rate: 45,
      base_exp: 65,
      growth_rate: 3,
      base_stats: {
        hp: 45,
        attack: 49,
        defense: 49,
        special_attack: 65,
        special_defense: 65,
        speed: 45,
      },
      types: { primary: 10, secondary: null },
    })),
  };
}

function collectBrowserErrors(page: Page): string[] {
  const browserErrors: string[] = [];

  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });

  return browserErrors;
}

async function startSoloGame(page: Page, routePath: string): Promise<void> {
  await gotoWithRetry(page, routePath);
  await continueToRoomEntry(page);
  await page.locator("[data-room-entry-solo]").click();
  await chooseStarterIfNeeded(page);
  await waitForGameCanvas(page);
}

async function startBattleScenario(page: Page, scenario: PokeLoungeBattleScenario): Promise<void> {
  await startSoloGame(
    page,
    `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?scene=battle&e2eBattle=${scenario}&e2e=1`,
  );
  await expectActiveScene(page, "battle");
}

async function chooseStarter(page: Page): Promise<void> {
  await expect(page.locator("[data-screen='starter-selection']")).toBeVisible({ timeout: 30000 });
  await page.locator("[data-starter-confirm]").click();
}

async function chooseStarterIfNeeded(page: Page): Promise<void> {
  const starterSelection = page.locator("[data-screen='starter-selection']");
  const gameCanvas = page.locator("#game-root canvas");

  await expect
    .poll(
      async () => {
        if (await starterSelection.isVisible().catch(() => false)) {
          return "starter";
        }

        if (await gameCanvas.isVisible().catch(() => false)) {
          return "canvas";
        }

        return null;
      },
      { timeout: 30000 },
    )
    .not.toBeNull();

  if (await starterSelection.isVisible().catch(() => false)) {
    await page.locator("[data-starter-confirm]").click();
  }
}

async function continueToRoomEntry(page: Page): Promise<void> {
  const roomEntryScreen = page.locator("[data-room-entry-screen='true']");

  await expect(roomEntryScreen).toBeVisible({ timeout: 30000 });
}

async function waitForGameCanvas(page: Page): Promise<void> {
  await expect(page.getByTestId("poke-lounge-page")).toBeVisible();
  await expect(page.getByTestId("poke-lounge-game-root")).toBeVisible();
  await expect(page.locator("#game-root canvas")).toBeVisible({ timeout: 30000 });
  await waitForE2eController(page);
}

async function waitForE2eController(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const pokeWindow = window as PokeLoungeWindow;

          return Boolean(pokeWindow.__POKE_LOUNGE_E2E__);
        }),
      { timeout: 30000 },
    )
    .toBe(true);
}

async function expectActiveScene(
  page: Page,
  scene: PokeLoungeSceneKey,
  timeout = 30000,
): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const pokeWindow = window as PokeLoungeWindow;

          return pokeWindow.__POKE_LOUNGE_E2E__?.getActiveSceneKey() ?? null;
        }),
      { timeout },
    )
    .toBe(scene);
}

async function chooseFightCommand(page: Page): Promise<void> {
  await expect
    .poll(() => getBattleSnapshot(page).then(snapshot => snapshot?.phase ?? null), {
      timeout: 30000,
    })
    .toBe("command");
  await expect
    .poll(() => getBattleSnapshot(page).then(snapshot => snapshot?.battleEntrancePlaying ?? true), {
      timeout: 5000,
    })
    .toBe(false);

  await page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    pokeWindow.__POKE_LOUNGE_E2E__?.drainBattleMessages();
    pokeWindow.__POKE_LOUNGE_E2E__?.setBattleCommand("fight");
    pokeWindow.__POKE_LOUNGE_E2E__?.confirmBattle();
  });

  await expect
    .poll(() => getBattleSnapshot(page).then(snapshot => snapshot?.phase ?? null), {
      timeout: 30000,
    })
    .toBe("move-select");
}

async function resolveBattleResult(page: Page): Promise<PokeLoungeBattleSnapshot["result"] | null> {
  await chooseFightCommand(page);
  await page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    pokeWindow.__POKE_LOUNGE_E2E__?.setBattleMoveIndex(0);
    pokeWindow.__POKE_LOUNGE_E2E__?.confirmBattle();
  });

  await expect
    .poll(() => getBattleSnapshot(page).then(snapshot => snapshot?.result ?? null), {
      timeout: 30000,
    })
    .not.toBe(null);

  return (await getBattleSnapshot(page))?.result ?? null;
}

async function getBattleSnapshot(page: Page): Promise<PokeLoungeBattleSnapshot | null> {
  return page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    return pokeWindow.__POKE_LOUNGE_E2E__?.getBattleSnapshot() ?? null;
  });
}

async function getGameStateSnapshot(page: Page): Promise<PokeLoungeGameStateSnapshot | null> {
  return page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    return pokeWindow.__POKE_LOUNGE_E2E__?.getGameStateSnapshot() ?? null;
  });
}

async function expectRoomOnline(page: Page, roomId?: string): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const pokeWindow = window as PokeLoungeWindow;

          return pokeWindow.__POKE_LOUNGE_E2E__?.getRoomSnapshot() ?? null;
        }),
      { timeout: 30000 },
    )
    .toMatchObject({
      ...(roomId ? { roomId } : {}),
      sessionId: expect.any(String),
    });
}

async function expectCanvasFramed(
  page: Page,
  {
    maxWidth,
    viewportHeight,
    viewportWidth,
  }: { maxWidth: number; viewportHeight: number; viewportWidth: number },
): Promise<void> {
  await expect
    .poll(
      async () => {
        const snapshot = await getCanvasSnapshot(page);
        const layout = await getPokeLoungeLayoutSnapshot(page);
        const canvasAspectRatio = (snapshot?.clientWidth ?? 0) / (snapshot?.clientHeight ?? 1);
        const rootAspectRatio = (layout?.root?.width ?? 0) / (layout?.root?.height ?? 1);

        return Boolean(
          snapshot &&
          layout &&
          layout.root &&
          snapshot.width === 768 &&
          snapshot.height === 576 &&
          snapshot.clientWidth <= maxWidth &&
          snapshot.clientWidth <= viewportWidth &&
          snapshot.clientHeight <= viewportHeight &&
          layout.root.width <= maxWidth &&
          layout.root.width <= viewportWidth &&
          layout.root.height <= viewportHeight &&
          layout.documentScrollWidth <= layout.innerWidth + 1 &&
          layout.bodyScrollWidth <= layout.innerWidth + 1 &&
          Math.abs(canvasAspectRatio - 4 / 3) < 0.03 &&
          Math.abs(rootAspectRatio - 4 / 3) < 0.03,
        );
      },
      {
        timeout: 10000,
      },
    )
    .toBe(true);

  const snapshot = await getCanvasSnapshot(page);
  const layout = await getPokeLoungeLayoutSnapshot(page);

  expect(snapshot).not.toBeNull();
  expect(layout).not.toBeNull();
  expect(layout?.root).not.toBeNull();
  expect(snapshot?.width).toBe(768);
  expect(snapshot?.height).toBe(576);
  expect(snapshot?.clientWidth).toBeLessThanOrEqual(maxWidth);
  expect(snapshot?.clientWidth).toBeLessThanOrEqual(viewportWidth);
  expect(snapshot?.clientHeight).toBeLessThanOrEqual(viewportHeight);
  expect(layout?.root?.width).toBeLessThanOrEqual(maxWidth);
  expect(layout?.root?.width).toBeLessThanOrEqual(viewportWidth);
  expect(layout?.root?.height).toBeLessThanOrEqual(viewportHeight);
  expect(layout?.documentScrollWidth).toBeLessThanOrEqual((layout?.innerWidth ?? 0) + 1);
  expect(layout?.bodyScrollWidth).toBeLessThanOrEqual((layout?.innerWidth ?? 0) + 1);
  expect(
    Math.abs((snapshot?.clientWidth ?? 0) / (snapshot?.clientHeight ?? 1) - 4 / 3),
  ).toBeLessThan(0.03);
  expect(Math.abs((layout?.root?.width ?? 0) / (layout?.root?.height ?? 1) - 4 / 3)).toBeLessThan(
    0.03,
  );
}

async function expectMobileTouchLayout(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.querySelector("#game-root")?.getBoundingClientRect();
          const controls = document
            .querySelector("[data-mobile-touch-controls]")
            ?.getBoundingClientRect();
          const dpad = document
            .querySelector(".mobile-touch-controls__dpad")
            ?.getBoundingClientRect();
          const actions = document
            .querySelector(".mobile-touch-controls__actions")
            ?.getBoundingClientRect();
          const pageRoot = document
            .querySelector("[data-testid='poke-lounge-page']")
            ?.getBoundingClientRect();
          const buttons = Array.from(document.querySelectorAll("[data-mobile-control]"), element =>
            element.getBoundingClientRect(),
          );

          if (!root || !controls || !dpad || !actions || !pageRoot || buttons.length === 0) {
            return false;
          }

          const buttonsInsideViewport = buttons.every(
            rect =>
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= window.innerWidth &&
              rect.bottom <= window.innerHeight,
          );

          return (
            root.top - pageRoot.top <= 24 &&
            controls.top >= root.bottom + 8 &&
            controls.height >= 136 &&
            controls.left >= 0 &&
            controls.right <= window.innerWidth &&
            controls.bottom <= window.innerHeight &&
            dpad.right + 12 <= actions.left &&
            buttonsInsideViewport
          );
        }),
      { timeout: 10000 },
    )
    .toBe(true);

  await expectNoViewportOverflow(page);
}

async function expectNoViewportOverflow(page: Page): Promise<void> {
  const layout = await getPokeLoungeLayoutSnapshot(page);

  expect(layout).not.toBeNull();
  expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
}

async function getPokeLoungeLayoutSnapshot(page: Page): Promise<{
  bodyScrollWidth: number;
  documentScrollWidth: number;
  innerWidth: number;
  root: { height: number; width: number } | null;
}> {
  return page.evaluate(() => {
    const root = document.querySelector("#game-root")?.getBoundingClientRect();

    return {
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      root: root
        ? {
            height: root.height,
            width: root.width,
          }
        : null,
    };
  });
}

async function expectMobileTouchPressAnimation(page: Page): Promise<void> {
  const confirmButton = page.locator("[data-mobile-control='confirm']");

  await expect(confirmButton).toBeVisible();
  await confirmButton.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
  });
  await expect(confirmButton).toHaveAttribute("data-pressed", "true");
  await confirmButton.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
  });
  await expect(confirmButton).not.toHaveAttribute("data-pressed", "true");
}

async function getCanvasSnapshot(page: Page): Promise<PokeLoungeCanvasSnapshot | null> {
  return page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    return pokeWindow.__POKE_LOUNGE_E2E__?.getCanvasSnapshot() ?? null;
  });
}

async function continuePastOptionalStarter(page: Page): Promise<void> {
  await chooseStarterIfNeeded(page);
  await waitForGameCanvas(page);
}

async function dismissWorldShortcutGuide(page: Page): Promise<void> {
  await expect
    .poll(() => getWorldSnapshot(page).then(snapshot => Boolean(snapshot?.player)), {
      timeout: 30000,
    })
    .toBe(true);

  await expect
    .poll(() => getWorldSnapshot(page).then(snapshot => snapshot?.shortcutGuideOpen ?? false), {
      timeout: 10000,
    })
    .toBe(true);

  await page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    pokeWindow.__POKE_LOUNGE_E2E__?.closeWorldShortcutGuide();
  });

  await expect
    .poll(() => getWorldSnapshot(page).then(snapshot => snapshot?.shortcutGuideOpen ?? true), {
      timeout: 10000,
    })
    .toBe(false);
}

async function moveUntilWildBattle(page: Page): Promise<void> {
  const directions = ["right", "left", "down", "up"] as const;
  const snapshots: PokeLoungeWorldSnapshot[] = [];

  for (const direction of directions) {
    const beforeMove = await getWorldSnapshot(page);
    await pressVirtualGamepad(page, direction);

    try {
      await page
        .waitForFunction(
          ([startPosition]) => {
            const pokeWindow = window as PokeLoungeWindow;

            if (pokeWindow.__POKE_LOUNGE_E2E__?.getActiveSceneKey() === "battle") {
              return true;
            }

            const snapshot = pokeWindow.__POKE_LOUNGE_E2E__?.getWorldSnapshot();

            return Boolean(
              snapshot?.player &&
              !snapshot.shortcutGuideOpen &&
              startPosition &&
              (snapshot.player.x !== startPosition.x || snapshot.player.y !== startPosition.y),
            );
          },
          [beforeMove?.player ?? null],
          { timeout: 2000 },
        )
        .catch(() => {});

      const transitioned = await page
        .waitForFunction(
          () => {
            const pokeWindow = window as PokeLoungeWindow;

            return pokeWindow.__POKE_LOUNGE_E2E__?.getActiveSceneKey() === "battle";
          },
          undefined,
          { timeout: 8000 },
        )
        .then(() => true)
        .catch(() => false);

      if (transitioned) {
        return;
      }

      const snapshot = await getWorldSnapshot(page);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    } finally {
      await releaseVirtualGamepad(page, direction);
    }
  }

  throw new Error(`Wild battle did not start after field movement: ${JSON.stringify(snapshots)}`);
}

async function getWorldSnapshot(page: Page): Promise<PokeLoungeWorldSnapshot | null> {
  return page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    return pokeWindow.__POKE_LOUNGE_E2E__?.getWorldSnapshot() ?? null;
  });
}

async function pressVirtualGamepad(
  page: Page,
  button: Parameters<PokeLoungeE2eController["pressVirtualGamepad"]>[0],
): Promise<void> {
  await page.evaluate(selectedButton => {
    const pokeWindow = window as PokeLoungeWindow;

    pokeWindow.__POKE_LOUNGE_E2E__?.pressVirtualGamepad(selectedButton);
  }, button);
}

async function releaseVirtualGamepad(
  page: Page,
  button: Parameters<PokeLoungeE2eController["releaseVirtualGamepad"]>[0],
): Promise<void> {
  await page.evaluate(selectedButton => {
    const pokeWindow = window as PokeLoungeWindow;

    pokeWindow.__POKE_LOUNGE_E2E__?.releaseVirtualGamepad(selectedButton);
  }, button);
}

async function mockAuthenticatedSession(page: Page): Promise<void> {
  await page.route("**/api/auth/session", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          name: "Poke Player",
          email: "poke@example.com",
        },
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        idToken: createTestJwt(),
        idTokenExpiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
      }),
    });
  });
}

function createTestJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }),
  ).toString("base64url");

  return `${header}.${payload}.signature`;
}
