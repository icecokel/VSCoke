import { expect, test, type Page } from "@playwright/test";
import {
  escapeRegExp,
  getHistorySnapshot,
  type Locale,
  resolveLocaleAndMessages,
  visit,
  waitForHistoryHydration,
  waitForHistoryPaths,
} from "./test-helpers";

const getTestLocale = (): Locale =>
  (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR";

const installHistoryFixture = async (
  page: Page,
  history: Array<{
    path: string;
    title: string;
    isActive: boolean;
    lastAccessedAt?: number;
  }>,
) => {
  await page.addInitScript(items => {
    const fixtureFlag = "__vscoke-history-fixture-installed";
    if (sessionStorage.getItem(fixtureFlag)) return;

    localStorage.setItem("vscoke-history", JSON.stringify(items));
    sessionStorage.setItem(fixtureFlag, "true");
  }, history);
};

test.describe("히스토리 탭 상태머신", () => {
  test("마지막 접근 값이 없거나 3일 지난 탭은 만료된다", async ({ page }) => {
    const locale = getTestLocale();
    const expiredAt = Date.now() - 4 * 24 * 60 * 60 * 1000;

    await installHistoryFixture(page, [
      {
        path: "/blog",
        title: "blog",
        isActive: true,
        lastAccessedAt: expiredAt,
      },
      {
        path: "/readme",
        title: "readme",
        isActive: false,
        lastAccessedAt: Date.now(),
      },
      {
        path: "/package",
        title: "package",
        isActive: false,
      },
    ]);

    await visit(page, `/${locale}/game`);
    await waitForHistoryHydration(page);

    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        const paths = current.map((item: { path: string }) => item.path);

        return {
          hasExpiredTab: paths.includes("/blog"),
          hasLegacyTab: paths.includes("/package"),
          hasRecentTab: paths.includes("/readme"),
          activePath: current.find((item: { isActive: boolean }) => item.isActive)?.path,
        };
      })
      .toEqual({
        hasExpiredTab: false,
        hasLegacyTab: false,
        hasRecentTab: true,
        activePath: "/game",
      });
  });

  test("빈 히스토리 상태에서도 탭 영역 높이를 예약한다", async ({ page }) => {
    await installHistoryFixture(page, []);

    const locale = getTestLocale();
    await visit(page, `/${locale}`);

    const tabRail = page.locator('[data-testid="history-tab-rail"]');
    await expect(tabRail).toBeVisible();
    await expect(tabRail).toHaveCSS("height", "32px");

    await waitForHistoryHydration(page);
    await expect(tabRail).toHaveCSS("height", "32px");
  });

  test("공유 상세 탭은 URL 식별자 대신 공유 탭 이름으로 표시한다", async ({ page }) => {
    const locale = getTestLocale();
    const shareId = "00000000-0000-4000-8000-000000000000";
    const sharePath = `/share/${shareId}`;

    await installHistoryFixture(page, [
      {
        path: sharePath,
        title: shareId,
        isActive: false,
        lastAccessedAt: Date.now(),
      },
    ]);

    await visit(page, `/${locale}`);
    await waitForHistoryHydration(page);
    await waitForHistoryPaths(page, [sharePath]);

    const shareTab = page.locator(`div[id='${sharePath}']`).first();
    await expect(shareTab).toBeVisible();
    await expect(shareTab).toContainText("share");
    await expect(shareTab).not.toContainText(shareId);
  });

  test("탭 추가/활성화/스마트 닫기 동작이 일관되다", async ({ page }) => {
    await installHistoryFixture(page, []);

    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/readme`);
    await visit(page, `/${locale}/blog`);
    await visit(page, `/${locale}/game`);

    await waitForHistoryHydration(page);
    await waitForHistoryPaths(page, ["/readme", "/blog", "/game"]);

    const initialHistory = await getHistorySnapshot(page);
    const initialPaths = initialHistory.map((item: { path: string }) => item.path);
    expect(initialPaths.some((value: string) => value.endsWith("/readme"))).toBeTruthy();
    expect(initialPaths.some((value: string) => value.endsWith("/blog"))).toBeTruthy();
    expect(initialPaths.some((value: string) => value.endsWith("/game"))).toBeTruthy();

    const blogTab = page.locator("div[id='/blog']").first();
    await expect(blogTab).toBeVisible();
    await visit(page, `/${locale}/blog`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/blog$`));
    await waitForHistoryHydration(page);

    await blogTab.locator("svg").first().click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game$`));
    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.find((item: { isActive: boolean }) => item.isActive)?.path;
      })
      .toBe("/game");

    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.some((item: { path: string }) => item.path.endsWith("/blog"));
      })
      .toBe(false);

    const gameTab = page.locator("div[id='/game']").first();
    await expect(gameTab).toBeVisible();
    await gameTab.locator("svg").first().click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/readme$`));
    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.find((item: { isActive: boolean }) => item.isActive)?.path;
      })
      .toBe("/readme");

    const readmeTab = page.locator("div[id='/readme']").first();
    await expect(readmeTab).toBeVisible();
    await readmeTab.locator("svg").first().click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}(?:/)?$`));

    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        const paths = current.map((item: { path: string }) => item.path);
        return {
          hasReadme: paths.some((value: string) => value.endsWith("/readme")),
          hasBlog: paths.some((value: string) => value.endsWith("/blog")),
          hasGame: paths.some((value: string) => value.endsWith("/game")),
        };
      })
      .toEqual({ hasReadme: false, hasBlog: false, hasGame: false });

    await expect(page.getByText(messages.menu.file, { exact: true })).toBeVisible();
  });

  test("휠 클릭으로 탭을 스마트 닫기한다", async ({ page }) => {
    await installHistoryFixture(page, []);

    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/readme`);
    await visit(page, `/${locale}/blog`);

    await waitForHistoryHydration(page);
    await waitForHistoryPaths(page, ["/readme", "/blog"]);

    const blogTab = page.locator("div[id='/blog']").first();
    await blogTab.click({ button: "middle" });

    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/readme$`));
    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.some((item: { path: string }) => item.path.endsWith("/blog"));
      })
      .toBe(false);
  });
});
