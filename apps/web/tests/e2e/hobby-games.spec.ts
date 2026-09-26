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
  test("Wordle 재시작 후 이전 단어 검증 결과를 버린다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    let wordRequests = 0;
    await page.route("**/wordle/word", async route => {
      const requestNumber = ++wordRequests;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { word: requestNumber === 1 ? "apple" : "bread" },
        }),
      });
    });

    let releaseCheck!: () => void;
    let checkStarted!: () => void;
    const firstCheck = new Promise<void>(resolve => {
      checkStarted = resolve;
    });
    let checkRequests = 0;
    await page.route("**/wordle/check", async route => {
      checkRequests += 1;
      if (checkRequests === 1) {
        await new Promise<void>(resolve => {
          releaseCheck = resolve;
          checkStarted();
        });
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { exists: true } }),
      });
    });

    await gotoWithRetry(page, `/${locale}/game/wordle`);
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
    const board = page.locator("main div[style*='aspect-ratio']").first();
    await page.keyboard.type("APPLE");
    await expect(board).toContainText("APPLE");
    await page.keyboard.press("Enter");
    await firstCheck;

    await page.getByTestId("wordle-header-restart").click();
    await expect.poll(() => wordRequests).toBe(2);
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
    const oldResponse = page.waitForResponse(response => response.url().includes("/wordle/check"));
    releaseCheck();
    await oldResponse;

    await page.keyboard.type("BREAD");
    await page.keyboard.press("Enter");
    await expect(board.locator(".bg-green-600")).toHaveCount(5);
  });

  test("Wordle 연속 재시작 후 이전 단어 로딩 결과를 버린다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    let releaseFirstWord!: () => void;
    let releaseSecondWord!: () => void;
    let firstWordStarted!: () => void;
    let secondWordStarted!: () => void;
    const firstWord = new Promise<void>(resolve => {
      firstWordStarted = resolve;
    });
    const secondWord = new Promise<void>(resolve => {
      secondWordStarted = resolve;
    });
    let wordRequests = 0;
    await page.route("**/wordle/word", async route => {
      const requestNumber = ++wordRequests;
      if (requestNumber <= 2) {
        await new Promise<void>(resolve => {
          if (requestNumber === 1) {
            releaseFirstWord = resolve;
            firstWordStarted();
          } else {
            releaseSecondWord = resolve;
            secondWordStarted();
          }
        });
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { word: ["apple", "coast", "bread"][requestNumber - 1] },
        }),
      });
    });
    await page.route("**/wordle/check", route =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { exists: true } }),
      }),
    );

    await gotoWithRetry(page, `/${locale}/game/wordle`);
    await firstWord;
    await page.getByTestId("wordle-header-restart").click();
    await secondWord;
    await page.getByTestId("wordle-header-restart").click();
    await expect.poll(() => wordRequests).toBe(3);
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
    const secondResponse = page.waitForResponse(response =>
      response.url().includes("/wordle/word"),
    );
    releaseSecondWord();
    await secondResponse;
    const firstResponse = page.waitForResponse(response => response.url().includes("/wordle/word"));
    releaseFirstWord();
    await firstResponse;

    const board = page.locator("main div[style*='aspect-ratio']").first();
    await page.keyboard.type("BREAD");
    await page.keyboard.press("Enter");
    await expect(board.locator(".bg-green-600")).toHaveCount(5);
  });

  test("게임 센터에서 취미 게임 목록과 주요 직접 진입 화면을 검증한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await gotoWithRetry(page, `/${locale}/game`);

    await expect(page.getByRole("heading", { name: messages.home.cards.gameTitle })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sky Drop/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(escapeRegExp(messages.Game.wordleTitle)) }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /doom|둠/i })).toHaveCount(0);

    await gotoWithRetry(page, `/${locale}/game/sky-drop`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game/sky-drop$`));
    await expect(page.getByTestId("game-start-button")).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("game-exit-button")).toBeVisible();

    const removedFishDriftResponse = await gotoWithRetry(
      page,
      `/${locale}/game/fish-drift`,
      1,
      false,
    );
    expect(removedFishDriftResponse?.status()).toBe(404);

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
