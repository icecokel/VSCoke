import { expect, test } from "@playwright/test";
import { escapeRegExp, gotoWithRetry, resolveLocaleAndMessages } from "./test-helpers";

test.describe("Poke Lounge", () => {
  test("게임 센터 카드와 직접 진입 플레이 흐름을 검증한다", async ({ page }) => {
    const browserErrors: string[] = [];

    page.on("pageerror", error => browserErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") {
        browserErrors.push(message.text());
      }
    });

    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await gotoWithRetry(page, `/${locale}/game`);
    await expect(
      page.getByRole("button", {
        name: new RegExp(escapeRegExp(messages.Game.pokeLoungeTitle)),
      }),
    ).toBeVisible();

    await gotoWithRetry(page, `/${locale}/game/poke-lounge?scene=battle&e2eBattle=wild-victory`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game/poke-lounge`));
    await expect(page.getByTestId("poke-lounge-page")).toBeVisible();
    await expect(page.getByTestId("poke-lounge-game-root")).toBeVisible();
    await expect(page.locator("[data-screen='starter-selection']")).toBeVisible({ timeout: 30000 });

    await page.locator("[data-starter-confirm]").click();
    await expect(page.locator("[data-room-entry-screen='true']")).toBeVisible({ timeout: 30000 });
    await page.locator("[data-room-entry-solo]").click();
    await expect(page.locator("#game-root canvas")).toBeVisible({ timeout: 30000 });

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const pokeWindow = window as Window & {
              __POKE_LOUNGE_E2E__?: { getActiveSceneKey: () => string | null };
            };

            return pokeWindow.__POKE_LOUNGE_E2E__?.getActiveSceneKey() ?? null;
          }),
        { timeout: 30000 },
      )
      .toBe("battle");

    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.pokeLoungeE2eBattle ?? ""), {
        timeout: 30000,
      })
      .not.toBe("");

    expect(browserErrors.join("\n")).toBe("");
  });
});
