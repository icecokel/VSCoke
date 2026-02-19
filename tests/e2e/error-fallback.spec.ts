import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  expectWordleKeyboardButtons,
  gotoWithRetry,
  resolveLocaleAndMessages,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("오류/네트워크 장애 fallback", () => {
  test("랭킹 API 실패 시 빈 상태 메시지로 fallback 된다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);

    await page.route("**/game/ranking*", async route => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "forced error" }),
      });
    });

    await gotoWithRetry(page, `/${locale}/game/sky-drop`);

    await expect(page.getByRole("button", { name: /Start Game/i })).toBeVisible();
    await expect(page.getByText(messages.Game.leaderboardEmpty)).toBeVisible({ timeout: 15000 });
  });

  test("Wordle 단어 API 실패 시 에러 토스트를 노출한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);

    await page.route("**/wordle/word", async route => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "forced error" }),
      });
    });

    await gotoWithRetry(page, `/${locale}/game/wordle`);

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`^${escapeRegExp(messages.Game.wordleTitle)}$`),
      }),
    ).toBeVisible();
    await expect(page.getByText(messages.Game.loadFailed)).toBeVisible({ timeout: 10000 });
    await expectWordleKeyboardButtons(page);
  });
});
