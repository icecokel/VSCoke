import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { gotoWithRetry } from "./test-helpers";

type WorldSnapshot = {
  player: { x: number; y: number; facing: string } | null;
};

test("Poke Lounge 모바일 환경은 실제 probe와 터치 조작을 제공한다", async ({ page }, testInfo) => {
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

  await gotoWithRetry(page, "/ko-KR/game/poke-lounge?e2e=1");
  await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30_000 });
  await page.locator("[data-room-entry-solo]").click();
  await chooseStarterIfNeeded(page);
  await expect(page.locator("#game-root canvas")).toBeVisible({ timeout: 30_000 });

  const controls = page.locator("[data-mobile-touch-controls='true']");
  await expect(controls).toBeVisible();

  const right = page.locator("[data-mobile-control='right']");
  await expect
    .poll(() => readWorldSnapshot(page).then(snapshot => snapshot?.player ?? null), {
      timeout: 30_000,
    })
    .not.toBeNull();
  await page.evaluate(() => {
    (
      window as Window & {
        __POKE_LOUNGE_E2E__?: { closeWorldShortcutGuide(): void };
      }
    ).__POKE_LOUNGE_E2E__?.closeWorldShortcutGuide();
  });
  const before = await readWorldSnapshot(page);
  await right.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch" });
  await expect(right).toHaveAttribute("data-pressed", "true");
  await page.waitForTimeout(300);
  await right.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch" });
  await expect(right).not.toHaveAttribute("data-pressed", "true");
  const after = await readWorldSnapshot(page);

  expect(before?.player).not.toBeNull();
  expect(after?.player).not.toBeNull();
  expect(
    before?.player?.x !== after?.player?.x ||
      before?.player?.y !== after?.player?.y ||
      after?.player?.facing === "right",
  ).toBe(true);

  const releaseEvents = ["pointerup", "pointercancel", "pointerleave"] as const;
  const actionButtons = ["confirm", "back", "bag", "help"] as const;

  for (const [index, buttonName] of actionButtons.entries()) {
    const button = page.locator(`[data-mobile-control='${buttonName}']`);
    const pointerId = index + 2;
    await button.dispatchEvent("pointerdown", { pointerId, pointerType: "touch" });
    await expect(button).toHaveAttribute("data-pressed", "true");
    await button.dispatchEvent(releaseEvents[index % releaseEvents.length], {
      pointerId,
      pointerType: "touch",
    });
    await expect(button).not.toHaveAttribute("data-pressed", "true");
  }

  const frame = await page.locator("[data-poke-lounge-game-frame='true']").boundingBox();
  const viewport = page.viewportSize();
  expect(frame).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(frame!.x).toBeGreaterThanOrEqual(0);
  expect(frame!.y).toBeGreaterThanOrEqual(0);
  expect(frame!.x + frame!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(frame!.y + frame!.height).toBeLessThanOrEqual(viewport!.height + 1);
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
