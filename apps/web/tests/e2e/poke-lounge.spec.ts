import { expect, type Page, test } from "@playwright/test";
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
}

type PokeLoungeWindow = Window & {
  __POKE_LOUNGE_E2E__?: PokeLoungeE2eController;
};

const POKE_LOUNGE_LOCALE = "ko-KR";
const LOCAL_ROOM_CODE = "ABC123";

test.describe("Poke Lounge", () => {
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

  test("스타터 선택 후 solo 시작이 world canvas로 진입한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await startSoloGame(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
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

  test("network=local room 생성, 참가, 나가기 흐름을 검증한다", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page);

    await gotoWithRetry(page, `/${POKE_LOUNGE_LOCALE}/game/poke-lounge?e2e=1`);
    await chooseStarter(page);
    await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30000 });

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

    await page.locator("[data-fullscreen-toggle]").click();
    await expect(page.getByTestId("poke-lounge-page")).toHaveClass(/is-game-fullscreen-fallback/);
    await expect
      .poll(() =>
        page.evaluate(() => document.body.classList.contains("is-game-fullscreen-fallback-active")),
      )
      .toBe(true);

    expect(browserErrors.join("\n")).toBe("");
  });
});

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
  await chooseStarter(page);
  await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30000 });
  await page.locator("[data-room-entry-solo]").click();
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
        const aspectRatio = (snapshot?.clientWidth ?? 0) / (snapshot?.clientHeight ?? 1);

        return Boolean(
          snapshot &&
          snapshot.width === 768 &&
          snapshot.height === 576 &&
          snapshot.clientWidth <= maxWidth &&
          snapshot.clientWidth <= viewportWidth &&
          snapshot.clientHeight <= viewportHeight &&
          Math.abs(aspectRatio - 4 / 3) < 0.03,
        );
      },
      {
        timeout: 10000,
      },
    )
    .toBe(true);

  const snapshot = await getCanvasSnapshot(page);

  expect(snapshot).not.toBeNull();
  expect(snapshot?.width).toBe(768);
  expect(snapshot?.height).toBe(576);
  expect(snapshot?.clientWidth).toBeLessThanOrEqual(maxWidth);
  expect(snapshot?.clientWidth).toBeLessThanOrEqual(viewportWidth);
  expect(snapshot?.clientHeight).toBeLessThanOrEqual(viewportHeight);
  expect(
    Math.abs((snapshot?.clientWidth ?? 0) / (snapshot?.clientHeight ?? 1) - 4 / 3),
  ).toBeLessThan(0.03);
}

async function getCanvasSnapshot(page: Page): Promise<PokeLoungeCanvasSnapshot | null> {
  return page.evaluate(() => {
    const pokeWindow = window as PokeLoungeWindow;

    return pokeWindow.__POKE_LOUNGE_E2E__?.getCanvasSnapshot() ?? null;
  });
}

async function continuePastOptionalStarter(page: Page): Promise<void> {
  const starterSelection = page.locator("[data-screen='starter-selection']");

  if (await starterSelection.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.locator("[data-starter-confirm]").click();
  }

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
