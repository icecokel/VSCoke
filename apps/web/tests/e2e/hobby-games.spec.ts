import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  expectWordleKeyboardButtons,
  gotoWithRetry,
  loadMessages,
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

  test("Wordle 진행 중인 판은 다른 탭에 다녀와도 이어지고 재시작하면 새 판이 된다", async ({
    page,
  }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    let wordRequests = 0;
    await page.route("**/wordle/word", async route => {
      const requestNumber = ++wordRequests;
      await route.fulfill({
        json: { success: true, data: { word: requestNumber === 1 ? "apple" : "bread" } },
      });
    });
    await page.route("**/wordle/check", route =>
      route.fulfill({ json: { success: true, data: { exists: true } } }),
    );

    await gotoWithRetry(page, `/${locale}/game/wordle`);
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
    const board = page.getByTestId("wordle-board");
    await page.keyboard.type("PLANT");
    await page.keyboard.press("Enter");
    await expect(board.locator(".animate-flip")).toHaveCount(5);
    await page.keyboard.type("AP");
    await expect(board).toContainText("PLANTAP");

    await gotoWithRetry(page, `/${locale}/game`);
    await page
      .getByTestId("history-tab-rail")
      .getByRole("button", { name: messages.Game.wordleTitle, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/game/wordle$`));
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
    await expect(board).toContainText("PLANTAP");
    await expect(board.locator(".animate-flip")).toHaveCount(5);
    expect(wordRequests).toBe(1);

    await page.getByTestId("wordle-header-restart").click();
    await expect.poll(() => wordRequests).toBe(2);
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
    await expect(board).not.toContainText("PLANT");
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

  test("모바일 직접 진입 후 키보드로 같은 언어의 게임 센터에 복귀한다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoWithRetry(page, "/en-US/game/wordle");
    const link = page.getByRole("link", {
      name: loadMessages("en-US").Game.viewOtherGames,
      exact: true,
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/en-US/game");
    await link.hover();
    await expect(page.getByRole("tooltip")).toContainText(
      loadMessages("en-US").Game.viewOtherGames,
    );
    for (let index = 0; index < 20; index += 1) {
      if (await link.evaluate(element => element === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/en-US\/game$/);
  });

  for (const viewport of [
    { width: 1440, height: 900, hasTouch: false },
    { width: 360, height: 780, hasTouch: true },
    { width: 390, height: 844, hasTouch: true },
    { width: 768, height: 1024, hasTouch: true },
    { width: 780, height: 360, hasTouch: false },
    { width: 844, height: 390, hasTouch: false },
    { width: 780, height: 360, hasTouch: true },
    { width: 844, height: 390, hasTouch: true },
  ]) {
    test.describe(`${viewport.width}×${viewport.height} ${viewport.hasTouch ? "touch" : "fine"}`, () => {
      test.use({ hasTouch: viewport.hasTouch, isMobile: viewport.hasTouch });
      test("타일과 키보드가 겹치지 않고 조작 영역이 화면 안에 있다", async ({ page }, testInfo) => {
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
              footerBottom: footer.bottom,
              footerLeft: footer.left,
              footerRight: footer.right,
              viewportWidth: innerWidth,
              viewportHeight: innerHeight,
            };
          });
        });
        testInfo.annotations.push({
          type: "wordle-layout",
          description: JSON.stringify({
            ...viewport,
            minTile: Math.min(...geometry.map(tile => tile.width)),
          }),
        });
        for (const tile of geometry) {
          expect.soft(tile.left).toBeGreaterThanOrEqual(0);
          expect.soft(tile.right).toBeLessThanOrEqual(tile.viewportWidth);
          expect.soft(tile.top).toBeGreaterThanOrEqual(tile.headerBottom - 1);
          expect.soft(tile.bottom).toBeLessThanOrEqual(tile.viewportHeight + 1);
          expect
            .soft(
              tile.left < tile.footerRight &&
                tile.right > tile.footerLeft &&
                tile.top < tile.footerBottom &&
                tile.bottom > tile.footerTop,
            )
            .toBe(false);
          expect.soft(tile.width).toBeGreaterThanOrEqual(24);
          expect.soft(Math.abs(tile.width - tile.height)).toBeLessThanOrEqual(1);
        }
        await expect(page.getByRole("button", { name: "Enter", exact: true })).toBeInViewport();
        await expect(page.getByRole("button", { name: "Backspace", exact: true })).toBeInViewport();
        const controls = page.locator("main header a, main header button, main footer button");
        for (const control of await controls.all())
          await expect(control).toBeInViewport({ ratio: 1 });
        if (viewport.height <= 500) {
          await page.screenshot({ path: testInfo.outputPath("wordle-layout.png") });
        }
      });
    });
  }
});

test.describe("Wordle 완료한 판", () => {
  test.use({ viewport: { width: 780, height: 360 } });
  for (const outcome of ["won", "lost"] as const) {
    test(`${outcome} 결과는 알림 종료·새로고침·재진입 후에도 유지하고 재시작으로만 초기화한다`, async ({
      page,
    }, testInfo) => {
      const { locale, messages } = await resolveLocaleAndMessages(page);
      const word = await mockWordleWord(page);
      let checks = 0;
      await page.route("**/wordle/check", route => {
        checks += 1;
        return route.fulfill({ json: { success: true, data: { exists: true } } });
      });
      let completed = 0;
      await page.route("**/usage/events", route => {
        const event = route.request().postDataJSON() as { eventName: string; feature?: string };
        if (event.eventName === "game_completed" && event.feature === "wordle") completed += 1;
        return route.fulfill({ status: 202, json: {} });
      });
      await gotoWithRetry(page, `/${locale}/game/wordle`);
      await expect(page.getByTestId("wordle-loading")).toBeHidden();
      await page.clock.install();
      const board = page.getByTestId("wordle-board");
      const guesses =
        outcome === "won" ? ["APPLE"] : ["BREAD", "COAST", "PLANT", "SHORE", "SLATE", "CRANE"];
      for (const [index, guess] of guesses.entries()) {
        await page.keyboard.type(guess);
        await page.keyboard.press("Enter");
        await expect(board.locator(".animate-flip")).toHaveCount((index + 1) * 5);
      }
      const result = page.getByTestId("wordle-result");
      const title =
        outcome === "won" ? messages.Game.wordleWonTitle : messages.Game.wordleLostTitle;
      const description =
        outcome === "won"
          ? messages.Game.wordleWonDescription
          : messages.Game.wordleLostDescription.replace("{answer}", "APPLE");
      await expect(result).toHaveAttribute("role", "status");
      await expect(result).toContainText(title);
      await expect(result).toContainText(description);
      await expect(page.locator("[data-sonner-toast]")).toBeVisible();
      await page.clock.runFor(6000);
      await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
      await expect(result).toBeVisible();
      await expect
        .poll(async () => (await board.getByRole("img").first().boundingBox())!.width)
        .toBeGreaterThanOrEqual(24);
      for (const control of await page
        .locator("main header a, main header button, main footer button")
        .all())
        await expect(control).toBeInViewport({ ratio: 1 });
      await page.screenshot({
        path: testInfo.outputPath("wordle-finished.png"),
        animations: "disabled",
      });
      await expect.poll(() => completed).toBe(1);
      const finishedBoard = await board.textContent();

      await page.reload();
      await expect(result).toContainText(title);
      await expect(board).toHaveText(finishedBoard!);
      expect(word.getRequestCount()).toBe(1);
      await page.getByRole("link", { name: messages.Game.viewOtherGames, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/game$`));
      await page
        .locator("main.bg-slate-900")
        .getByRole("button", { name: new RegExp(escapeRegExp(messages.Game.wordleTitle)) })
        .click();
      await expect(result).toContainText(title);
      await expect(board).toHaveText(finishedBoard!);
      expect(word.getRequestCount()).toBe(1);
      await page.keyboard.type("XXXXX");
      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: "A", exact: true })).toBeDisabled();
      await expect(board).toHaveText(finishedBoard!);
      expect(checks).toBe(guesses.length);
      await page.getByTestId("wordle-header-restart").click();
      await expect.poll(() => word.getRequestCount()).toBe(2);
      await expect(page.getByTestId("wordle-loading")).toBeHidden();
      await expect(result).toHaveCount(0);
      await expect(board).toHaveText("");
      await page.keyboard.press("A");
      await expect(board).toHaveText("A");
      expect(completed).toBe(1);
    });
  }
});

test.describe("Wordle 준비와 오류 피드백", () => {
  test("단어와 검증 응답을 기다리는 동안 화면 키는 비활성이다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    let releaseWord = () => {};
    let wordStarted = () => {};
    const wordGate = new Promise<void>(resolve => {
      releaseWord = resolve;
    });
    const wordReady = new Promise<void>(resolve => {
      wordStarted = resolve;
    });
    let releaseCheck = () => {};
    let checkStarted = () => {};
    const checkGate = new Promise<void>(resolve => {
      releaseCheck = resolve;
    });
    const checkReady = new Promise<void>(resolve => {
      checkStarted = resolve;
    });
    await page.route("**/wordle/word", async route => {
      wordStarted();
      await wordGate;
      await route.fulfill({ json: { success: true, data: { word: "apple" } } });
    });
    await page.route("**/wordle/check", async route => {
      checkStarted();
      await checkGate;
      await route.fulfill({ json: { success: true, data: { exists: true } } });
    });
    try {
      await gotoWithRetry(page, `/${locale}/game/wordle`);
      await wordReady;
      const keys = page.getByTestId("wordle-frame").locator("footer button");
      await expect(keys).toHaveCount(28);
      await expect(page.getByRole("button", { name: "A", exact: true })).toBeDisabled();
      await page.keyboard.type("CRANE");
      releaseWord();
      await expect(page.getByTestId("wordle-loading")).toBeHidden();
      const board = page.getByTestId("wordle-board");
      await expect(board).toHaveText("");
      await expect(page.getByRole("button", { name: "A", exact: true })).toBeEnabled();
      await page.keyboard.type("BREAD");
      await page.keyboard.press("Enter");
      await checkReady;
      await expect(page.getByRole("button", { name: "A", exact: true })).toBeDisabled();
      await page.keyboard.press("Backspace");
      releaseCheck();
      await expect(board.locator(".animate-flip")).toHaveCount(5);
      await expect(board).toHaveText("BREAD");
      await expect(page.getByRole("button", { name: "A", exact: true })).toBeEnabled();
    } finally {
      releaseWord();
      releaseCheck();
    }
  });

  test("최초 단어 실패 안내는 알림 종료 후에도 남고 재시작으로 복구한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    let fails = true;
    await page.route("**/wordle/word", route =>
      route.fulfill(
        fails ? { status: 503, json: {} } : { json: { success: true, data: { word: "apple" } } },
      ),
    );
    await page.clock.install();
    await gotoWithRetry(page, `/${locale}/game/wordle`);
    const apiToast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: messages.Game.apiUnavailable });
    await expect(apiToast).toBeVisible();
    await page.clock.runFor(6000);
    await expect(apiToast).toHaveCount(0);
    const error = page.getByTestId("wordle-error");
    await expect(error).toContainText(messages.Game.apiUnavailable);
    await expect(page.getByRole("button", { name: "A", exact: true })).toBeDisabled();
    fails = false;
    await error.getByRole("button").click();
    await expect(error).toHaveCount(0);
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
    await expect(page.getByRole("button", { name: "A", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "A", exact: true }).click();
    await expect(page.getByTestId("wordle-board")).toHaveText("A");
    await expect(apiToast).toHaveCount(0);
  });

  test("단어 검증 실패는 입력을 유지하고 재Enter 성공 후 오류 알림을 지운다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await mockWordleWord(page);
    let fails = true;
    let checks = 0;
    await page.route("**/wordle/check", route => {
      checks += 1;
      return route.fulfill(
        fails ? { status: 503, json: {} } : { json: { success: true, data: { exists: true } } },
      );
    });
    await page.clock.install();
    await gotoWithRetry(page, `/${locale}/game/wordle`);
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
    await page.keyboard.type("BREAD");
    await page.keyboard.press("Enter");
    const apiToast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: messages.Game.apiUnavailable });
    await expect(apiToast).toBeVisible();
    await expect(page.getByTestId("wordle-board")).toHaveText("BREAD");
    await expect(page.getByRole("button", { name: "Enter", exact: true })).toBeEnabled();
    await expect(page.getByTestId("wordle-error")).toHaveCount(0);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
    fails = false;
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("wordle-board").locator(".animate-flip")).toHaveCount(5);
    await page.clock.runFor(50);
    await expect(apiToast).toHaveAttribute("data-removed", "true");
    await page.clock.runFor(300);
    await expect(apiToast).toHaveCount(0);
    expect(checks).toBe(2);
    await expect(page.getByRole("button", { name: "A", exact: true })).toBeEnabled();
  });

  test("재시작과 이탈은 Wordle 결과 알림만 지우고 다른 알림은 유지한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await page.addInitScript(() => {
      sessionStorage.setItem(
        "vscoke:wordle-session",
        JSON.stringify({ answer: "APPLE", guesses: ["APPLE"], currentGuess: "", startedAt: 1000 }),
      );
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => {} },
      });
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    });
    const word = await mockWordleWord(page);
    await page.route("**/wordle/check", route =>
      route.fulfill({ json: { success: true, data: { exists: true } } }),
    );
    await page.clock.install();
    await gotoWithRetry(page, `/${locale}/game/wordle`);
    const resultToast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: messages.Game.wordleWonTitle });
    await expect(resultToast).toBeVisible();
    await page.getByTestId("share-link-button").click();
    const copied = page.locator("[data-sonner-toast]").filter({ hasText: messages.Share.copied });
    await expect(copied).toBeVisible();
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
    await page.getByTestId("wordle-header-restart").click();
    await expect.poll(() => word.getRequestCount()).toBe(1);
    await expect(page.getByTestId("wordle-loading")).toBeHidden();
    await page.clock.runFor(50);
    await expect(resultToast).toHaveAttribute("data-removed", "true");
    await page.clock.runFor(300);
    await expect(resultToast).toHaveCount(0);
    await expect(copied).toBeVisible();
    await page.keyboard.type("APPLE");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("wordle-result")).toBeVisible();
    await page.clock.runFor(100);
    await expect(resultToast).toBeVisible();
    await page.getByRole("link", { name: messages.Game.viewOtherGames, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/game$`));
    await page.clock.runFor(50);
    await expect(resultToast).toHaveAttribute("data-removed", "true");
    await page.clock.runFor(300);
    await expect(resultToast).toHaveCount(0);
    await expect(copied).toBeVisible();
  });
});

for (const hasTouch of [false, true]) {
  test.describe(`Wordle 960px 완료판 높이 경계 ${hasTouch ? "touch" : "fine"}`, () => {
    test.use({ hasTouch, isMobile: hasTouch });
    test("500/501/550/600/601px에서 타일과 결과·키를 볼 수 있다", async ({ page }, testInfo) => {
      const { locale, messages } = await resolveLocaleAndMessages(page);
      await page.addInitScript(() =>
        sessionStorage.setItem(
          "vscoke:wordle-session",
          JSON.stringify({
            answer: "APPLE",
            guesses: ["APPLE"],
            currentGuess: "",
            startedAt: 1000,
          }),
        ),
      );
      const word = await mockWordleWord(page);
      await page.clock.install();
      await page.setViewportSize({ width: 960, height: 500 });
      await gotoWithRetry(page, `/${locale}/game/wordle`);
      const toast = page
        .locator("[data-sonner-toast]")
        .filter({ hasText: messages.Game.wordleWonTitle });
      await expect(toast).toBeVisible();
      await page.clock.runFor(6000);
      await expect(toast).toHaveCount(0);
      for (const height of [500, 501, 550, 600, 601]) {
        await page.setViewportSize({ width: 960, height });
        await page.screenshot({
          path: testInfo.outputPath(`wordle-960x${height}.png`),
          animations: "disabled",
        });
        const tiles = page.getByTestId("wordle-board").getByRole("img");
        const minTile = await tiles.evaluateAll(elements =>
          Math.min(...elements.map(element => element.getBoundingClientRect().width)),
        );
        expect(minTile).toBeGreaterThanOrEqual(24);
        await expect(page.getByTestId("wordle-result")).toBeInViewport({ ratio: 1 });
        for (const control of await page
          .getByTestId("wordle-frame")
          .locator("header a, header button, footer button")
          .all())
          await expect(control).toBeInViewport({ ratio: 1 });
        testInfo.annotations.push({
          type: "wordle-boundary",
          description: JSON.stringify({ hasTouch, height, minTile }),
        });
      }
      expect(word.getRequestCount()).toBe(0);
    });
  });
}
