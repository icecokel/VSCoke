import { expect, test } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import en from "../../messages/en-US.json";
import ja from "../../messages/ja-JP.json";
import article from "../../messages/posts/postgresql-clickhouse.ko.json";
import {
  benchmarkDatabaseNames,
  benchmarkMeasurements,
  benchmarkQueries,
} from "../../src/components/blog/postgresql-clickhouse-benchmark-data";
import { gotoWithRetry } from "./test-helpers";

const articlePath = "/ko-KR/blog/dev/postgresql-clickhouse-comparison";
const copy = ko.blog.benchmark;
const rowsLabel = (rows: number) =>
  copy.rows.replace("{count, number}", rows.toLocaleString("ko-KR"));

test.describe("공개 블로그 벤치마크", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("공개 본문·한국어 콘텐츠·검색 메타데이터를 제공한다", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await gotoWithRetry(page, articlePath);
    await expect(page.getByTestId("blog-draft-notice")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(article.title);
    await expect(page.locator("article")).toContainText(article.method.important);
    await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
    await expect(page.getByTestId("benchmark-explorer")).toContainText(copy.recorded);
    await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("11.847");
    await expect(page.getByTestId("benchmark-value-clickhouse")).toHaveText("5.416");
    expect(errors).toEqual([]);
  });

  test("스크립트 준비 전에는 조작을 막고 준비 후 첫 클릭부터 처리한다", async ({ page }) => {
    let releaseScripts: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      releaseScripts = resolve;
    });
    await page.route("**/_next/static/chunks/**", async route => {
      await gate;
      await route.continue();
    });
    const explorer = page.getByTestId("benchmark-explorer");
    const tab = explorer.getByRole("button", { name: copy.filter, exact: true });
    try {
      await page.goto(articlePath, { waitUntil: "commit" });
      await expect(explorer).toHaveAttribute("data-ready", "false");
      await expect(tab).toBeDisabled();
      await expect(explorer).toContainText(copy.loading);
    } finally {
      releaseScripts();
    }
    await expect(explorer).toHaveAttribute("data-ready", "true");
    await tab.click();
    await expect(tab).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("0.390");
  });

  test("그래프는 키보드로 구간을 선택하고 수치와 버튼 선택을 동기화한다", async ({ page }) => {
    await gotoWithRetry(page, articlePath);
    const chart = page.getByRole("slider", { name: copy.trendLabel, exact: true });
    await expect(chart).toHaveAttribute("aria-disabled", "false");
    await chart.focus();
    await page.keyboard.press("End");
    await expect(page.getByTestId("benchmark-trend-selection")).toContainText("35.568");
    await page.keyboard.press("Home");
    await expect(chart).toHaveAttribute("aria-valuenow", "0");
    await page.keyboard.press("ArrowRight");
    await expect(chart).toHaveAttribute("aria-valuenow", "1");
    const ranges = page
      .getByTestId("benchmark-explorer")
      .getByRole("group", { name: copy.rangeLabel, exact: true });
    await expect(ranges.getByRole("button", { name: rowsLabel(10), exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  for (const width of [1440, 390]) {
    test(`${width}px에서 시작 계기부터 실험과 판단까지 순서대로 읽을 수 있다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await gotoWithRetry(page, articlePath);
      const body = page.locator("article");
      await expect(body.locator(":scope > :first-child")).toHaveText(article.intro.heading);
      await expect(body.locator("p").first()).toHaveText(article.intro.first);
      await expect(body).toContainText(article.intro.second);
      await expect(body).toContainText(article.intro.third);
      await expect(body).toContainText(article.storage.first);
      await expect(body).toContainText(article.discovery.first);
      await expect(body).toContainText(article.expectation.first);
      await expect(body).toContainText(article.expectation.second);
      await expect(body.locator(":scope > h2")).toHaveText([
        article.intro.heading,
        article.storage.heading,
        article.discovery.heading,
        article.expectation.heading,
        article.method.heading,
        article.results.heading,
        article.explorer.heading,
        article.records.heading,
        article.limits.heading,
        article.decision.heading,
        article.ai.heading,
        article.outro.heading,
        article.references.heading,
      ]);
      await body
        .getByRole("heading", { name: article.intro.heading, exact: true })
        .scrollIntoViewIfNeeded();
      await expect(body.locator("p").first()).toBeInViewport();
    });
  }

  for (const query of benchmarkQueries) {
    test(`${query}: 측정한 9개 범위의 중앙값과 판정을 정확히 전환한다`, async ({ page }) => {
      await gotoWithRetry(page, articlePath);
      const explorer = page.getByTestId("benchmark-explorer");
      await explorer.getByRole("button", { name: copy[query], exact: true }).click();
      for (const row of benchmarkMeasurements[query]) {
        await explorer.getByRole("button", { name: rowsLabel(row.rows), exact: true }).click();
        await expect(page.getByTestId("benchmark-range-value")).toHaveText(rowsLabel(row.rows));
        await expect(page.getByTestId("benchmark-value-postgres")).toHaveText(
          row.postgres.toFixed(3),
        );
        await expect(page.getByTestId("benchmark-value-clickhouse")).toHaveText(
          row.clickhouse.toFixed(3),
        );
        const verdict = page.getByTestId("benchmark-verdict");
        if (row.verdict === "pending") {
          await expect(verdict).toContainText(copy.pending);
          await expect(verdict).not.toContainText("ClickHouse");
          await expect(verdict).toContainText("0.172");
        } else {
          await expect(verdict).toContainText(benchmarkDatabaseNames[row.verdict]);
        }
      }
    });
  }

  test("슬라이더는 키보드로 판단 보류 구간과 양 끝값까지 이동한다", async ({ page }) => {
    await gotoWithRetry(page, articlePath);
    const slider = page.getByRole("slider", { name: copy.rangeLabel });
    await expect(slider).toBeEnabled();
    await slider.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("benchmark-verdict")).toContainText(copy.pending);
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("8");
    await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("35.568");
    await page.keyboard.press("Home");
    await expect(slider).toHaveValue("0");
    await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("0.384");
  });

  test("재생은 기록된 순서로 완료되고 데이터베이스 요청을 보내지 않는다", async ({ page }) => {
    const requests: string[] = [];
    await gotoWithRetry(page, articlePath);
    await page.getByRole("button", { name: copy.join, exact: true }).click();
    await page.getByRole("button", { name: rowsLabel(1000000), exact: true }).click();
    await page.clock.install();
    page.on("request", request => {
      if (["fetch", "xhr"].includes(request.resourceType())) requests.push(request.url());
    });
    await page.getByRole("button", { name: copy.replay, exact: true }).click();
    await expect(page.getByTestId("benchmark-replay-status")).toHaveText(copy.playing);
    await page.clock.runFor(1000);
    await expect(page.getByTestId("benchmark-replay-clickhouse")).toHaveAttribute(
      "data-complete",
      "true",
    );
    await expect(page.getByTestId("benchmark-replay-postgres")).toHaveAttribute(
      "data-complete",
      "false",
    );
    await page.clock.runFor(2000);
    await expect(page.getByTestId("benchmark-replay-status")).toHaveText(copy.complete);
    await expect(page.getByTestId("benchmark-replay-postgres")).toHaveAttribute(
      "data-complete",
      "true",
    );
    await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("55.113");
    expect(
      requests.filter(url => {
        const requestUrl = new URL(url);
        const isAnalytics =
          requestUrl.hostname.endsWith(".google-analytics.com") &&
          requestUrl.pathname === "/g/collect";
        // 페이지 공통 분석·세션 요청과 벤치마크의 데이터 요청을 구분한다.
        return !isAnalytics && !url.includes("/api/auth/session") && !url.includes("__nextjs");
      }),
    ).toEqual([]);
  });

  test("재생 중지와 조건 변경은 이전 애니메이션을 정리한다", async ({ page }) => {
    await gotoWithRetry(page, articlePath);
    await page.getByRole("button", { name: copy.join, exact: true }).click();
    await page.getByRole("button", { name: rowsLabel(1000000), exact: true }).click();
    await page.clock.install();
    await page.getByRole("button", { name: copy.replay, exact: true }).click();
    await page.getByRole("button", { name: copy.stop, exact: true }).click();
    await expect(page.getByTestId("benchmark-replay-status")).toHaveText(copy.ready);
    await page.getByRole("button", { name: copy.replay, exact: true }).click();
    await page.getByRole("button", { name: copy.filter, exact: true }).click();
    await page.clock.runFor(4000);
    await expect(page.getByTestId("benchmark-replay-status")).toHaveText(copy.ready);
    await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("0.764");
  });

  test("동작 줄이기 설정에서는 재생 대신 정적 결과를 유지한다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoWithRetry(page, articlePath);
    await expect(
      page.getByRole("button", { name: copy.staticResults, exact: true }),
    ).toBeDisabled();
    await expect(page.getByTestId("benchmark-replay-status")).toHaveText(copy.reduced);
    await expect(page.getByRole("button", { name: copy.stop, exact: true })).toHaveCount(0);
    await expect(page.getByTestId("benchmark-replay-postgres")).toHaveAttribute(
      "data-complete",
      "true",
    );
  });

  test("전체 기록 표에 원문 27개 조건과 판단 보류를 제공한다", async ({ page }) => {
    await gotoWithRetry(page, articlePath);
    await page.getByTestId("benchmark-records").locator("summary").click();
    for (const query of benchmarkQueries) {
      const table = page.getByTestId(`benchmark-table-${query}`);
      await expect(table.locator("tbody tr")).toHaveCount(9);
      for (const [index, row] of benchmarkMeasurements[query].entries()) {
        const cells = table.locator("tbody tr").nth(index).locator("td");
        await expect(cells.nth(0)).toHaveText(row.postgres.toFixed(3));
        await expect(cells.nth(1)).toHaveText(row.clickhouse.toFixed(3));
        await expect(cells.nth(2)).toHaveText(
          row.verdict === "pending" ? article.records.pending : benchmarkDatabaseNames[row.verdict],
        );
      }
    }
  });

  for (const width of [360, 390, 768]) {
    test(`${width}px 화면에서 조작 요소와 본문이 가로로 넘치지 않는다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await gotoWithRetry(page, articlePath);
      await page.getByRole("button", { name: copy.group, exact: true }).click();
      await page.getByRole("button", { name: rowsLabel(30000), exact: true }).click();
      await expect(page.getByTestId("benchmark-verdict")).toContainText(copy.pending);
      await expect(page.getByTestId("benchmark-explorer")).toBeVisible();
      const dimensions = await page.getByTestId("benchmark-explorer").evaluate(element => ({
        scroll: element.scrollWidth,
        client: element.clientWidth,
        right: element.getBoundingClientRect().right,
        viewport: window.innerWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
      expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewport);
      await page.getByTestId("benchmark-records").locator("summary").click();
      const articleDimensions = await page
        .locator("article")
        .evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }));
      expect(articleDimensions.scroll).toBeLessThanOrEqual(articleDimensions.client + 1);
    });
  }

  for (const [locale, labels] of [
    ["en-US", en.blog.benchmark],
    ["ja-JP", ja.blog.benchmark],
  ] as const) {
    test(`${locale} 조작 UI와 한국어 원문을 함께 표시한다`, async ({ page }) => {
      await gotoWithRetry(page, articlePath.replace("ko-KR", locale));
      await expect(page.getByTestId("benchmark-explorer")).toContainText(labels.title);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(article.title);
      await page.getByRole("button", { name: labels.filter, exact: true }).click();
      await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("0.390");
    });
  }

  test("공개 목록과 공개 상세 경로에서 글을 노출한다", async ({ page }) => {
    await gotoWithRetry(page, "/ko-KR/blog");
    const articleLink = page.locator('a[href="/ko-KR/blog/dev/postgresql-clickhouse-comparison"]');
    await expect(articleLink).toBeVisible();
    await expect(
      articleLink.getByRole("heading", { name: article.title, exact: true }),
    ).toBeVisible();
    await gotoWithRetry(page, articlePath);
    await expect(page.getByTestId("benchmark-explorer")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: article.title })).toBeVisible();
  });
});
