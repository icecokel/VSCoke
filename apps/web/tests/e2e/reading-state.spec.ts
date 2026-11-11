import { expect, test, type Page } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import en from "../../messages/en-US.json";
import type { ResumeDocument } from "@/services/resume-service";
import { gotoWithRetry, waitForHistoryPaths } from "./test-helpers";

const article = "/blog/journal/user-flow-logging-429-investigation";
const comparison = "/blog/dev/postgresql-clickhouse-comparison";
const scrollContainer = (page: Page) => page.locator("#main-scroll-container");
const readProgress = (page: Page) =>
  scrollContainer(page).evaluate(
    element => element.scrollTop / (element.scrollHeight - element.clientHeight),
  );
const expectProgress = async (page: Page, expected: number) => {
  await expect.poll(async () => Math.abs((await readProgress(page)) - expected)).toBeLessThan(0.05);
  await expect
    .poll(async () =>
      Math.abs(
        Number(await page.getByRole("progressbar").getAttribute("aria-valuenow")) - expected * 100,
      ),
    )
    .toBeLessThanOrEqual(5);
};
const scrollToProgress = async (page: Page, progress: number) => {
  await expect(page.getByTestId("blog-outline")).toBeVisible();
  // 목차의 hydration과 초기 컨테이너 스크롤 처리가 끝난 뒤 사용자 스크롤을 시작한다.
  await page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await scrollContainer(page).evaluate((element, value) => {
    element.scrollTop = (element.scrollHeight - element.clientHeight) * value;
  }, progress);
  await expectProgress(page, progress);
};
const openBlog = async (page: Page, path: string) => {
  const mobileTrigger = page.getByTestId("sidebar-trigger-mobile");
  const isMobile = await mobileTrigger.isVisible();
  const searchButton = page.getByRole("button", { name: ko.sidebar.search, exact: true });
  if (isMobile) {
    await expect(mobileTrigger).toBeVisible();
    await mobileTrigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(searchButton).toHaveAttribute("data-active", "false");
    await searchButton.click();
  } else if (!(await page.getByTestId("blog-dashboard-search-input").isVisible())) {
    await searchButton.click();
  }
  await page
    .getByTestId("blog-dashboard-search-input")
    .fill(path === comparison ? "PostgreSQL" : "429");
  await page.locator("[data-slot='sidebar-content'] li > button").filter({ hasText: path }).click();
  await expect(page).toHaveURL(`/ko-KR${path}`);
  await expect(page.getByTestId("blog-post")).toBeVisible();
  if (isMobile) {
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(mobileTrigger).toBeVisible();
  }
};

test.describe("문서 읽기 상태 복원", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/usage/events", route =>
      route.fulfill({ status: 202, contentType: "application/json", body: "{}" }),
    );
  });

  for (const key of ["pe", "fe"]) {
    test(`${key} 경력 상세에서 원래 이력서의 회사 섹션으로 복귀한다`, async ({ page, request }) => {
      const { data: document }: { data: ResumeDocument } = await (
        await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=ko-KR&resume=${key}`)
      ).json();
      const index = document.careers.findLastIndex(career =>
        career.projects.some(project => project.fileRef),
      );
      const project = document.careers[index].projects.find(project => project.fileRef)!;
      await gotoWithRetry(page, `/ko-KR/readme?resume=${key}`);
      await waitForHistoryPaths(page, [key === "pe" ? "/readme" : `/readme?resume=${key}`]);
      await page
        .locator(`#career_${index}`)
        .getByRole("button", { name: ko.resume.viewDescription })
        .first()
        .click();
      await expect(page).toHaveURL(`/ko-KR/resume/${project.fileRef}?resume=${key}`);
      const back = page.getByRole("link", { name: ko.resume.backToResume });
      await expect(back).toHaveAttribute("href", `/ko-KR/readme?resume=${key}#career_${index}`);
      await back.click();
      await expect(page).toHaveURL(`/ko-KR/readme?resume=${key}#career_${index}`);
      await expect(page.locator(`#career_${index} > header`)).toBeInViewport();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    });
  }

  test("일반 스크롤을 Back·Forward·앱 탭·전체 언어 이동에서 복원한다", async ({ page }) => {
    await gotoWithRetry(page, `/ko-KR${article}`);
    await expect(page.getByTestId("blog-outline")).toBeVisible();
    await scrollToProgress(page, 0.3);
    await openBlog(page, comparison);
    await scrollToProgress(page, 0.6);
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${article}`);
    await expectProgress(page, 0.3);
    await page.goForward();
    await expect(page).toHaveURL(`/ko-KR${comparison}`);
    await expectProgress(page, 0.6);
    const rail = page.getByTestId("history-tab-rail");
    if (await rail.isVisible()) {
      await rail.locator(`[id="${article}"] > button`).first().click();
    } else {
      await page.goBack();
    }
    await expect(page).toHaveURL(`/ko-KR${article}`);
    await expectProgress(page, 0.3);

    const mobileTrigger = page.getByTestId("sidebar-trigger-mobile");
    if (await mobileTrigger.isVisible()) await mobileTrigger.click();
    await page.getByRole("button", { name: ko.menu.language, exact: true }).click();
    await page.getByRole("menuitem", { name: ko.common.english, exact: true }).click();
    await expect(page).toHaveURL(`/en-US${article}`);
    await expect(page.getByRole("progressbar", { name: en.blog.detail.progress })).toBeVisible();
    await expectProgress(page, 0.3);
  });

  test("목차 이동 후 Back하면 해시 없는 이력의 읽기 위치로 돌아간다", async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) await page.setViewportSize({ width: 1440, height: 900 });
    await gotoWithRetry(page, `/ko-KR${article}`);
    await scrollToProgress(page, 0.7);
    const outline = page.getByTestId("blog-outline");
    const summary = outline.locator("summary");
    if (await summary.isVisible()) await summary.click();
    const link = outline.locator("ol a").filter({ visible: true }).nth(1);
    await link.scrollIntoViewIfNeeded();
    const progressBeforeOutline = await readProgress(page);
    if (!isMobile) await expectProgress(page, 0.7);
    const fragment = (await link.getAttribute("href"))!;
    const target = page.locator(`[id="${decodeURIComponent(fragment.slice(1))}"]`);
    await link.click();
    await expect(page).toHaveURL(`/ko-KR${article}${fragment}`);
    await expect(target).toBeInViewport();
    expect(await readProgress(page)).toBeLessThan(0.65);
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${article}`);
    await expectProgress(page, progressBeforeOutline);
    await page.goForward();
    await expect(page).toHaveURL(`/ko-KR${article}${fragment}`);
    await expect(target).toBeInViewport();
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${article}`);
    await expectProgress(page, progressBeforeOutline);
  });

  test("하단에서 맨 위로 이동한 뒤 Back하면 끝까지 읽은 위치로 복귀한다", async ({ page }) => {
    await gotoWithRetry(page, `/ko-KR${article}`);
    await scrollToProgress(page, 1);
    await page
      .getByTestId("blog-post")
      .locator("footer")
      .getByRole("link", { name: ko.blog.detail.backToTop, exact: true })
      .click();
    await expect(page).toHaveURL(`/ko-KR${article}#blog-post-top`);
    await expect(page.getByTestId("blog-post-header")).toBeInViewport();
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${article}`);
    await expectProgress(page, 1);
  });

  test("목차 이력에서 복귀한 뒤 더 읽으면 Forward·Back에서 최신 위치를 복원한다", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoWithRetry(page, `/ko-KR${article}`);
    await scrollToProgress(page, 0.3);
    const link = page.getByTestId("blog-outline-desktop").locator("ol a").nth(1);
    const fragment = (await link.getAttribute("href"))!;
    const target = page.locator(`[id="${decodeURIComponent(fragment.slice(1))}"]`);
    await link.click();
    await expect(page).toHaveURL(`/ko-KR${article}${fragment}`);
    await expect(target).toBeInViewport();
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${article}`);
    await expectProgress(page, 0.3);
    await scrollToProgress(page, 0.7);
    await page.goForward();
    await expect(page).toHaveURL(`/ko-KR${article}${fragment}`);
    await expect(target).toBeInViewport();
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${article}`);
    await expectProgress(page, 0.7);
  });

  test("명시한 hash가 저장 위치보다 우선하고 새 링크 진입은 맨 위에서 시작한다", async ({
    page,
  }) => {
    await gotoWithRetry(page, `/ko-KR${article}`);
    const outline = page.getByTestId("blog-outline");
    await expect(outline).toBeVisible();
    const fragment = (await outline.locator("ol a").nth(1).getAttribute("href"))!;
    await scrollToProgress(page, 0.7);
    await openBlog(page, comparison);
    await openBlog(page, article);
    await expectProgress(page, 0);
    await scrollToProgress(page, 0.7);
    await openBlog(page, comparison);
    await gotoWithRetry(page, `/ko-KR${article}${fragment}`);
    await expect(page.locator(`[id="${decodeURIComponent(fragment.slice(1))}"]`)).toBeInViewport();
    expect(await readProgress(page)).toBeLessThan(0.65);
  });

  test("해시가 있는 글에서 더 읽은 위치도 앱 탭 복귀 시 복원한다", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoWithRetry(page, `/ko-KR${article}`);
    const link = page.getByTestId("blog-outline-desktop").locator("ol a").nth(1);
    const fragment = (await link.getAttribute("href"))!;
    await link.click();
    await expect(page).toHaveURL(`/ko-KR${article}${fragment}`);
    await scrollToProgress(page, 0.7);
    await openBlog(page, comparison);
    await page
      .getByTestId("history-tab-rail")
      .locator(`[id="${article}"] > button`)
      .first()
      .click();
    await expect(page).toHaveURL(`/ko-KR${article}`);
    await expectProgress(page, 0.7);
  });

  test("문서와 variant별 위치를 분리하고 글이 아닌 페이지에서 Back해도 복원한다", async ({
    page,
  }) => {
    await gotoWithRetry(page, "/ko-KR/blog/dashboard");
    await waitForHistoryPaths(page, ["/blog/dashboard"]);
    await gotoWithRetry(page, `/ko-KR${article}?resume=pe`);
    await scrollToProgress(page, 0.3);
    await gotoWithRetry(page, `/ko-KR${article}?resume=fe`);
    await expectProgress(page, 0);
    await scrollToProgress(page, 0.6);
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${article}?resume=pe`);
    await expectProgress(page, 0.3);
    const rail = page.getByTestId("history-tab-rail");
    if (await rail.isVisible()) {
      await rail.locator('[id="/blog/dashboard"] > button').first().click();
    } else {
      await page.getByTestId("sidebar-trigger-mobile").click();
      const folder = page.getByRole("button", { name: "dev", exact: true });
      await folder.click();
      await folder
        .locator("../..")
        .getByRole("button", { name: ko.sidebar.more, exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeHidden();
    }
    await expect(page).toHaveURL(/\/blog\/dashboard/);
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${article}?resume=pe`);
    await expectProgress(page, 0.3);
  });

  test("비교 도구의 조건과 행 수를 재방문에서 유지한다", async ({ page }) => {
    await gotoWithRetry(page, `/ko-KR${comparison}`);
    const explorer = page.getByTestId("benchmark-explorer");
    await expect(explorer).toHaveAttribute("data-ready", "true");
    await explorer.getByRole("button", { name: ko.blog.benchmark.join, exact: true }).click();
    await explorer
      .getByRole("slider", { name: ko.blog.benchmark.rangeLabel, exact: true })
      .fill("8");
    await openBlog(page, article);
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${comparison}`);
    await expect(explorer).toHaveAttribute("data-ready", "true");
    await expect(
      explorer.getByRole("button", { name: ko.blog.benchmark.join, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      explorer.getByRole("slider", { name: ko.blog.benchmark.rangeLabel, exact: true }),
    ).toHaveValue("8");
    await expect(page.getByTestId("benchmark-range-value")).toContainText("1,000,000");
    await openBlog(page, article);
    await gotoWithRetry(page, `/ko-KR${comparison}?utm_source=reading&utm_campaign=return`);
    await expect(explorer).toHaveAttribute("data-ready", "true");
    await expect(
      explorer.getByRole("button", { name: ko.blog.benchmark.join, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      explorer.getByRole("slider", { name: ko.blog.benchmark.rangeLabel, exact: true }),
    ).toHaveValue("8");
  });

  for (const storage of ["blocked", "corrupt"] as const) {
    test(`비교 조건 저장소가 ${storage}여도 기본값과 읽기 도구를 사용한다`, async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", error => errors.push(error));
      await page.addInitScript(
        ({ storage, comparison }) => {
          if (storage === "blocked") {
            Object.defineProperty(window, "sessionStorage", {
              get: () => {
                throw new Error("차단된 저장소");
              },
            });
          } else {
            sessionStorage.setItem(
              `vscoke-blog-benchmark:${comparison}`,
              JSON.stringify({ query: "join", rangeIndex: 99 }),
            );
          }
        },
        { storage, comparison },
      );
      await gotoWithRetry(page, `/ko-KR${comparison}`);
      const explorer = page.getByTestId("benchmark-explorer");
      await expect(explorer).toHaveAttribute("data-ready", "true");
      await expect(
        explorer.getByRole("button", { name: ko.blog.benchmark.group, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        explorer.getByRole("slider", { name: ko.blog.benchmark.rangeLabel, exact: true }),
      ).toHaveValue("6");
      await explorer.getByRole("button", { name: ko.blog.benchmark.join, exact: true }).click();
      await expect(
        explorer.getByRole("button", { name: ko.blog.benchmark.join, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await scrollToProgress(page, 0.3);
      expect(errors).toEqual([]);
    });
  }

  test("낮은 화면에서 복원한 뒤에도 내부 컨테이너 끝까지 스크롤한다", async ({
    page,
    browserName,
    isMobile,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await gotoWithRetry(page, `/ko-KR${article}`);
    await scrollToProgress(page, 0.3);
    await openBlog(page, comparison);
    await page.goBack();
    await expect(page).toHaveURL(`/ko-KR${article}`);
    await expectProgress(page, 0.3);
    if (browserName === "webkit" && isMobile) {
      // 모바일 WebKit은 Playwright의 mouse.wheel을 지원하지 않는다.
      await scrollToProgress(page, 1);
    } else {
      await scrollContainer(page).hover();
      await page.mouse.wheel(0, 100_000);
    }
    await expectProgress(page, 1);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.getByTestId("history-tab-rail")).toBeInViewport();
  });
});
