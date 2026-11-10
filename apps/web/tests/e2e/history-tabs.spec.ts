import { expect, test, type Page } from "@playwright/test";
import type { ResumeDocument } from "@/services/resume-service";
import {
  escapeRegExp,
  getHistorySnapshot,
  loadMessages,
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
  test("기본 README의 과거 중복 탭은 최근 제목과 순서를 보존해 합친다", async ({ page }) => {
    const now = Date.now();
    await installHistoryFixture(page, [
      { path: "/readme", title: "old title", isActive: false, lastAccessedAt: now - 1000 },
      { path: "/blog", title: "blog", isActive: false, lastAccessedAt: now },
      {
        path: "/readme?resume=pe#career_1",
        title: "recent title",
        isActive: true,
        lastAccessedAt: now,
      },
    ]);
    await visit(page, `/${getTestLocale()}/game`);
    await waitForHistoryHydration(page);

    await expect
      .poll(async () => {
        const history = await getHistorySnapshot(page);
        return history.map((item: { path: string; title: string }) => [item.path, item.title]);
      })
      .toEqual([
        ["/readme", "recent title"],
        ["/blog", "blog"],
        ["/game", "game"],
      ]);
  });

  test("README 탐색기와 기본 문서 검색을 왕복해도 탭이 하나다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await visit(page, `/${locale}/readme`);
    await page.getByRole("button", { name: messages.sidebar.search, exact: true }).click();
    await page.getByTestId("blog-dashboard-search-input").fill("README.md");
    await page.locator("[data-slot='sidebar-content'] li > button").first().click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme\\?resume=pe$`));

    const rail = page.getByTestId("history-tab-rail");
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(1);
    await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
    await page.getByRole("button", { name: messages.sidebar.explorer, exact: true }).click();
    await page
      .locator("[data-slot='sidebar-content']")
      .getByText("README.md", { exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme$`));
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(1);
  });

  test("경력 상세 버튼 한 번으로 제목 있는 탭 하나를 열고 새로고침 후 닫는다", async ({
    page,
    request,
  }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const { data }: { data: ResumeDocument } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}`)
    ).json();
    const project = data.careers
      .flatMap(career => career.projects)
      .find(project => project.fileRef)!;
    const detailPath = `/resume/${project.fileRef}`;
    await visit(page, `/${locale}/readme?resume=pe`);
    await page
      .getByRole("button", { name: messages.resume.viewDescription, exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${escapeRegExp(locale)}${escapeRegExp(detailPath)}\\?resume=pe$`),
    );

    const rail = page.getByTestId("history-tab-rail");
    const detailTab = rail.locator(`div[id='${detailPath}']`);
    await expect(rail.locator("div[id^='/resume/']")).toHaveCount(1);
    await expect(
      detailTab.getByRole("button", { name: project.title, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.reload();
    await expect(
      detailTab.getByRole("button", { name: project.title, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await detailTab
      .getByRole("button", { name: `${messages.historyTabs.close}: ${project.title}`, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme$`));
    await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
    await expect(rail.locator("div[id^='/resume/']")).toHaveCount(0);
  });

  test("FE와 PE 문서는 별개 탭으로 새로고침과 뒤로·앞으로 이동에도 유지한다", async ({
    page,
    request,
  }) => {
    const locale = getTestLocale();
    const { data: pe }: { data: ResumeDocument } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}&resume=pe`)
    ).json();
    const { data: fe }: { data: ResumeDocument } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}&resume=fe`)
    ).json();
    await visit(page, `/${locale}/readme?resume=pe`);
    await visit(page, `/${locale}/readme?resume=fe`);
    const rail = page.getByTestId("history-tab-rail");
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(2);
    await expect(
      rail.locator("div[id='/readme?resume=fe'] button[aria-current='page']"),
    ).toHaveCount(1);
    await page.reload();
    await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
    await expect(rail.locator("button[aria-current='page']")).toHaveCount(1);
    await page.goBack();
    await expect(page.getByRole("heading", { name: pe.title, exact: true })).toBeVisible();
    await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
    await page.goForward();
    await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
    await expect(
      rail.locator("div[id='/readme?resume=fe'] button[aria-current='page']"),
    ).toHaveCount(1);
    await rail.locator("div[id='/readme'] > button").first().click();
    await expect(page.getByRole("heading", { name: pe.title, exact: true })).toBeVisible();
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(2);
    const feTab = rail.locator("div[id='/readme?resume=fe']");
    await feTab.locator("button").first().click();
    await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
    await feTab
      .getByRole("button", {
        name: new RegExp(`^${escapeRegExp(loadMessages(locale).historyTabs.close)}: `),
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme$`));
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(1);
    await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
  });

  test("없는 상세 query 탭만 닫고 인접 FE 문서로 복구한다", async ({ page }) => {
    const now = Date.now();
    await installHistoryFixture(page, [
      { path: "/readme", title: "PE", isActive: false, lastAccessedAt: now },
      {
        path: "/resume/nonexistent-resume-detail?resume=fe",
        title: "missing",
        isActive: true,
        lastAccessedAt: now,
      },
      { path: "/readme?resume=fe", title: "FE", isActive: false, lastAccessedAt: now },
    ]);
    const response = await page.goto(
      `/${getTestLocale()}/resume/nonexistent-resume-detail?resume=fe`,
    );
    expect(response?.status()).toBe(404);

    await expect(page).toHaveURL(
      new RegExp(`/${escapeRegExp(getTestLocale())}/readme\\?resume=fe$`),
    );
    await expect
      .poll(async () =>
        (await getHistorySnapshot(page)).map((item: { path: string; isActive: boolean }) => [
          item.path,
          item.isActive,
        ]),
      )
      .toEqual([
        ["/readme", false],
        ["/readme?resume=fe", true],
      ]);
    await expect(
      page.getByTestId("history-tab-rail").getByRole("button", { name: "PE", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByTestId("history-tab-rail").getByRole("button", { name: "FE", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("저장소 접근이 차단되어도 현재 탭을 표시한다", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", error => errors.push(error));
    await page.addInitScript(() => {
      const originalGet = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === "vscoke-history") throw new DOMException("blocked", "SecurityError");
        return originalGet.call(this, key);
      };
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "vscoke-history") throw new DOMException("blocked", "SecurityError");
        return originalSet.call(this, key, value);
      };
      const originalRemove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key) {
        if (key === "vscoke-history") throw new DOMException("blocked", "SecurityError");
        return originalRemove.call(this, key);
      };
    });

    await visit(page, `/${getTestLocale()}/game`);
    await expect(
      page.getByTestId("history-tab-rail").locator('button[aria-current="page"]'),
    ).toContainText("game");
    expect(errors).toEqual([]);
  });

  test("저장소 쓰기가 실패해도 현재 탭을 표시한다", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", error => errors.push(error));
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "vscoke-history") throw new DOMException("full", "QuotaExceededError");
        return original.call(this, key, value);
      };
    });

    await visit(page, `/${getTestLocale()}/game`);
    await expect(
      page.getByTestId("history-tab-rail").locator('button[aria-current="page"]'),
    ).toContainText("game");
    expect(errors).toEqual([]);
  });

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

  test("탭이 많아 넘쳐도 새로 연 탭이 탭 줄 안에 보인다", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 757 });
    await installHistoryFixture(
      page,
      Array.from({ length: 16 }, (_, index) => ({
        path: `/blog/fixture-${index}`,
        title: `fixture-tab-${index}`,
        isActive: index === 0,
        lastAccessedAt: Date.now(),
      })),
    );
    const locale = getTestLocale();

    await visit(page, `/${locale}/game`);
    await waitForHistoryHydration(page);
    const rail = page.getByTestId("history-tab-rail");
    const activeTab = rail.locator("div[id='/game']");
    await expect(activeTab.getByRole("button", { name: "game", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect
      .poll(() => rail.evaluate(element => element.scrollWidth > element.clientWidth))
      .toBe(true);
    await expect
      .poll(async () => {
        const [railBox, tabBox] = await Promise.all([rail.boundingBox(), activeTab.boundingBox()]);
        return (
          tabBox!.x >= railBox!.x - 1 &&
          tabBox!.x + tabBox!.width <= railBox!.x + railBox!.width + 1
        );
      })
      .toBe(true);
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
