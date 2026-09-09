import { expect, test, type Page } from "@playwright/test";
import {
  escapeRegExp,
  mockResumeConversationStorage,
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
  test("메인 채팅 429 제한 시간이 지나면 입력창이 다시 활성화된다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);

    await mockResumeConversationStorage(page);
    const now = Date.now();
    await page.clock.install({ time: now });
    let chatRequests = 0;
    await page.route("**/main-chat", async route => {
      const request = route.request();
      if (request.method() === "POST") {
        chatRequests += 1;
        expect(request.headers()["x-resume-conversation-token"]).toMatch(/^[a-f0-9]{64}$/);
      }
      const origin = request.headers().origin ?? "http://127.0.0.1";
      const headers = {
        "Access-Control-Allow-Headers": "Content-Type, X-Resume-Conversation-Token",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Expose-Headers":
          "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "30",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(now / 1000) + 60),
      };

      await route.fulfill({
        status: request.method() === "OPTIONS" ? 204 : 429,
        headers,
        body: request.method() === "OPTIONS" ? undefined : JSON.stringify({ message: "limited" }),
      });
    });

    await gotoWithRetry(page, `/${locale}`);

    const question = page.locator("textarea");
    await question.fill("테스트 질문");
    const limitedResponse = page.waitForResponse(
      response =>
        response.url().endsWith("/main-chat") &&
        response.request().method() === "POST" &&
        response.status() === 429,
    );
    await page.locator("button[type='submit']").click();
    await limitedResponse;
    await expect(question).toBeDisabled();
    await page.clock.fastForward(61_000);
    await expect(question).toBeEnabled();
    expect(chatRequests).toBe(1);
  });

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
