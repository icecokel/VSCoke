import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  loadMessages,
  gotoWithRetry,
  mockWordleWord,
  resolveLocaleAndMessages,
  type Locale,
  visit,
  waitForHistoryHydration,
  waitForHistoryPaths,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("키보드 전용 시나리오", () => {
  test.describe("사이드바 검색", () => {
    test.beforeEach(async ({ page }) => {
      const { messages } = await resolveLocaleAndMessages(page);
      await mockWordleWord(page);
      await page.getByRole("button", { name: messages.sidebar.search, exact: true }).click();
      await expect(page.getByTestId("blog-dashboard-search-input")).toBeVisible();
      await page.clock.install();
      await page.clock.pauseAt(await page.evaluate(() => Date.now()));
    });

    test("추천 목록에서 입력 직후 Enter를 누르면 현재 검색 결과를 연다", async ({ page }) => {
      const locale = (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR";
      const searchInput = page.getByTestId("blog-dashboard-search-input");

      await searchInput.fill("wordle");
      await searchInput.press("Enter");

      await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/game/wordle$`));
    });

    test("검색어를 바꾸면 이전 선택을 초기화하고 새 결과를 연다", async ({ page }) => {
      const locale = (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR";
      const searchInput = page.getByTestId("blog-dashboard-search-input");

      await searchInput.fill("blog");
      await page.clock.runFor(180);
      await searchInput.press("ArrowDown");
      await searchInput.fill("puzzle");
      await searchInput.press("Enter");

      await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/game/sky-drop$`));
    });

    test("결과가 없는 검색어를 입력한 직후 Enter를 눌러도 이동하지 않는다", async ({ page }) => {
      const searchInput = page.getByTestId("blog-dashboard-search-input");
      const beforeUrl = page.url();

      await searchInput.fill("no-matching-search-result-7391");
      await searchInput.press("Enter");

      await expect(page.locator("[data-slot='sidebar-content'] li > button")).toHaveCount(0);
      await expect(page).toHaveURL(beforeUrl);
    });

    test("IME 조합 중 Enter와 화살표·Escape는 검색을 조작하지 않는다", async ({ page }) => {
      const searchInput = page.getByTestId("blog-dashboard-search-input");
      const beforeUrl = page.url();

      await searchInput.fill("puzzle");
      await page.clock.runFor(180);
      for (const key of ["ArrowDown", "ArrowUp", "Escape", "Enter"]) {
        await searchInput.dispatchEvent("keydown", { key, isComposing: true });
      }
      await searchInput.dispatchEvent("keydown", { key: "Enter", keyCode: 229 });

      await expect(searchInput).toHaveValue("puzzle");
      await expect(page).toHaveURL(beforeUrl);
      await expect(page.locator("[data-slot='sidebar-content'] li > button").first()).toHaveClass(
        /bg-blue-500\/20/,
      );
    });
  });

  test("히스토리 탭을 전환하고 닫을 수 있다", async ({ page }) => {
    const locale = (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR";
    const messages = loadMessages(locale);

    await page.addInitScript(
      items => {
        localStorage.setItem("vscoke-history", JSON.stringify(items));
      },
      [
        {
          path: "/blog",
          title: "blog",
          isActive: false,
          lastAccessedAt: Date.now(),
        },
        {
          path: "/game",
          title: "game",
          isActive: true,
          lastAccessedAt: Date.now(),
        },
      ],
    );

    await visit(page, `/${locale}/game`);
    await waitForHistoryHydration(page);
    await waitForHistoryPaths(page, ["/blog", "/game"]);

    const tabRail = page.getByTestId("history-tab-rail");
    const blogTab = tabRail.getByRole("button", { name: "blog", exact: true });
    await blogTab.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/blog$`));

    const closeBlog = tabRail.getByRole("button", {
      name: `${messages.historyTabs.close}: blog`,
    });
    await closeBlog.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/game$`));
    await expect(blogTab).toHaveCount(0);
  });

  test("상단 메뉴와 탐색기 폴더·파일에 Tab으로 이동해 README를 연다", async ({ page }) => {
    const locale = (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR";
    const messages = loadMessages(locale);
    await page.setViewportSize({ width: 1180, height: 757 });
    await visit(page, `/${locale}`);
    await waitForHistoryHydration(page);

    const focusByTab = async (target: ReturnType<typeof page.getByRole>) => {
      for (let index = 0; index < 60; index += 1) {
        if (await target.evaluate(element => element === document.activeElement)) return;
        await page.keyboard.press("Tab");
      }
      await expect(target).toBeFocused();
    };

    await focusByTab(page.locator("#menubar").getByRole("button", { name: messages.menu.file }));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: messages.menu.openProject })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: messages.sidebar.explorer }).click();
    const hobbyFolder = page.getByRole("button", { name: "hobby", exact: true });
    await focusByTab(hobbyFolder);
    await expect(hobbyFolder).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Enter");
    await expect(hobbyFolder).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: "recipes.json", exact: true })).toBeVisible();

    await focusByTab(page.getByRole("button", { name: "README.md", exact: true }));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme`));
  });

  test("블로그 대시보드 자동완성을 선택할 수 있다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    await visit(page, `/${locale}/blog/dashboard`);

    const searchInput = page.getByTestId("blog-dashboard-title-search-input");
    const firstTitle = (await page.locator("article h5").first().textContent())?.trim();
    expect(firstTitle).toBeTruthy();

    await searchInput.fill(firstTitle!);
    const firstSuggestion = page.getByRole("option").first();
    await expect(firstSuggestion).toBeVisible();

    await searchInput.press("ArrowDown");
    await expect(firstSuggestion).toHaveAttribute("aria-selected", "true");
    await searchInput.press("Enter");
    await expect(searchInput).toHaveValue(firstTitle!);
  });

  test("Wordle에서 키보드만으로 입력/조작이 가능하다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const wordleWord = await mockWordleWord(page);

    await gotoWithRetry(page, `/${locale}/game/wordle`);

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`^${escapeRegExp(messages.Game.wordleTitle)}$`),
      }),
    ).toBeVisible();
    await expect(page.getByTestId("wordle-loading")).toBeHidden({ timeout: 20000 });
    await expect.poll(() => wordleWord.getRequestCount()).toBeGreaterThanOrEqual(1);

    const restartButton = page.getByTestId("wordle-header-restart");
    for (let index = 0; index < 30; index += 1) {
      if (await restartButton.evaluate(element => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(restartButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => wordleWord.getRequestCount()).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId("wordle-loading")).toBeHidden({ timeout: 20000 });

    const board = page.getByTestId("wordle-board");
    await page.keyboard.press("Control+A");
    await expect(board).not.toContainText("A");

    await page.keyboard.press("A");
    await page.keyboard.press("B");
    await page.keyboard.press("C");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("D");

    await expect(board).toContainText("ABD");
    await expect(board).not.toContainText("ABC");

    await page.keyboard.press("Enter");
    await expect(page.getByText(messages.Game.notEnoughLetters).first()).toBeVisible();
  });
});
