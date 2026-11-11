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
  for (const width of [767, 768, 899, 900]) {
    test(`${width}px에서 탐색 메뉴를 열 수 있다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await gotoWithRetry(page, "/ko-KR");
      if (width < 900) {
        await page.getByTestId("sidebar-trigger-mobile").click();
        await expect(
          page
            .getByRole("dialog")
            .getByRole("button", { name: loadMessages("ko-KR").sidebar.search }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByRole("button", { name: loadMessages("ko-KR").sidebar.search }),
        ).toBeVisible();
      }
    });
  }
  test.describe("사이드바 검색", () => {
    test.beforeEach(async ({ page }) => {
      const { messages } = await resolveLocaleAndMessages(page);
      await mockWordleWord(page);
      await page.getByRole("button", { name: messages.sidebar.search, exact: true }).click();
      await expect(page.getByTestId("blog-dashboard-search-input")).toBeVisible();
      await expect(page.getByTestId("blog-dashboard-search-input")).toBeFocused();
      await page.clock.install();
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
    });

    test("combobox의 현재 선택과 키보드 이동·스크롤·Enter 대상이 일치한다", async ({ page }) => {
      const input = page.getByTestId("blog-dashboard-search-input");
      await expect(input).toHaveAttribute("role", "combobox");
      await expect(input).toHaveAttribute("aria-autocomplete", "list");
      await expect(input).toHaveAttribute("aria-expanded", "true");
      const list = page.getByRole("listbox");
      await expect(input).toHaveAttribute("aria-controls", (await list.getAttribute("id"))!);
      await input.fill("a");
      const options = list.getByRole("option");
      await expect.poll(() => options.count()).toBeGreaterThan(15);
      await input.focus();
      await input.press("ArrowDown");
      await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
      await expect(input).toHaveAttribute(
        "aria-activedescendant",
        (await options.nth(1).getAttribute("id"))!,
      );
      await input.press("ArrowUp");
      await expect(options.first()).toHaveAttribute("aria-selected", "true");
      for (let index = 0; index < 15; index += 1) await input.press("ArrowDown");
      const selected = list.getByRole("option", { selected: true });
      await expect(selected).toHaveCount(1);
      await expect(input).toHaveAttribute(
        "aria-activedescendant",
        (await selected.getAttribute("id"))!,
      );
      await expect(selected).toHaveClass(/bg-blue-500\/20/);
      await expect(selected).toBeInViewport({ ratio: 1 });
      await expect(input).toBeFocused();
      const path = (await selected.locator("span").last().textContent())!;
      const locale = (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR";
      await input.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}${escapeRegExp(path)}$`));
    });

    test("검색 사용 집계는 입력이 멈춘 180ms 뒤 한 번만 보낸다", async ({ page }) => {
      let searches = 0;
      await page.route("**/usage/events", route => {
        const event = route.request().postDataJSON() as { eventName: string };
        if (event.eventName === "search_used") searches += 1;
        return route.fulfill({ status: 202, json: {} });
      });
      const input = page.getByTestId("blog-dashboard-search-input");
      await input.fill("w");
      await page.clock.runFor(100);
      await input.fill("wordle");
      await page.clock.runFor(179);
      expect(searches).toBe(0);
      await page.clock.runFor(1);
      await expect.poll(() => searches).toBe(1);
      await input.press("ArrowDown");
      await page.clock.runFor(180);
      expect(searches).toBe(1);
      await input.press("Escape");
      await page.clock.runFor(180);
      expect(searches).toBe(1);
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
      await expect(searchInput).toHaveAttribute("aria-expanded", "false");
      expect(await searchInput.getAttribute("aria-activedescendant")).toBeNull();
      const status = page.locator("[data-slot='sidebar-content']").getByRole("status");
      const messages = loadMessages(
        (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR",
      );
      await expect(status).toHaveCount(1);
      await expect(status).toHaveText(messages.sidebar.searchResultCount.replace("{count}", "0"));
      await expect(
        page
          .locator("[data-slot='sidebar-content']")
          .getByText(messages.sidebar.searchNoResult, { exact: true }),
      ).toBeVisible();
      await searchInput.press("Escape");
      await expect(searchInput).toHaveValue("");
      await expect(searchInput).toHaveAttribute("aria-expanded", "true");
      expect(await searchInput.getAttribute("aria-activedescendant")).toBeTruthy();
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

  test("Wordle 탭으로 돌아오면 게임 영역을 클릭하지 않고 입력한다", async ({ page }) => {
    await mockWordleWord(page);
    await gotoWithRetry(page, "/ko-KR/game/wordle");
    await expect(page.getByTestId("wordle-loading")).toHaveCount(0);
    await gotoWithRetry(page, "/ko-KR");
    await page
      .getByTestId("history-tab-rail")
      .getByRole("button", { name: /wordle/i })
      .first()
      .click();
    await expect(page.locator("main[tabindex='-1']")).toBeFocused();
    await expect(page.getByTestId("wordle-loading")).toHaveCount(0);
    await page.keyboard.press("A");
    await expect(page.getByTestId("wordle-board")).toContainText("A");
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
    const blogTab = tabRail.getByRole("button", { name: messages.blog.title, exact: true });
    await blogTab.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/blog$`));

    const closeBlog = tabRail.getByRole("button", {
      name: `${messages.historyTabs.close}: ${messages.blog.title}`,
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
