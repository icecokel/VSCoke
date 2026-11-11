import { expect, test } from "@playwright/test";
import { getAllPosts } from "../../src/lib/blog";
import ko from "../../messages/ko-KR.json";
import en from "../../messages/en-US.json";
import ja from "../../messages/ja-JP.json";
import { getHistorySnapshot, gotoWithRetry } from "./test-helpers";

const posts = getAllPosts();
const dashboardPath = "/ko-KR/blog/dashboard";

test.describe("블로그 범주 탐색 맥락", () => {
  test("hydration과 검색어 복원이 끝나야 입력할 수 있다", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("vscoke:blog-dashboard-query:ko-KR", "ClickHouse");
    });
    let releaseScripts!: () => void;
    const scriptsReady = new Promise<void>(resolve => {
      releaseScripts = resolve;
    });
    await page.route("**/_next/static/**/*.js", async route => {
      await scriptsReady;
      await route.continue();
    });
    const input = page.getByTestId("blog-dashboard-title-search-input");
    try {
      await page.goto(`${dashboardPath}?category=dev`, { waitUntil: "commit" });
      await expect(input).toBeVisible();
      await expect(input).toBeDisabled();
    } finally {
      releaseScripts();
    }
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue("ClickHouse");
    await input.fill("게임");
    await expect(input).toHaveValue("게임");
    await expect(page.locator("article h5")).toHaveCount(0);
  });

  for (const category of ["journal", "dev"]) {
    test(`${category} 폴더 더 보기는 해당 범주만 보여주고 새로고침에도 유지한다`, async ({
      page,
    }) => {
      await gotoWithRetry(page, dashboardPath);
      await page.getByRole("button", { name: ko.sidebar.explorer, exact: true }).click();
      const folder = page.getByRole("button", { name: category, exact: true });
      await folder.click();
      const tree = folder.locator("../..");
      await tree.getByRole("button", { name: ko.sidebar.more, exact: true }).click();
      await expect(page).toHaveURL(`${dashboardPath}?category=${category}`);
      const titles = page.locator("article h5");
      const expected = posts.filter(post => post.category === category).map(post => post.title);
      await expect(titles).toHaveText(expected);
      await page.reload();
      await expect(titles).toHaveText(expected);
    });
  }

  for (const [locale, messages] of [
    ["ko-KR", ko],
    ["en-US", en],
    ["ja-JP", ja],
  ] as const) {
    test(`${locale}에서 범주와 검색을 함께 적용하고 글의 목록 링크로 복원한다`, async ({
      page,
    }) => {
      const path = `/${locale}/blog/dashboard?category=dev`;
      await gotoWithRetry(page, path);
      await expect(
        page.getByText(
          messages.blog.dashboardCategory.replace("{category}", messages.blog.detail.development),
          { exact: true },
        ),
      ).toBeVisible();
      const titles = page.locator("article h5");
      const input = page.getByTestId("blog-dashboard-title-search-input");
      await expect(titles).toHaveText(
        posts.filter(post => post.category === "dev").map(post => post.title),
      );
      await input.fill("게임");
      await expect(input).toHaveValue("게임");
      await expect(titles).toHaveCount(0);
      await expect(page.getByText(messages.blog.noPosts, { exact: true })).toBeVisible();
      await input.fill("ClickHouse");
      const expected = posts
        .filter(post => post.category === "dev" && /clickhouse/i.test(post.title))
        .map(post => post.title);
      await expect(titles).toHaveText(expected);
      await expect(page.getByRole("option")).toHaveText(expected.slice(0, 5));
      await page
        .getByRole("link")
        .filter({ has: page.locator("article") })
        .first()
        .click();
      await expect(page).toHaveURL(/\/blog\/dev\/[^/?]+$/, { timeout: 15_000 });
      const articleUrl = page.url();
      await page.getByRole("link", { name: messages.blog.backToList, exact: true }).click();
      await expect(page).toHaveURL(path);
      await expect(input).toHaveValue("ClickHouse");
      await expect(titles).toHaveText(expected);
      await page.reload();
      await expect(input).toHaveValue("ClickHouse");
      await expect(titles).toHaveText(expected);
      await page.goBack();
      await expect(page).toHaveURL(articleUrl);
      await expect(page.getByTestId("blog-post")).toBeVisible();
      await page.goForward();
      await expect(page).toHaveURL(path);
      await expect(page.getByTestId("blog-post")).toHaveCount(0);
      await expect(titles).toHaveText(expected);
      await input.fill("게임");
      await expect(titles).toHaveCount(0);
      await page.getByRole("link", { name: messages.blog.dashboardViewAll, exact: true }).click();
      await expect(page).toHaveURL(`/${locale}/blog/dashboard`);
      await expect(input).toHaveValue("게임");
      await expect(titles).toHaveText(
        posts.filter(post => post.title.includes("게임")).map(post => post.title),
      );
      await page.goBack();
      await expect(page).toHaveURL(path);
      await expect(titles).toHaveCount(0);
    });
  }

  test("잘못된 범주는 전체 목록으로 처리한다", async ({ page }) => {
    await gotoWithRetry(page, `${dashboardPath}?category=invalid`);
    await expect(page.locator("article h5")).toHaveText(posts.map(post => post.title));
    await expect(
      page.getByRole("link", { name: ko.blog.dashboardViewAll, exact: true }),
    ).toHaveCount(0);
  });

  test("범주 해제와 폴더 전환은 하나의 대시보드 탭을 재사용하고 Back·Forward를 복원한다", async ({
    page,
  }) => {
    await gotoWithRetry(page, `${dashboardPath}?category=journal`);
    const titles = page.locator("article h5");
    await page.getByRole("link", { name: ko.blog.dashboardViewAll, exact: true }).click();
    await expect(page).toHaveURL(dashboardPath);
    await expect(titles).toHaveText(posts.map(post => post.title));
    await page.getByRole("button", { name: ko.sidebar.explorer, exact: true }).click();
    const folder = page.getByRole("button", { name: "dev", exact: true });
    await folder.click();
    await folder
      .locator("../..")
      .getByRole("button", { name: ko.sidebar.more, exact: true })
      .click();
    await expect(page).toHaveURL(`${dashboardPath}?category=dev`);
    const devTitles = posts.filter(post => post.category === "dev").map(post => post.title);
    await expect(titles).toHaveText(devTitles);
    await page.goBack();
    await expect(page).toHaveURL(dashboardPath);
    await expect(titles).toHaveText(posts.map(post => post.title));
    await page.goBack();
    await expect(page).toHaveURL(`${dashboardPath}?category=journal`);
    await expect(titles).toHaveText(
      posts.filter(post => post.category === "journal").map(post => post.title),
    );
    await page.goForward();
    await page.goForward();
    await expect(page).toHaveURL(`${dashboardPath}?category=dev`);
    await expect(titles).toHaveText(devTitles);
    await expect
      .poll(async () =>
        (await getHistorySnapshot(page))
          .filter((item: { path: string }) => item.path.startsWith("/blog/dashboard"))
          .map((item: { path: string }) => item.path),
      )
      .toEqual(["/blog/dashboard?category=dev"]);
    await page
      .getByRole("link")
      .filter({ has: page.locator("article") })
      .first()
      .click();
    await expect(page).toHaveURL(/\/blog\/dev\/[^/?]+$/, { timeout: 15_000 });
    await page
      .getByTestId("history-tab-rail")
      .locator('[id="/blog/dashboard?category=dev"]')
      .getByRole("button")
      .first()
      .click();
    await expect(page).toHaveURL(`${dashboardPath}?category=dev`);
    await expect(titles).toHaveText(devTitles);
  });

  test("저장된 대시보드 범주 중복 탭은 최신 URL 하나로 복원한다", async ({ page }) => {
    await page.addInitScript(() => {
      const now = Date.now();
      localStorage.setItem(
        "vscoke-history",
        JSON.stringify([
          {
            path: "/blog/dashboard?category=journal",
            title: "dashboard",
            isActive: false,
            lastAccessedAt: now - 1000,
          },
          {
            path: "/blog/dashboard?category=dev",
            title: "dashboard",
            isActive: false,
            lastAccessedAt: now,
          },
        ]),
      );
    });
    await gotoWithRetry(page, "/ko-KR/blog/journal/hello-world");
    await expect
      .poll(async () =>
        (await getHistorySnapshot(page))
          .filter((item: { path: string }) => item.path.startsWith("/blog/dashboard"))
          .map((item: { path: string }) => item.path),
      )
      .toEqual(["/blog/dashboard?category=dev"]);
    await page
      .getByTestId("history-tab-rail")
      .locator('[id="/blog/dashboard?category=dev"]')
      .getByRole("button")
      .first()
      .click();
    await expect(page).toHaveURL(`${dashboardPath}?category=dev`);
    await expect(page.locator("article h5")).toHaveText(
      posts.filter(post => post.category === "dev").map(post => post.title),
    );
  });
});
