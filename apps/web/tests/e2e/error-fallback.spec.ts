import { expect, test, type Page } from "@playwright/test";
import {
  escapeRegExp,
  expectWordleKeyboardButtons,
  gotoWithRetry,
  resolveLocaleAndMessages,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

const clickWordleKey = async (page: Page, key: string) => {
  await page
    .locator("footer")
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(key)}$`) })
    .click();
};

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

    await expect(page.getByTestId("game-start-button")).toBeVisible();
    await expect(page.getByText(messages.Game.apiUnavailable)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(messages.Game.leaderboardEmpty)).toBeVisible({ timeout: 15000 });
  });

  test("Wordle 단어 API 실패 시 서버 이전 안내 토스트를 노출한다", async ({ page }) => {
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
    await expect(page.getByText(messages.Game.apiUnavailable)).toBeVisible({ timeout: 10000 });
    await expectWordleKeyboardButtons(page);
  });

  test("Wordle 단어 검증 API 실패 시 서버 이전 안내 토스트를 노출한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);

    await page.route("**/wordle/word", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { word: "apple" } }),
      });
    });
    await page.route("**/wordle/check", async route => {
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
    for (const key of ["C", "R", "A", "N", "E"]) {
      await clickWordleKey(page, key);
    }
    await clickWordleKey(page, "Enter");

    await expect(page.getByText(messages.Game.apiUnavailable)).toBeVisible({ timeout: 10000 });
    await expectWordleKeyboardButtons(page);
  });
});
