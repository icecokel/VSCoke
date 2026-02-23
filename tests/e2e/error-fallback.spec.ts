import { expect, test } from "@playwright/test";
import {
  clearHistoryStorage,
  escapeRegExp,
  expectWordleKeyboardButtons,
  gotoWithRetry,
  resolveLocaleAndMessages,
} from "./test-helpers";

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

  test("공유 조회 API 실패 시 NotFound 화면이 보인다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    await clearHistoryStorage(page);

    await page.route("**/game/result/**", async route => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "forced error" }),
      });
    });

    const response = await gotoWithRetry(page, `/${locale}/share/invalid-id`, 4, false);
    expect(response?.status()).toBe(404);

    await expect(
      page.getByText(
        /페이지를 찾을 수 없거나|요청하신 경로가 존재하지 않거나 삭제되었습니다|Page Not Found|Could not find requested resource|404: This page could not be found/,
      ),
    ).toBeVisible();
  });
});
