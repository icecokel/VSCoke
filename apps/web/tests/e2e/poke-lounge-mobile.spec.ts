import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { MOBILE_GAME_VIEWPORT_SIZE } from "../../src/components/poke-lounge/runtime/game/gameViewport";
import { gotoWithRetry } from "./test-helpers";

type WorldSnapshot = {
  player: { x: number; y: number; facing: string } | null;
  partyHudVisible: boolean;
  shortcutGuideOpen: boolean;
};

type CanvasSnapshot = {
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
};

test("Poke Lounge 모바일은 세로 필드와 전체 화면 메뉴를 제공한다", async ({ page }, testInfo) => {
  const probe = await readMobileEnvironment(page);
  await testInfo.attach("mobile-environment.json", {
    body: Buffer.from(`${JSON.stringify(probe, null, 2)}\n`),
    contentType: "application/json",
  });
  const probeRoot = path.resolve(
    process.cwd(),
    process.env.PLAYWRIGHT_OUTPUT_DIR ?? "../../output/playwright",
    "mobile-probes",
  );
  mkdirSync(probeRoot, { recursive: true });
  writeFileSync(
    path.join(probeRoot, `${testInfo.project.name}.json`),
    `${JSON.stringify(probe, null, 2)}\n`,
  );

  expect(probe.userAgent).not.toBe("");
  expect(probe.platform).not.toBe("");

  await gotoWithRetry(page, "/ko-KR/game/poke-lounge?e2e=1&wildEncounterRate=0");
  await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30_000 });
  await page.locator("[data-room-entry-solo]").click();
  await expectStarterSelectionFitsMobileViewport(page);
  await chooseStarterIfNeeded(page);
  await expect(page.locator("#game-root canvas")).toBeVisible({ timeout: 30_000 });
  await expectMobileGameLogicalViewport(page);
  await expect
    .poll(() => readWorldSnapshot(page).then(snapshot => snapshot?.partyHudVisible), {
      timeout: 30_000,
    })
    .toBe(false);

  const controls = page.locator("[data-poke-lounge-mobile-deck='explore']");
  const controlDock = page.locator("[data-poke-lounge-mobile-control-dock='true']");
  const directionalJoystick = page.locator("[data-poke-lounge-mobile-joystick='true']");
  await expect(controls).toBeVisible();
  await expect(controlDock).toBeVisible();
  await expect(directionalJoystick).toBeVisible();
  await expect(directionalJoystick.locator("[data-mobile-control]")).toHaveCount(0);
  await expect(page.locator("[data-mobile-touch-controls='true']")).toHaveCount(0);
  await expectPortraitFieldAndControlDock(page, controlDock);

  await expect
    .poll(() => readWorldSnapshot(page).then(snapshot => snapshot?.player ?? null), {
      timeout: 30_000,
    })
    .not.toBeNull();
  await expect
    .poll(() => readWorldSnapshot(page).then(snapshot => snapshot?.shortcutGuideOpen), {
      timeout: 30_000,
    })
    .toBe(false);
  const before = await readWorldSnapshot(page);
  const joystickBounds = await directionalJoystick.boundingBox();

  expect(joystickBounds).not.toBeNull();
  await directionalJoystick.dispatchEvent("pointerdown", {
    clientX: joystickBounds!.x + joystickBounds!.width * 0.84,
    clientY: joystickBounds!.y + joystickBounds!.height / 2,
    pointerId: 1,
    pointerType: "touch",
  });
  await expect(directionalJoystick).toHaveAttribute("data-active", "true");
  await expect(directionalJoystick).toHaveAttribute("data-direction", "right");
  await page.waitForTimeout(300);
  await directionalJoystick.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch" });
  await expect(directionalJoystick).not.toHaveAttribute("data-active", "true");
  const after = await readWorldSnapshot(page);

  expect(before?.player).not.toBeNull();
  expect(after?.player).not.toBeNull();
  expect(
    before?.player?.x !== after?.player?.x ||
      before?.player?.y !== after?.player?.y ||
      after?.player?.facing === "right",
  ).toBe(true);

  const confirm = page.locator("[data-mobile-control='confirm']");
  await confirm.dispatchEvent("pointerdown", { pointerId: 2, pointerType: "touch" });
  await expect(confirm).toHaveAttribute("data-pressed", "true");
  await confirm.dispatchEvent("pointercancel", { pointerId: 2, pointerType: "touch" });
  await expect(confirm).not.toHaveAttribute("data-pressed", "true");

  const bag = page.locator("[data-mobile-control='bag']");
  await bag.dispatchEvent("pointerdown", { pointerId: 3, pointerType: "touch" });
  const inventoryScene = page.locator("[data-poke-lounge-mobile-deck='world-inventory-items']");
  await expectMobileFullscreenScene(page, inventoryScene);
  await expectSceneOccludesControl(inventoryScene, bag);
  await expectNoModalDialog(page);
  await expectWorldInputIsLocked(page);
  await page.locator("[data-poke-lounge-mobile-deck-close='true']").click();
  await expect(controls).toBeVisible();

  await page.locator("[data-poke-lounge-mobile-help='true']").click();
  await expectMobileFullscreenScene(
    page,
    page.locator("[data-poke-lounge-mobile-deck='world-help']"),
  );
  await expectNoModalDialog(page);
  await page.locator("[data-poke-lounge-mobile-deck-close='true']").click();
  await expect(controls).toBeVisible();

  await page.locator("[data-poke-lounge-mobile-party='true']").click();
  const partyScreen = page.locator("[data-poke-lounge-mobile-deck='world-party']");
  await expectMobileFullscreenScene(page, partyScreen);
  await expect(partyScreen.locator("[data-empty]")).toHaveCount(5);
  await expectNoModalDialog(page);
  await page.locator("[data-poke-lounge-mobile-deck-close='true']").click();
  await expect(controls).toBeVisible();

  await page.locator("[data-poke-lounge-mobile-menu='true']").click();
  const settingsScreen = page.locator("[data-poke-lounge-mobile-settings-screen='true']");
  await expectMobileFullscreenScene(page, settingsScreen);
  await expect(settingsScreen.locator("[data-poke-lounge-party-slot]")).toHaveCount(6);
  await expect(settingsScreen.locator("[data-poke-lounge-party-slot='0']")).toHaveAttribute(
    "data-active",
    "true",
  );
  await expectSceneOccludesControl(settingsScreen, controls);
  await expectNoModalDialog(page);
  await expectWorldInputIsLocked(page);
  await page.locator("[data-poke-lounge-mobile-settings-close='true']").click();
  await expect(settingsScreen).toHaveCount(0);
});

test("Poke Lounge 모바일 전투는 하단 조작 도크에서 행동을 고른다", async ({ page }) => {
  await gotoWithRetry(page, "/ko-KR/game/poke-lounge?scene=battle&e2eBattle=wild-victory&e2e=1");
  await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30_000 });
  await page.locator("[data-room-entry-solo]").click();
  await chooseStarterIfNeeded(page);
  await expect(page.locator("#game-root canvas")).toBeVisible({ timeout: 30_000 });
  await expectMobileGameLogicalViewport(page);

  const commandDeck = page.locator("[data-poke-lounge-mobile-deck='battle-command']");
  await expect(commandDeck).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-mobile-touch-controls='true']")).toHaveCount(0);

  await commandDeck.locator("button").first().click();
  await expect(page.locator("[data-poke-lounge-mobile-deck='battle-moves']")).toBeVisible({
    timeout: 10_000,
  });
});

test("Poke Lounge 모바일 필드 시설은 전체 화면 씬에서 처리한다", async ({ page }) => {
  await gotoWithRetry(page, "/ko-KR/game/poke-lounge?e2e=1&wildEncounterRate=0");
  await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30_000 });
  await page.locator("[data-room-entry-solo]").click();
  await chooseStarterIfNeeded(page);
  await expect(page.locator("#game-root canvas")).toBeVisible({ timeout: 30_000 });
  await expectMobileGameLogicalViewport(page);
  await expect(page.locator("[data-poke-lounge-mobile-deck='explore']")).toBeVisible({
    timeout: 30_000,
  });

  for (const [surface, deck] of [
    ["shop", "world-shop"],
    ["pc", "world-pc"],
    ["dice", "world-dice"],
  ] as const) {
    expect(await openMobileWorldSurfaceForTest(page, surface)).toBe(true);
    await expectMobileFullscreenScene(
      page,
      page.locator(`[data-poke-lounge-mobile-deck='${deck}']`),
    );
    await expectNoModalDialog(page);
    await page.locator("[data-poke-lounge-mobile-deck-close='true']").click();
    await expect(page.locator("[data-poke-lounge-mobile-deck='explore']")).toBeVisible();
  }
});

async function readMobileEnvironment(page: Page): Promise<{
  maxTouchPoints: number;
  coarsePointer: boolean;
  userAgent: string;
  platform: string;
}> {
  await page.goto("about:blank");
  return page.evaluate(() => ({
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    userAgent: navigator.userAgent ?? "",
    platform: navigator.platform ?? "",
  }));
}

async function chooseStarterIfNeeded(page: Page): Promise<void> {
  const starterSelection = page.locator("[data-screen='starter-selection']");
  const gameCanvas = page.locator("#game-root canvas");

  await expect
    .poll(
      async () => {
        if (await starterSelection.isVisible().catch(() => false)) return "starter";
        if (await gameCanvas.isVisible().catch(() => false)) return "canvas";
        return null;
      },
      { timeout: 30_000 },
    )
    .not.toBeNull();

  if (await starterSelection.isVisible().catch(() => false)) {
    await page.locator("[data-starter-confirm]").click();
  }
}

async function expectStarterSelectionFitsMobileViewport(page: Page): Promise<void> {
  const starterSelection = page.locator("[data-screen='starter-selection']");
  await expect(starterSelection).toBeVisible({ timeout: 30_000 });

  const layout = await page.evaluate(() => {
    const screen = document.querySelector(
      "[data-screen='starter-selection']",
    ) as HTMLElement | null;
    const panel = document.querySelector(".starter-selection-modal") as HTMLElement | null;
    const root = document.querySelector("#game-root");
    const controls = [
      document.querySelector("[data-starter-confirm]"),
      ...document.querySelectorAll("[data-starter-card]"),
    ];

    if (!screen || !panel || !root || controls.some(control => !(control instanceof HTMLElement))) {
      return null;
    }

    const rootRect = root.getBoundingClientRect();
    const screenRect = screen.getBoundingClientRect();

    return {
      panelFits: panel.scrollHeight <= panel.clientHeight + 1,
      screenFits: screen.scrollHeight <= screen.clientHeight + 1,
      screenFitsRoot:
        screenRect.top >= rootRect.top - 1 && screenRect.bottom <= rootRect.bottom + 1,
      controlsFit: controls.every(control => {
        const rect = (control as HTMLElement).getBoundingClientRect();

        return (
          rect.left >= 0 &&
          rect.right <= window.innerWidth + 1 &&
          rect.top >= 0 &&
          rect.bottom <= window.innerHeight + 1
        );
      }),
    };
  });

  expect(layout).toEqual({
    panelFits: true,
    screenFits: true,
    screenFitsRoot: true,
    controlsFit: true,
  });
}

async function readWorldSnapshot(page: Page): Promise<WorldSnapshot | null> {
  return page.evaluate(
    () =>
      (
        window as Window & {
          __POKE_LOUNGE_E2E__?: { getWorldSnapshot(): WorldSnapshot | null };
        }
      ).__POKE_LOUNGE_E2E__?.getWorldSnapshot() ?? null,
  );
}

async function readCanvasSnapshot(page: Page): Promise<CanvasSnapshot | null> {
  return page.evaluate(
    () =>
      (
        window as Window & {
          __POKE_LOUNGE_E2E__?: { getCanvasSnapshot(): CanvasSnapshot | null };
        }
      ).__POKE_LOUNGE_E2E__?.getCanvasSnapshot() ?? null,
  );
}

async function expectMobileGameLogicalViewport(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const canvas = await readCanvasSnapshot(page);

        return canvas ? { width: canvas.width, height: canvas.height } : null;
      },
      { timeout: 30_000 },
    )
    .toEqual(MOBILE_GAME_VIEWPORT_SIZE);
}

async function expectPortraitFieldAndControlDock(page: Page, controlDock: Locator): Promise<void> {
  const field = page.locator("[data-poke-lounge-mobile-screen='top']");
  const [fieldBounds, controlDockBounds, letterbox] = await Promise.all([
    field.boundingBox(),
    controlDock.boundingBox(),
    readMobileLetterbox(page),
  ]);
  const viewport = page.viewportSize();

  expect(fieldBounds).not.toBeNull();
  expect(controlDockBounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  await expect(page.locator("[data-poke-lounge-mobile-screen='bottom']")).toHaveCount(0);
  expect(viewport!.height).toBeGreaterThan(viewport!.width);
  expect(letterbox.top).toBeGreaterThanOrEqual(16);
  expect(letterbox.bottom).toBeGreaterThanOrEqual(16);
  expect(fieldBounds!.x).toBeGreaterThanOrEqual(-1);
  expect(fieldBounds!.y).toBeGreaterThanOrEqual(letterbox.top - 1);
  expect(fieldBounds!.x + fieldBounds!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(fieldBounds!.y + fieldBounds!.height).toBeLessThanOrEqual(viewport!.height + 1);
  expect(fieldBounds!.width).toBeGreaterThanOrEqual(viewport!.width * 0.9);
  expect(Math.abs(fieldBounds!.width / fieldBounds!.height - 4 / 3)).toBeLessThanOrEqual(0.01);

  expect(controlDockBounds!.x).toBeGreaterThanOrEqual(-1);
  expect(controlDockBounds!.y).toBeGreaterThanOrEqual(-1);
  expect(controlDockBounds!.x + controlDockBounds!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(controlDockBounds!.y + controlDockBounds!.height).toBeLessThanOrEqual(
    viewport!.height - letterbox.bottom + 1,
  );
  expect(Math.abs(controlDockBounds!.width / controlDockBounds!.height - 4 / 3)).toBeGreaterThan(
    0.1,
  );
}

async function expectMobileFullscreenScene(page: Page, scene: Locator): Promise<void> {
  await expect(scene).toBeVisible({ timeout: 10_000 });
  await expect(scene).toHaveAttribute("data-poke-lounge-mobile-fullscreen-scene", "true");

  const [bounds, ownsViewportCenter, letterbox] = await Promise.all([
    scene.boundingBox(),
    scene.evaluate(element => {
      const centerElement = document.elementFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 2,
      );

      return centerElement !== null && element.contains(centerElement);
    }),
    readMobileLetterbox(page),
  ]);
  const viewport = page.viewportSize();

  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeLessThanOrEqual(1);
  expect(bounds!.y).toBeGreaterThanOrEqual(letterbox.top - 1);
  expect(bounds!.y).toBeLessThanOrEqual(letterbox.top + 1);
  expect(bounds!.width).toBeGreaterThanOrEqual(viewport!.width - 1);
  expect(bounds!.height).toBeGreaterThanOrEqual(
    viewport!.height - letterbox.top - letterbox.bottom - 1,
  );
  expect(ownsViewportCenter).toBe(true);
}

async function readMobileLetterbox(page: Page): Promise<{ top: number; bottom: number }> {
  return page.getByTestId("poke-lounge-page").evaluate(element => {
    const style = getComputedStyle(element);

    return {
      top: Number.parseFloat(style.paddingTop),
      bottom: Number.parseFloat(style.paddingBottom),
    };
  });
}

async function expectNoModalDialog(page: Page): Promise<void> {
  await expect(page.locator("[role='dialog'], dialog[open]")).toHaveCount(0);
}

async function expectSceneOccludesControl(scene: Locator, control: Locator): Promise<void> {
  const controlBounds = await control.boundingBox();

  if (!controlBounds) {
    return;
  }

  const ownsControlCenter = await scene.evaluate(
    (element, point) => {
      const centerElement = document.elementFromPoint(point.x, point.y);

      return centerElement !== null && element.contains(centerElement);
    },
    {
      x: controlBounds.x + controlBounds.width / 2,
      y: controlBounds.y + controlBounds.height / 2,
    },
  );

  expect(ownsControlCenter).toBe(true);
}

async function expectWorldInputIsLocked(page: Page): Promise<void> {
  const before = await readWorldSnapshot(page);

  expect(before?.player).not.toBeNull();
  await page.keyboard.down("ArrowRight");
  try {
    await page.waitForTimeout(250);
  } finally {
    await page.keyboard.up("ArrowRight");
  }

  const after = await readWorldSnapshot(page);

  expect(after?.player).toEqual(before?.player);
}

async function openMobileWorldSurfaceForTest(
  page: Page,
  surface: "shop" | "pc" | "dice",
): Promise<boolean> {
  return page.evaluate(target => {
    const game = (
      window as Window & {
        __POKE_LOUNGE_GAME__?: {
          scene?: { getScene(key: string): unknown };
        };
      }
    ).__POKE_LOUNGE_GAME__;
    const world = game?.scene?.getScene("world") as
      | {
          openDiceGambleForTest?(): void;
          openPcBoxForTest?(): void;
          openShopForTest?(): void;
        }
      | undefined;

    if (!world) {
      return false;
    }

    if (target === "shop") {
      world.openShopForTest?.();
    } else if (target === "pc") {
      world.openPcBoxForTest?.();
    } else {
      world.openDiceGambleForTest?.();
    }

    return true;
  }, surface);
}
