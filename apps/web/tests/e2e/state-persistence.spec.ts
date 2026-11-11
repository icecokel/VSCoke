import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  gotoWithRetry,
  getHistorySnapshot,
  resolveLocaleAndMessages,
  visit,
  waitForHistoryHydration,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

const expectHistoryToContainPaths = async (page: Parameters<typeof getHistorySnapshot>[0]) => {
  await expect
    .poll(async () => {
      const snapshot = await getHistorySnapshot(page);
      const paths = snapshot.map((item: { path: string }) => item.path);

      return {
        hasReadme: paths.some((value: string) => value.endsWith("/readme")),
        hasBlog: paths.some((value: string) => value.endsWith("/blog")),
        hasGame: paths.some((value: string) => value.endsWith("/game")),
      };
    })
    .toEqual({
      hasReadme: true,
      hasBlog: true,
      hasGame: true,
    });
};

test.describe("새로고침 상태 복원", () => {
  test("history/localStorage 상태가 reload 이후에도 유지된다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/readme`);
    await visit(page, `/${locale}/blog`);
    await visit(page, `/${locale}/game`);
    await waitForHistoryHydration(page);
    await expectHistoryToContainPaths(page);

    const beforeReload = await getHistorySnapshot(page);
    const beforePaths = beforeReload.map((item: { path: string }) => item.path);
    expect(beforePaths.some((value: string) => value.endsWith("/readme"))).toBeTruthy();
    expect(beforePaths.some((value: string) => value.endsWith("/blog"))).toBeTruthy();
    expect(beforePaths.some((value: string) => value.endsWith("/game"))).toBeTruthy();

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game$`));
    await waitForHistoryHydration(page);
    await expectHistoryToContainPaths(page);

    const afterReload = await getHistorySnapshot(page);
    const afterPaths = afterReload.map((item: { path: string }) => item.path);
    expect(afterPaths.some((value: string) => value.endsWith("/readme"))).toBeTruthy();
    expect(afterPaths.some((value: string) => value.endsWith("/blog"))).toBeTruthy();
    expect(afterPaths.some((value: string) => value.endsWith("/game"))).toBeTruthy();

    const activeItem = afterReload.find((item: { isActive: boolean }) => item.isActive);
    expect(activeItem?.path.endsWith("/game")).toBeTruthy();

    await expect(page.locator('div[id$="/game"][class*="bg-gray-800"]')).toBeVisible();
  });
});

test.describe("블로그 대시보드 검색 복원", () => {
  for (const selection of ["manual", "suggestion"]) {
    test(`${selection} 검색 후 글을 열고 Back하면 입력과 목록을 복원하고 clear도 유지한다`, async ({
      page,
    }) => {
      const { locale } = await resolveLocaleAndMessages(page);
      await visit(page, `/${locale}/blog/dashboard`);
      const input = page.getByTestId("blog-dashboard-title-search-input");
      const titles = page.locator("article h5");
      const allTitles = await titles.allTextContents();
      await input.fill("ClickHouse");
      const expected = allTitles.filter(title => title.toLowerCase().includes("clickhouse"));
      expect(expected.length).toBeGreaterThan(0);
      await expect(titles).toHaveText(expected);
      let query = "ClickHouse";
      if (selection === "suggestion") {
        const option = page.getByRole("option").first();
        query = (await option.textContent())!.trim();
        await option.click();
        await expect(input).toHaveValue(query);
      }
      const filteredTitles = await titles.allTextContents();
      const firstResult = page
        .getByRole("link")
        .filter({ has: page.locator("article") })
        .first();
      const href = (await firstResult.getAttribute("href"))!;
      await firstResult.click();
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(href)}$`));
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/blog/dashboard$`));
      await expect(input).toHaveValue(query);
      await expect(titles).toHaveText(filteredTitles);
      await input.fill("");
      await page.reload();
      await expect(input).toHaveValue("");
      await expect(titles).toHaveText(allTitles);
    });
  }

  test("debounce 전에 이동해도 검색을 저장하고 locale별로 구분한다", async ({ page }) => {
    await gotoWithRetry(page, "/ko-KR/blog/dashboard");
    const input = page.getByTestId("blog-dashboard-title-search-input");
    const titles = page.locator("article h5");
    const allTitles = await titles.allTextContents();
    await page.clock.install();
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
    await input.fill("ClickHouse");
    await page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: /ClickHouse/i }) })
      .first()
      .click();
    await expect(page).not.toHaveURL(/\/blog\/dashboard$/);
    await page.goBack();
    await expect(input).toHaveValue("ClickHouse");
    await expect(titles).toHaveText(allTitles.filter(title => /clickhouse/i.test(title)));
    await gotoWithRetry(page, "/en-US/blog/dashboard");
    await expect(input).toHaveValue("");
    await expect(titles).toHaveText(allTitles);
    await gotoWithRetry(page, "/ko-KR/blog/dashboard");
    await expect(input).toHaveValue("ClickHouse");
    await expect(titles).toHaveText(allTitles.filter(title => /clickhouse/i.test(title)));
  });

  test("세션 저장소가 차단되어도 입력·자동완성·비우기가 동작한다", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get: () => {
          throw new DOMException("Blocked", "SecurityError");
        },
      });
    });
    const errors: Error[] = [];
    page.on("pageerror", error => errors.push(error));
    await gotoWithRetry(page, "/ko-KR/blog/dashboard");
    const input = page.getByTestId("blog-dashboard-title-search-input");
    const titles = page.locator("article h5");
    const allTitles = await titles.allTextContents();
    await input.fill("ClickHouse");
    await expect(titles).toHaveText(allTitles.filter(title => /clickhouse/i.test(title)));
    const option = page.getByRole("option").first();
    const title = (await option.textContent())!.trim();
    await option.click();
    await expect(input).toHaveValue(title);
    await input.fill("");
    await expect(titles).toHaveText(allTitles);
    expect(errors).toEqual([]);
  });
});
