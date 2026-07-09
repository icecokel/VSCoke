import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  expectWordleKeyboardButtons,
  gotoWithRetry,
  mockWordleWord,
  resolveLocaleAndMessages,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("취미 게임 섹션", () => {
  test("게임 센터에서 취미 게임 목록과 주요 직접 진입 화면을 검증한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await gotoWithRetry(page, `/${locale}/game`);

    await expect(page.getByRole("heading", { name: messages.home.cards.gameTitle })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sky Drop/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Fish Drift/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(escapeRegExp(messages.Game.wordleTitle)) }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: new RegExp(escapeRegExp(messages.Game.pokeLoungeTitle)),
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /doom|둠/i })).toHaveCount(0);

    await gotoWithRetry(page, `/${locale}/game/sky-drop`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game/sky-drop$`));
    await expect(page.getByTestId("game-start-button")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("game-exit-button")).toBeVisible();

    await gotoWithRetry(page, `/${locale}/game/fish-drift`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game/fish-drift$`));
    await expect(
      page
        .locator("button", { hasText: new RegExp(`^${escapeRegExp(messages.Game.start)}$`) })
        .first(),
    ).toBeVisible({ timeout: 30000 });

    const removedDoomResponse = await gotoWithRetry(page, `/${locale}/doom`, 1, false);
    expect(removedDoomResponse?.status()).toBe(404);

    await mockWordleWord(page);
    await gotoWithRetry(page, `/${locale}/game/wordle`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game/wordle$`));
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`^${escapeRegExp(messages.Game.wordleTitle)}$`),
      }),
    ).toBeVisible();
    await expect(page.getByTestId("wordle-loading")).toBeHidden({ timeout: 20000 });
    await expectWordleKeyboardButtons(page);
  });
});
