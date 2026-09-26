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
    const board = page.getByTestId("wordle-board");
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

    const board = page.getByTestId("wordle-board");
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

test.describe("Wordle 입력과 화면 크기", () => {
  test.beforeEach(async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    await mockWordleWord(page);
    await page.route("**/wordle/check", route =>
      route.fulfill({ json: { success: true, data: { exists: true } } }),
    );
    await gotoWithRetry(page, `/${locale}/game/wordle`);
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
  });

  test("화면 키 클릭 뒤 물리 키보드로 입력·삭제·제출한다", async ({ page }) => {
    const row = page.locator(".grid-rows-6 > .grid-cols-5").first();
    await page.getByRole("button", { name: "A", exact: true }).click();
    await page.keyboard.type("PPLE");
    await expect(row).toHaveText("APPLE");
    await page.keyboard.press("Backspace");
    await expect(row).toHaveText("APPL");
    await page.keyboard.press("E");
    await page.keyboard.press("Enter");
    await expect(row.locator(".bg-green-600")).toHaveCount(5);
  });

  test("키보드로 화면 키를 누르면 포커스를 유지한다", async ({ page }) => {
    const key = page.getByRole("button", { name: "A", exact: true });
    await key.focus();
    await key.press("Enter");
    await expect(key).toBeFocused();
    await key.press("Space");
    await expect(key).toBeFocused();
    await expect(page.locator(".grid-rows-6 > .grid-cols-5").first()).toHaveText("AA");
  });

  test("한 번에 몰린 입력도 다섯 글자까지만 제출한다", async ({ page }) => {
    // 같은 이벤트 루프에서 입력해 React 상태 갱신이 묶이는 경계를 재현한다.
    await page.evaluate(() => {
      for (const key of "APPLEEXTRA") {
        window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      }
    });
    const request = page.waitForRequest(request => request.url().includes("/wordle/check"));
    await page.keyboard.press("Enter");
    expect((await request).postDataJSON()).toEqual({ word: "APPLE" });
    await expect(page.locator(".grid-rows-6 .bg-green-600")).toHaveCount(5);
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ]) {
    test(`${viewport.width}×${viewport.height}에서 타일과 키보드가 겹치지 않는다`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const tiles = page.locator(".grid-rows-6 > .grid-cols-5 > div");
      await expect(tiles).toHaveCount(30);
      const geometry = await tiles.evaluateAll(elements => {
        const main = elements[0].closest("main")!;
        const header = main.querySelector("header")!.getBoundingClientRect();
        const footer = main.querySelector("footer")!.getBoundingClientRect();
        return elements.map(element => {
          const tile = element.getBoundingClientRect();
          return {
            left: tile.left,
            right: tile.right,
            top: tile.top,
            bottom: tile.bottom,
            width: tile.width,
            height: tile.height,
            headerBottom: header.bottom,
            footerTop: footer.top,
            viewportWidth: innerWidth,
            viewportHeight: innerHeight,
          };
        });
      });
      for (const tile of geometry) {
        expect.soft(tile.left).toBeGreaterThanOrEqual(0);
        expect.soft(tile.right).toBeLessThanOrEqual(tile.viewportWidth);
        expect.soft(tile.top).toBeGreaterThanOrEqual(tile.headerBottom - 1);
        expect
          .soft(tile.bottom)
          .toBeLessThanOrEqual(Math.min(tile.footerTop, tile.viewportHeight) + 1);
        expect.soft(tile.width).toBeGreaterThan(0);
        expect.soft(Math.abs(tile.width - tile.height)).toBeLessThanOrEqual(1);
      }
      await expect(page.getByRole("button", { name: "Enter", exact: true })).toBeInViewport();
      await expect(page.getByRole("button", { name: "Backspace", exact: true })).toBeInViewport();
    });
  }
});
