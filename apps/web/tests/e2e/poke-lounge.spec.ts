import fs from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { choosePlayerMove } from "../../src/components/poke-lounge/runtime/game/battle/battleLogic";
import { applyLevelUpPlayerMoves } from "../../src/components/poke-lounge/runtime/game/battle/levelUpMoves";
import { createSampleBattleState } from "../../src/components/poke-lounge/runtime/game/battle/battleSampleState";
import { createWildBattleState } from "../../src/components/poke-lounge/runtime/game/battle/wildBattleFactory";
import type { BattleMove } from "../../src/components/poke-lounge/runtime/game/battle/battleTypes";
import { getBattlePokemonAssets } from "../../src/components/poke-lounge/runtime/game/battle/battlePokemonAssets";
import {
  createPartyHudSlotViews,
  PARTY_HUD_SLOT_GAP,
  PARTY_HUD_SLOT_SIZE,
  resolvePartyHudAnchor,
} from "../../src/components/poke-lounge/runtime/game/ui/partyHud";
import {
  BATTLE_POKEMON_ASSETS_JSON_PATH,
  LEVEL_UP_MOVE_TABLE_JSON_PATH,
  POKEMON_DATA_JSON_PATH,
  WILD_BATTLE_MOVE_SETS_JSON_PATH,
  getRuntimePokemonDataRecordCountForTest,
  loadRuntimeGameDataJson,
  resetRuntimeGameDataJsonStateForTest,
} from "../../src/components/poke-lounge/runtime/game/data/game-data-json";
import {
  BATTLE_LAYOUT,
  getBattleOptionIndexAtPoint,
  resolveBattleOptionSlotRects,
} from "../../src/components/poke-lounge/runtime/game/battle/battleLayout";
import {
  createDefaultRoundState,
  DEFAULT_PREPARATION_DURATION_MS,
  getRoundRemainingMs,
  startPreparationRound,
} from "../../src/components/poke-lounge/runtime/game/round/roundState";
import { selectWildEncounterConfig } from "../../src/components/poke-lounge/runtime/game/world/wildEncounterTables";
import { WILD_ENCOUNTER_RATE } from "../../src/components/poke-lounge/runtime/game/world/wildEncounters";
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
  message: string | null;
  messageQueue: string[];
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
  currentPlayerId: string;
  playersById: Record<
    string,
    {
      party: Array<{
        pokemon?: {
          currentHp?: number;
          status?: string;
        } | null;
      }>;
    }
  >;
  session: {
    roomId: string | null;
    sessionId: string | null;
    connectionStatus: "offline" | "connecting" | "online";
  };
  round: {
    phase: "waiting" | "preparation" | "tournament" | "round-result" | "game-result";
    preparationDurationMs: number;
  };
}

interface PokeLoungeWorldSnapshot {
  player: {
    x: number;
    y: number;
    facing: "front" | "back" | "left" | "right";
    displayWidth: number;
    displayHeight: number;
  } | null;
  camera: {
    zoom: number;
  };
  shortcutGuideOpen: boolean;
  encounterLocked: boolean;
  battleIntroPlaying: boolean;
  pokemonStatusPanel: {
    slotIndex: number;
    name: string;
    level: number;
    currentHp: number | null;
    maxHp: number | null;
    status: string;
  } | null;
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
  __POKE_LOUNGE_COPIED_TEXT__?: string;
};

const POKE_LOUNGE_LOCALE = "ko-KR";
const LOCAL_ROOM_CODE = "ABC123";

test.describe("Poke Lounge", () => {
  test.afterEach(() => {
    resetRuntimeGameDataJsonStateForTest();
  });

  test("게임 데이터 JSON과 런타임 fallback이 문서화된 배틀 데이터를 유지한다", () => {
    const pokemonData = readPublicJson(POKEMON_DATA_JSON_PATH) as {
      stats?: { pokemonRecords?: number; moveRecords?: number; learnsetSpecies?: number };
      species?: Record<
        string,
        {
          baseStats?: Record<string, number>;
          types?: { ids?: number[]; names?: string[] };
          levelUpMoves?: Array<{ level: number; moveId: number }>;
        }
      >;
      moves?: Record<string, unknown>;
    };
    const levelUpMoveTable = readPublicJson("/game-data/level-up-move-table.json") as {
      species?: Record<string, Array<{ level: number; moveId: number }>>;
    };
    const wildBattleMoveSets = readPublicJson("/game-data/wild-battle-move-sets.json") as {
      species?: Record<string, number[]>;
    };
    const audioManifest = readPublicJson("/assets/poke-lounge/audio/audio-manifest.json") as {
      bgm?: Array<{
        id: string;
        src: string;
        durationMs: number;
        sizeBytes: number;
        defaultVolume: number;
        source?: {
          sdatPath?: string;
          sequenceIndex?: number;
          sequenceName?: string;
        };
      }>;
    };

    expect(pokemonData.stats).toEqual({
      pokemonRecords: 500,
      moveRecords: 471,
      learnsetSpecies: 500,
    });
    expect(Object.keys(pokemonData.species ?? {})).toHaveLength(500);
    expect(Object.keys(pokemonData.moves ?? {})).toHaveLength(471);
    expect(pokemonData.species?.["152"]).toMatchObject({
      baseStats: {
        hp: 45,
        attack: 49,
        defense: 65,
        speed: 45,
        specialAttack: 49,
        specialDefense: 65,
      },
      types: { ids: [12], names: ["풀"] },
    });
    expect(pokemonData.species?.["152"].levelUpMoves).toEqual(
      expect.arrayContaining([
        { level: 1, moveId: 33 },
        { level: 45, moveId: 76 },
      ]),
    );
    expect(Object.keys(levelUpMoveTable.species ?? {})).toHaveLength(500);
    expect(levelUpMoveTable.species?.["152"]).toEqual(
      expect.arrayContaining([
        { level: 1, moveId: 33 },
        { level: 45, moveId: 76 },
      ]),
    );
    expect(levelUpMoveTable.species?.["155"]).toContainEqual({ level: 19, moveId: 172 });
    expect(wildBattleMoveSets.species?.["155"]).toEqual([52, 43]);
    const fieldDayBgm = audioManifest.bgm?.find(item => item.id === "field-day");
    expect(fieldDayBgm).toMatchObject({
      id: "field-day",
      src: "/assets/poke-lounge/audio/bgm/field-day.mp3",
      durationMs: 30000,
      defaultVolume: 0.24,
      source: {
        sdatPath: "data/sound/gs_sound_data.sdat",
        sequenceIndex: 1028,
        sequenceName: "SEQ_GS_R_1_29",
      },
    });
    expect(fieldDayBgm?.sizeBytes).toBe(
      fs.statSync(path.join(process.cwd(), "public/assets/poke-lounge/audio/bgm/field-day.mp3"))
        .size,
    );

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
        level: 19,
      },
      personalRecords: createTestPersonalRecords([152, 155]),
      moveRecords: createTestMoveRecords([33, 43, 45, 52, 98, 108, 172]),
    });

    expect(wildBattleState.opponent.playerId).toBe("wild");
    expect(wildBattleState.opponent.displayName).toBe("야생 브케인");
    expect(wildBattleState.opponent.pokemon.moves.map(move => move.id)).toEqual([108, 52, 98, 172]);
  });

  test("startup-loaded runtime game data는 유효한 species만 JSON을 우선하고 누락/오염 species는 fallback한다", async () => {
    await loadRuntimeGameDataJson(
      createRuntimeGameDataFetcher({
        [POKEMON_DATA_JSON_PATH]: {
          version: 1,
          species: {
            "1": { speciesId: 1, baseStats: { hp: 45 } },
          },
        },
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
    expect(getRuntimePokemonDataRecordCountForTest()).toBe(1);

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
        level: 19,
      },
      personalRecords: createTestPersonalRecords([152, 155]),
      moveRecords: createTestMoveRecords([33, 43, 45, 345]),
    });
    expect(runtimePreferredWildBattleState.opponent.pokemon.moves.map(move => move.id)).toEqual([
      345,
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
      moveRecords: createTestMoveRecords([33, 43, 45, 75, 77, 345]),
    });
    expect(fallbackWildBattleState.opponent.pokemon.moves.map(move => move.id)).toEqual([75, 77]);

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

  test("전투 옵션 레이아웃은 하단 전체 폭의 좌상/우상/좌하/우하 슬롯을 제공한다", () => {
    expect(BATTLE_LAYOUT.commandWindow).toEqual(BATTLE_LAYOUT.bottomWindow);
    expect(BATTLE_LAYOUT.moveWindow).toEqual(BATTLE_LAYOUT.bottomWindow);
    expect(resolveBattleOptionSlotRects(BATTLE_LAYOUT.bottomWindow)).toEqual([
      { x: 6, y: 150, width: 120, height: 16 },
      { x: 130, y: 150, width: 120, height: 16 },
      { x: 6, y: 170, width: 120, height: 16 },
      { x: 130, y: 170, width: 120, height: 16 },
    ]);
    expect(getBattleOptionIndexAtPoint({ x: 64, y: 156 }, BATTLE_LAYOUT.bottomWindow)).toBe(0);
    expect(getBattleOptionIndexAtPoint({ x: 192, y: 156 }, BATTLE_LAYOUT.bottomWindow)).toBe(1);
    expect(getBattleOptionIndexAtPoint({ x: 64, y: 180 }, BATTLE_LAYOUT.bottomWindow)).toBe(2);
    expect(getBattleOptionIndexAtPoint({ x: 192, y: 180 }, BATTLE_LAYOUT.bottomWindow)).toBe(3);
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

  test("party HUD는 front sheet에서 포켓몬 한 프레임만 표시한다", () => {
    const [slot] = createPartyHudSlotViews({
      activePartySlotIndex: 0,
      anchor: "middle-left",
      party: [
        {
          slotIndex: 0,
          pokemon: {
            speciesId: 155,
            name: "치코리타",
            level: 10,
          },
        },
      ],
      screenSize: { width: 768, height: 576 },
    });

    expect((slot?.pokemon as { spriteCrop?: unknown } | null)?.spriteCrop).toEqual({
      x: 0,
      y: 0,
      width: 80,
      height: 80,
    });
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

  test("야생 조우 기본 확률은 15퍼센트로 유지한다", () => {
    const tableData = readPublicJson("/game-data/wild-encounter-tables.json") as {
      tables?: Array<{ encounterRate?: unknown }>;
    };

    expect(WILD_ENCOUNTER_RATE).toBe(0.15);
    expect(tableData.tables?.map(table => table.encounterRate)).toEqual([0.15, 0.15, 0.15, 0.15]);
  });

  test("전투 계산은 우선도, 상대 랜덤 기술, 타입 상성을 반영한다", () => {
    const baseState = createSampleBattleState();
    const fireMove = createBattleMoveFixture({
      accuracy: 100,
      category: "special",
      effectCode: 4,
      id: 52,
      name: "불꽃세례",
      power: 40,
      type: "불꽃",
      typeId: 10,
    });
    const tackle = createBattleMoveFixture({
      accuracy: 100,
      category: "physical",
      effectCode: 0,
      id: 33,
      name: "몸통박치기",
      power: 35,
      type: "노말",
      typeId: 0,
    });
    const quickAttack = createBattleMoveFixture({
      accuracy: 100,
      category: "physical",
      effectCode: 103,
      id: 98,
      name: "전광석화",
      power: 40,
      type: "노말",
      typeId: 0,
    });
    const battleState = {
      ...baseState,
      phase: "move-select" as const,
      messageQueue: [],
      player: {
        ...baseState.player,
        pokemon: {
          ...baseState.player.pokemon,
          speed: 100,
          typeIds: [10],
          moves: [fireMove],
        },
      },
      opponent: {
        ...baseState.opponent,
        pokemon: {
          ...baseState.opponent.pokemon,
          currentHp: baseState.opponent.pokemon.maxHp,
          speed: 1,
          typeIds: [12],
          moves: [tackle, quickAttack],
        },
      },
    };

    const resolved = choosePlayerMove(battleState, 0, {
      random: createRandomSequence([0.75, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99]),
    });

    expect(resolved.messageQueue[0]).toBe("브케인의 전광석화!");
    expect(resolved.messageQueue).toContain("치코리타의 불꽃세례!");
    expect(resolved.messageQueue).toContain("효과는 굉장했다!");
    expect(resolved.player.pokemon.currentHp).toBeLessThan(battleState.player.pokemon.currentHp);
    expect(resolved.opponent.pokemon.currentHp).toBeLessThan(
      battleState.opponent.pokemon.currentHp,
    );
  });

  test("토너먼트 사이 기본 준비 시간은 5분이다", () => {
    const startedRound = startPreparationRound(createDefaultRoundState(), 1_000);

    expect(DEFAULT_PREPARATION_DURATION_MS).toBe(300_000);
    expect(startedRound.preparationDurationMs).toBe(300_000);
    expect(getRoundRemainingMs(startedRound, 1_000)).toBe(300_000);
  });

  test("게임 센터 카드와 world scene 직접 진입을 검증한다", async ({ page }) => {
    await mockUnauthenticatedSession(page);
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

  test("웹에서 좌측 파티 슬롯을 클릭하면 포켓몬 상태 패널을 연다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await page.setViewportSize({ width: 1280, height: 900 });
    await startSoloGame(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await waitForInitialWorldShortcutGuideIfAny(page);
    await closeWorldShortcutGuideIfOpen(page);

    await openPartyStatusPanelFromCanvas(page, 0);

    await expect
      .poll(() => getWorldSnapshot(page).then(snapshot => snapshot?.pokemonStatusPanel ?? null), {
        timeout: 10000,
      })
      .toMatchObject({
        slotIndex: 0,
        name: expect.any(String),
        level: 10,
        currentHp: null,
        maxHp: null,
        status: "normal",
      });

    expect(browserErrors.join("\n")).toBe("");
  });

  test("사용자 입력 후 Poke Lounge 효과음 asset을 요청한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    const audioRequests: string[] = [];

    page.on("request", request => {
      const url = request.url();

      if (url.includes("/assets/poke-lounge/audio/")) {
        audioRequests.push(url);
      }
    });

    await gotoWithRetry(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30000 });
    await page.locator("[data-room-entry-solo]").click();
    await chooseStarter(page);
    await waitForGameCanvas(page);

    await expect
      .poll(() => audioRequests.some(url => url.endsWith("/audio-manifest.json")), {
        timeout: 10000,
      })
      .toBe(true);
    await expect
      .poll(() => audioRequests.some(url => url.endsWith(".mp3")), {
        timeout: 10000,
      })
      .toBe(true);

    expect(browserErrors.join("\n")).toBe("");
  });

  test("wild battle 진입 시 Poke Lounge BGM asset을 요청한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    const audioRequests: string[] = [];

    page.on("request", request => {
      const url = request.url();

      if (url.includes("/assets/poke-lounge/audio/")) {
        audioRequests.push(url);
      }
    });

    await startBattleScenario(page, "wild-victory");

    await expect
      .poll(() => audioRequests.some(url => url.endsWith("/bgm/wild-battle.mp3")), {
        timeout: 10000,
      })
      .toBe(true);

    expect(browserErrors.join("\n")).toBe("");
  });

  test("world scene 진입 시 Poke Lounge 필드 BGM asset을 요청한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);
    const audioRequests: string[] = [];

    page.on("request", request => {
      const url = request.url();

      if (url.includes("/assets/poke-lounge/audio/")) {
        audioRequests.push(url);
      }
    });

    await startSoloGame(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?scene=world&e2e=1`);

    await expect
      .poll(() => audioRequests.some(url => url.endsWith("/bgm/field-day.mp3")), {
        timeout: 10000,
      })
      .toBe(true);

    expect(browserErrors.join("\n")).toBe("");
  });

  test("넓은 데스크톱에서도 게임 화면은 현재 컨테이너 안에 맞춰진다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await page.setViewportSize({ width: 2048, height: 1080 });
    await startBattleScenario(page, "wild-victory");
    await expectGameFrameInsideMainContainer(page);

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

  test("모든 포켓몬이 전투불능이어도 필드 이동은 가능하고 야생 전투는 시작하지 않는다", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page);

    await startBattleScenario(page, "wild-defeat", "wildEncounterRate=1");
    const result = await resolveBattleResult(page);
    expect(result?.winnerPlayerId).toBe("wild");

    await returnToWorldAfterBattleEnd(page);
    await closeWorldShortcutGuideIfOpen(page);

    const gameState = await getGameStateSnapshot(page);
    const localPlayer = gameState?.playersById[gameState.currentPlayerId];
    const occupiedParty = localPlayer?.party.filter(slot => slot.pokemon) ?? [];
    expect(occupiedParty.length).toBeGreaterThan(0);
    expect(
      occupiedParty.every(
        slot => slot.pokemon?.status === "fainted" || (slot.pokemon?.currentHp ?? 1) <= 0,
      ),
    ).toBe(true);

    const afterMove = await moveWorldPlayerWithoutStartingBattle(page);
    expect(afterMove.player).not.toBeNull();
    await expectActiveScene(page, "world", 2000);
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

  test("방 만들기에서 토너먼트 시간을 선택하면 room URL과 라운드 시간에 반영된다", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page);

    await gotoWithRetry(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await continueToRoomEntry(page);

    const durationOptions = page.locator("[data-room-entry-round-duration-option]");
    await expect(durationOptions).toHaveText(["3분", "5분", "10분", "15분"]);
    await expect(page.locator("[data-room-entry-round-duration-option='300000']")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.locator("[data-room-entry-round-duration-option='600000']").click();
    await expect(page.locator("[data-room-entry-round-duration-option='600000']")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator("[data-room-entry-create]").click();

    await expect(page).toHaveURL(/network=local/);
    await expect(page).toHaveURL(/roundMs=600000/);
    await chooseStarter(page);
    await waitForGameCanvas(page);
    await expect
      .poll(() =>
        getGameStateSnapshot(page).then(state => state?.round.preparationDurationMs ?? null),
      )
      .toBe(600_000);

    expect(browserErrors.join("\n")).toBe("");
  });

  test("방 생성 후 설정에서 공유 링크를 복사한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            const pokeWindow = window as PokeLoungeWindow;

            pokeWindow.__POKE_LOUNGE_COPIED_TEXT__ = text;
          },
        },
      });
    });

    await gotoWithRetry(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await continueToRoomEntry(page);
    await page.locator("[data-room-entry-round-duration-option='600000']").click();
    await page.locator("[data-room-entry-create]").click();
    await chooseStarter(page);
    await waitForGameCanvas(page);

    await page.keyboard.press("Escape");

    const settingsPanel = page.locator("[data-poke-lounge-settings='true']");
    await expect(settingsPanel).toBeVisible();
    const shareButton = settingsPanel.locator("[data-poke-lounge-setting-action='share-link']");
    await expect(shareButton).toHaveText("링크 공유");
    await shareButton.click();
    await expect(shareButton).toHaveText("링크 복사됨");

    const copiedText = await page.evaluate(() => {
      const pokeWindow = window as PokeLoungeWindow;

      return pokeWindow.__POKE_LOUNGE_COPIED_TEXT__ ?? null;
    });

    expect(copiedText).not.toBeNull();
    expect(copiedText).toContain(`/${POKE_LOUNGE_LOCALE}/game/poke-lounge?`);
    expect(copiedText).toContain("network=local");
    expect(copiedText).toContain("room=");
    expect(copiedText).toContain("roundMs=600000");
    expect(copiedText).not.toContain("e2e=1");
    expect(browserErrors.join("\n")).toBe("");
  });

  test("solo는 roundMs가 지나도 tournament phase로 넘어가지 않는다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await startSoloGame(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?roundMs=1000&e2e=1`);
    await page.waitForTimeout(1500);
    expect((await getGameStateSnapshot(page))?.round.phase).toBe("waiting");

    expect(browserErrors.join("\n")).toBe("");
  });

  test("local room은 roundMs=1000로 라운드 타이머가 tournament phase로 넘어간다", async ({
    page,
  }) => {
    const browserErrors = collectBrowserErrors(page);

    await gotoWithRetry(
      page,
      `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?network=local&room=${LOCAL_ROOM_CODE}&roundMs=1000&e2e=1`,
    );
    await continuePastOptionalStarter(page);
    await waitForGameCanvas(page);
    await expect
      .poll(() => getGameStateSnapshot(page).then(state => state?.round.phase ?? null), {
        timeout: 10000,
      })
      .toBe("tournament");

    expect(browserErrors.join("\n")).toBe("");
  });

  test("desktop에서는 Esc 설정 패널에서 fullscreen fallback을 실행한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await page.addInitScript(() => {
      Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
        configurable: true,
        value: undefined,
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await startSoloGame(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await expectCanvasFramed(page, {
      maxWidth: 1200,
      minWidth: 1000,
      viewportWidth: 1280,
      viewportHeight: 900,
    });
    await expectGameFrameInsideMainContainer(page);
    await expectWorldVisualScale(page);
    await expect(page.locator("[data-fullscreen-toggle]")).toHaveCount(0);
    await expect(page.locator("[data-poke-lounge-settings='true']")).toHaveCount(0);

    await page.keyboard.press("Escape");

    const settingsPanel = page.locator("[data-poke-lounge-settings='true']");
    await expect(settingsPanel).toBeVisible();

    const settingOptionButtons = settingsPanel.locator("[data-poke-lounge-setting-option='true']");
    await expect(settingOptionButtons).toHaveText(["전체화면", "소리 4/4", "UI 크게", "취소"]);

    const volumeButton = settingsPanel.locator("[data-poke-lounge-setting-action='volume']");
    await expect(volumeButton).toHaveAttribute("data-poke-lounge-volume-level", "4");
    await volumeButton.click();
    await expect(volumeButton).toHaveAttribute("data-poke-lounge-volume-level", "1");
    await expect(volumeButton).toContainText("소리 1/4");

    const uiSizeButton = settingsPanel.locator("[data-poke-lounge-setting-action='ui-size']");
    await expect(uiSizeButton).toHaveAttribute("data-poke-lounge-ui-size", "large");
    await uiSizeButton.click();
    await expect(uiSizeButton).toHaveAttribute("data-poke-lounge-ui-size", "normal");
    await expect(uiSizeButton).toContainText("UI 보통");
    await expect(page.getByTestId("poke-lounge-page")).toHaveAttribute(
      "data-poke-lounge-ui-size",
      "normal",
    );
    await expectCanvasFramed(page, {
      canvasHeight: 576,
      canvasWidth: 768,
      maxWidth: 1200,
      minWidth: 1000,
      viewportWidth: 1280,
      viewportHeight: 900,
    });
    await expectGameFrameInsideMainContainer(page);

    const settingsFullscreenButton = settingsPanel.locator(
      "[data-poke-lounge-setting-action='fullscreen']",
    );
    await expect(settingsFullscreenButton).toBeVisible();
    await settingsFullscreenButton.click();
    await expect(page.getByTestId("poke-lounge-page")).toHaveClass(/is-game-fullscreen-fallback/);
    await expect
      .poll(() =>
        page.evaluate(() => document.body.classList.contains("is-game-fullscreen-fallback-active")),
      )
      .toBe(true);

    await settingsPanel.locator("[data-poke-lounge-settings-cancel='true']").click();
    await expect(settingsPanel).toHaveCount(0);

    expect(browserErrors.join("\n")).toBe("");
  });

  test("mobile canvas framing과 하단 fullscreen CTA를 검증한다", async ({ page }) => {
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
    await expectCanvasFramed(page, {
      maxWidth: 1200,
      minWidth: 1000,
      viewportWidth: 1280,
      viewportHeight: 900,
    });
    await expectGameFrameInsideMainContainer(page);
    await expectWorldVisualScale(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectCanvasFramed(page, { maxWidth: 390, viewportWidth: 390, viewportHeight: 844 });
    await expectMobileTouchLayout(page);
    await expect(
      page.locator("#game-root [data-fullscreen-toggle-placement='mobile']"),
    ).toHaveCount(0);
    await expect(page.locator("[data-poke-lounge-web-fullscreen-toggle='true']")).toBeVisible();
    await expectMobileFullscreenButtonLayout(page);
    await expectMobileSettingsButtonLayout(page);
    await expectMobileTouchPressAnimation(page);

    await page.locator("[data-poke-lounge-mobile-settings-toggle='true']").click();
    const mobileSettingsPanel = page.locator("[data-poke-lounge-settings='true']");
    await expect(mobileSettingsPanel).toBeVisible();
    await expect(
      mobileSettingsPanel.locator("[data-poke-lounge-setting-option='true']"),
    ).toHaveText(["전체화면", "소리 4/4", "UI 크게", "취소"]);
    await mobileSettingsPanel.locator("[data-poke-lounge-settings-cancel='true']").click();
    await expect(mobileSettingsPanel).toHaveCount(0);

    await page.setViewportSize({ width: 360, height: 780 });
    await expectCanvasFramed(page, { maxWidth: 360, viewportWidth: 360, viewportHeight: 780 });
    await expectMobileTouchLayout(page);
    await expectMobileFullscreenButtonLayout(page);
    await expectMobileSettingsButtonLayout(page);

    await page.setViewportSize({ width: 844, height: 390 });
    await expectCanvasFramed(page, { maxWidth: 844, viewportWidth: 844, viewportHeight: 390 });
    await expectNoViewportOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await expectMobileFullscreenButtonLayout(page);
    await expectMobileSettingsButtonLayout(page);
    await page.locator("[data-fullscreen-toggle-placement='mobile']").click();
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
    });

    await page.setViewportSize({ width: 360, height: 780 });
    await gotoWithRetry(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await continueToRoomEntry(page);
    await expectNoViewportOverflow(page);
    await expect(page.locator("[data-fullscreen-toggle-placement='mobile']")).toHaveCount(0);

    await page.locator("[data-room-entry-solo]").click();
    await expect(page.locator("[data-screen='starter-selection']")).toBeVisible({ timeout: 30000 });
    await expectNoViewportOverflow(page);
    await expect(page.locator("[data-fullscreen-toggle-placement='mobile']")).toHaveCount(0);

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

function createBattleMoveFixture(input: Omit<BattleMove, "pp" | "maxPp">): BattleMove {
  return {
    ...input,
    pp: 20,
    maxPp: 20,
  };
}

function createRandomSequence(values: number[]): () => number {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
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

async function startBattleScenario(
  page: Page,
  scenario: PokeLoungeBattleScenario,
  extraQuery = "",
): Promise<void> {
  const suffix = extraQuery ? `&${extraQuery}` : "";

  await startSoloGame(
    page,
    `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?scene=battle&e2eBattle=${scenario}&e2e=1${suffix}`,
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

async function returnToWorldAfterBattleEnd(page: Page): Promise<void> {
  for (let index = 0; index < 30; index += 1) {
    const scene = await getActiveSceneKey(page);

    if (scene === "world") {
      break;
    }

    await page.evaluate(() => {
      const pokeWindow = window as PokeLoungeWindow;

      pokeWindow.__POKE_LOUNGE_E2E__?.confirmBattle();
    });
    await page.waitForTimeout(50);
  }

  await expectActiveScene(page, "world");
  await expect
    .poll(() => getWorldSnapshot(page).then(snapshot => Boolean(snapshot?.player)), {
      timeout: 10000,
    })
    .toBe(true);
}

async function getActiveSceneKey(page: Page): Promise<PokeLoungeSceneKey | null> {
  return page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;
    const scene = pokeWindow.__POKE_LOUNGE_E2E__?.getActiveSceneKey() ?? null;

    return scene === "world" || scene === "battle" ? scene : null;
  });
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
    canvasHeight = 384,
    canvasWidth = 512,
    maxWidth,
    minWidth = 0,
    viewportHeight,
    viewportWidth,
  }: {
    canvasHeight?: number;
    canvasWidth?: number;
    maxWidth: number;
    minWidth?: number;
    viewportHeight: number;
    viewportWidth: number;
  },
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
          snapshot.width === canvasWidth &&
          snapshot.height === canvasHeight &&
          snapshot.clientWidth <= maxWidth &&
          snapshot.clientWidth >= minWidth &&
          snapshot.clientWidth <= viewportWidth &&
          snapshot.clientHeight <= viewportHeight &&
          layout.root.width <= maxWidth &&
          layout.root.width >= minWidth &&
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
  expect(snapshot?.width).toBe(canvasWidth);
  expect(snapshot?.height).toBe(canvasHeight);
  expect(snapshot?.clientWidth).toBeLessThanOrEqual(maxWidth);
  expect(snapshot?.clientWidth).toBeGreaterThanOrEqual(minWidth);
  expect(snapshot?.clientWidth).toBeLessThanOrEqual(viewportWidth);
  expect(snapshot?.clientHeight).toBeLessThanOrEqual(viewportHeight);
  expect(layout?.root?.width).toBeLessThanOrEqual(maxWidth);
  expect(layout?.root?.width).toBeGreaterThanOrEqual(minWidth);
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

async function expectWorldVisualScale(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        getWorldSnapshot(page).then(snapshot =>
          snapshot?.player
            ? {
                cameraZoom: snapshot.camera.zoom,
                playerDisplayHeight: snapshot.player.displayHeight,
                playerDisplayWidth: snapshot.player.displayWidth,
              }
            : null,
        ),
      {
        timeout: 10000,
      },
    )
    .toEqual({
      cameraZoom: 1,
      playerDisplayHeight: 40,
      playerDisplayWidth: 40,
    });
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

async function expectMobileFullscreenButtonLayout(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const controls = document
            .querySelector("[data-mobile-touch-controls]")
            ?.getBoundingClientRect();
          const fullscreenButton = document
            .querySelector("[data-fullscreen-toggle-placement='mobile']")
            ?.getBoundingClientRect();

          if (!controls || !fullscreenButton || fullscreenButton.width === 0) {
            return false;
          }

          return (
            fullscreenButton.top >= controls.bottom + 8 &&
            fullscreenButton.left >= 0 &&
            fullscreenButton.right <= window.innerWidth &&
            fullscreenButton.bottom <= window.innerHeight
          );
        }),
      { timeout: 10000 },
    )
    .toBe(true);

  await expectNoViewportOverflow(page);
}

async function expectMobileSettingsButtonLayout(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const controls = document
            .querySelector("[data-mobile-touch-controls]")
            ?.getBoundingClientRect();
          const fullscreenButton = document
            .querySelector("[data-fullscreen-toggle-placement='mobile']")
            ?.getBoundingClientRect();
          const settingsButton = document
            .querySelector("[data-poke-lounge-mobile-settings-toggle='true']")
            ?.getBoundingClientRect();

          if (!controls || !fullscreenButton || !settingsButton || settingsButton.width === 0) {
            return false;
          }

          return (
            settingsButton.top >= controls.bottom + 8 &&
            settingsButton.left >= fullscreenButton.right + 6 &&
            settingsButton.right <= window.innerWidth &&
            settingsButton.bottom <= window.innerHeight
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

async function expectGameFrameInsideMainContainer(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const frame = document
            .querySelector("[data-poke-lounge-game-frame='true']")
            ?.getBoundingClientRect();
          const root = document.querySelector("#game-root")?.getBoundingClientRect();
          const canvas = document.querySelector("#game-root canvas")?.getBoundingClientRect();
          const container = document.querySelector("#main-scroll-container") as HTMLElement | null;

          if (!frame || !root || !canvas || !container) {
            return false;
          }

          const containerRect = container.getBoundingClientRect();
          const containerStyle = getComputedStyle(container);
          const paddingLeft = Number.parseFloat(containerStyle.paddingLeft) || 0;
          const paddingRight = Number.parseFloat(containerStyle.paddingRight) || 0;
          const paddingTop = Number.parseFloat(containerStyle.paddingTop) || 0;
          const paddingBottom = Number.parseFloat(containerStyle.paddingBottom) || 0;
          const contentLeft = containerRect.left + paddingLeft;
          const contentRight = containerRect.right - paddingRight;
          const contentTop = Math.max(containerRect.top + paddingTop, 0);
          const contentBottom = Math.min(containerRect.bottom - paddingBottom, window.innerHeight);
          const rects = [frame, root, canvas];

          return rects.every(
            rect =>
              rect.left >= contentLeft - 1 &&
              rect.right <= contentRight + 1 &&
              rect.top >= contentTop - 1 &&
              rect.bottom <= contentBottom + 1,
          );
        }),
      { timeout: 10000 },
    )
    .toBe(true);

  await expectNoViewportOverflow(page);
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

async function clickGameCanvasPoint(page: Page, point: { x: number; y: number }): Promise<void> {
  const canvas = page.locator("#game-root canvas");
  const box = await canvas.boundingBox();
  const snapshot = await getCanvasSnapshot(page);

  if (!box || !snapshot) {
    throw new Error("Poke Lounge canvas is unavailable");
  }

  await page.mouse.click(
    box.x + (point.x / snapshot.width) * box.width,
    box.y + (point.y / snapshot.height) * box.height,
  );
}

async function openPartyStatusPanelFromCanvas(page: Page, slotIndex: number): Promise<void> {
  const canvasSnapshot = await getCanvasSnapshot(page);
  if (!canvasSnapshot) {
    throw new Error("Poke Lounge canvas is not available.");
  }

  const partyHudOrigin = resolvePartyHudAnchor("middle-left", {
    width: canvasSnapshot.width,
    height: canvasSnapshot.height,
  });
  const target = {
    x: partyHudOrigin.x + PARTY_HUD_SLOT_SIZE.width / 2,
    y:
      partyHudOrigin.y +
      slotIndex * (PARTY_HUD_SLOT_SIZE.height + PARTY_HUD_SLOT_GAP) +
      PARTY_HUD_SLOT_SIZE.height / 2,
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await clickGameCanvasPoint(page, target);

    const opened = await expect
      .poll(
        () =>
          getWorldSnapshot(page).then(
            snapshot => snapshot?.pokemonStatusPanel?.slotIndex === slotIndex,
          ),
        { timeout: 500 },
      )
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    if (opened) {
      return;
    }
  }
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

async function closeWorldShortcutGuideIfOpen(page: Page): Promise<void> {
  const shortcutGuideOpen = await getWorldSnapshot(page).then(
    snapshot => snapshot?.shortcutGuideOpen ?? false,
  );

  if (!shortcutGuideOpen) {
    return;
  }

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

async function waitForInitialWorldShortcutGuideIfAny(page: Page): Promise<void> {
  await expect
    .poll(() => getWorldSnapshot(page).then(snapshot => snapshot?.shortcutGuideOpen ?? false), {
      timeout: 2000,
    })
    .toBe(true)
    .catch(() => {});
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

async function moveWorldPlayerWithoutStartingBattle(page: Page): Promise<PokeLoungeWorldSnapshot> {
  const directions = ["right", "left", "down", "up"] as const;
  const snapshots: PokeLoungeWorldSnapshot[] = [];

  for (const direction of directions) {
    const beforeMove = await getWorldSnapshot(page);

    if (!beforeMove?.player) {
      throw new Error("World player snapshot is unavailable before movement");
    }

    await pressVirtualGamepad(page, direction);

    try {
      const outcome = await page
        .waitForFunction(
          ([startPosition]) => {
            const pokeWindow = window as PokeLoungeWindow;
            const scene = pokeWindow.__POKE_LOUNGE_E2E__?.getActiveSceneKey() ?? null;

            if (scene === "battle") {
              return { kind: "battle" };
            }

            const snapshot = pokeWindow.__POKE_LOUNGE_E2E__?.getWorldSnapshot() ?? null;

            if (
              scene === "world" &&
              snapshot?.player &&
              startPosition &&
              (snapshot.player.x !== startPosition.x || snapshot.player.y !== startPosition.y)
            ) {
              return { kind: "moved", snapshot };
            }

            return null;
          },
          [beforeMove.player],
          { timeout: 2500 },
        )
        .then(
          handle =>
            handle.jsonValue() as Promise<
              | { kind: "battle" }
              | {
                  kind: "moved";
                  snapshot: PokeLoungeWorldSnapshot;
                }
            >,
        )
        .catch(() => null);

      if (outcome?.kind === "battle") {
        throw new Error("Wild battle started even though every party Pokemon fainted");
      }

      if (outcome?.kind === "moved") {
        await page.waitForTimeout(1200);

        const activeScene = await getActiveSceneKey(page);

        if (activeScene === "battle") {
          throw new Error("Wild battle started after defeated-party movement");
        }

        return outcome.snapshot;
      }

      const snapshot = await getWorldSnapshot(page);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    } finally {
      await releaseVirtualGamepad(page, direction);
    }
  }

  throw new Error(`World player did not move after defeat: ${JSON.stringify(snapshots)}`);
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

async function mockUnauthenticatedSession(page: Page): Promise<void> {
  await page.route("**/api/auth/session", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
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
