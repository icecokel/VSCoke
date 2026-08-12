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

    const board = page.locator("main div[style*='aspect-ratio']").first();
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
