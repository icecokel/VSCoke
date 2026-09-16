import { expect, test } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import { gotoWithRetry } from "./test-helpers";

test.describe("비주얼 회귀", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
  });

  const pages = [
    { path: "/ko-KR", snapshot: "home-ko-kr.png", ready: "home" },
    { path: "/ko-KR/blog", snapshot: "blog-ko-kr.png", ready: "blog" },
    {
      path: "/ko-KR/blog/dashboard",
      snapshot: "blog-dashboard-ko-kr.png",
      ready: "dashboard",
    },
    { path: "/ko-KR/game", snapshot: "game-center-ko-kr.png", ready: "game" },
    { path: "/ko-KR/package", snapshot: "package-ko-kr.png", ready: "package" },
  ];

  for (const pageCase of pages) {
    test(`${pageCase.path} 화면 시각 회귀 체크`, async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          "vscoke-history",
          JSON.stringify([
            {
              isActive: false,
              lastAccessedAt: Date.now(),
              path: "/",
              title: "Home",
            },
          ]),
        );
      });

      const response = await gotoWithRetry(page, pageCase.path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("#menubar")).toBeVisible();

      await page.addStyleTag({
        content: `
          nextjs-portal,
          [data-nextjs-dev-overlay] {
            display: none !important;
          }
        `,
      });

      if (pageCase.ready === "home") {
        await expect(page.locator('[data-testid="home-hero"]')).toBeVisible();
      } else if (pageCase.ready === "blog") {
        await expect(page.getByRole("heading", { level: 3, name: "블로그" })).toBeVisible();
      } else if (pageCase.ready === "dashboard") {
        await expect(page.getByText("Stats")).toBeVisible();
      } else if (pageCase.ready === "game") {
        await expect(page.getByRole("heading", { name: "Game Center" })).toBeVisible();
      } else {
        await expect(page.locator("code").first()).toContainText('"name"');
      }

      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });

      await expect(page).toHaveScreenshot(pageCase.snapshot, {
        animations: "disabled",
        caret: "hide",
        fullPage: false,
        maxDiffPixels: 50,
      });
    });
  }
});

test.describe("블로그 상세 비주얼", () => {
  for (const layout of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`${layout.name} 읽기 레이아웃`, async ({ page }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await gotoWithRetry(page, "/ko-KR/blog/journal/hello-world");
      await expect(page.getByTestId("blog-outline")).toBeVisible();
      await page.addStyleTag({
        content: "nextjs-portal, [data-nextjs-dev-overlay] { display: none !important; }",
      });
      await page.evaluate(() => document.fonts.ready);
      await page.locator("#main-scroll-container").evaluate(element => {
        element.scrollTop = 0;
      });
      await expect(page).toHaveScreenshot(`blog-detail-${layout.name}.png`, {
        animations: "disabled",
        caret: "hide",
        fullPage: false,
        maxDiffPixels: 50,
      });
    });
  }
});

test.describe("Sky Drop DOM 비주얼", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  for (const layout of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
    { name: "landscape", width: 844, height: 390 },
  ]) {
    test(`${layout.name} 시작·플레이 레이아웃`, async ({ page }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await page.route("**/game/ranking*", route => route.fulfill({ json: [] }));
      await page.route("**/api/auth/session", route => route.fulfill({ json: null }));
      await page.clock.install({ time: new Date("2026-09-08T12:00:00Z") });
      await page.addInitScript(() => {
        Math.random = () => 0.5;
      });
      await gotoWithRetry(page, "/ko-KR/game/sky-drop");
      await expect(page.getByTestId("game-start-button")).toBeEnabled();
      await page.addStyleTag({
        content: "nextjs-portal, [data-nextjs-dev-overlay] { display: none !important; }",
      });
      await page.evaluate(() => document.fonts.ready);
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
      const game = page.getByTestId("sky-drop-game");
      await expect(game).toHaveScreenshot(`sky-drop-${layout.name}-ready.png`, {
        animations: "disabled",
      });
      await page.getByTestId("game-start-button").click();
      await page.clock.runFor(1500);
      await expect(page.getByTestId("sky-drop-time")).toHaveText("00:01");
      await expect(page.getByTestId("sky-drop-block")).toHaveCount(9);
      await page.mouse.move(0, 0);
      await expect(game).toHaveScreenshot(`sky-drop-${layout.name}-playing.png`, {
        animations: "disabled",
      });
    });
  }
});

test.describe("PostgreSQL ClickHouse 비교 화면 비주얼", () => {
  for (const layout of [
    { name: "desktop", width: 1440, height: 1100 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`벤치마크 ${layout.name} 측정값 시각화`, async ({ page }) => {
      await page.setViewportSize({ width: layout.width, height: layout.height });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoWithRetry(page, "/ko-KR/blog/dev/postgresql-clickhouse-comparison");
      const explorer = page.getByTestId("benchmark-explorer");
      await expect(explorer).toHaveAttribute("data-ready", "true");
      await expect(page.getByTestId("benchmark-replay-status")).toHaveText(
        ko.blog.benchmark.reduced,
      );
      await expect(page.getByTestId("benchmark-value-postgres")).toHaveText("11.847");
      await page.evaluate(() => document.fonts.ready);
      await explorer.scrollIntoViewIfNeeded();
      // 요소 캡처에 겹치는 페이지 진행률은 이 컴포넌트 비교에서 제외한다.
      await page.addStyleTag({
        content: "[data-testid=blog-post] > [role=progressbar] { visibility: hidden !important; }",
      });
      await expect(explorer).toHaveScreenshot(`postgresql-clickhouse-${layout.name}.png`, {
        animations: "disabled",
        caret: "hide",
        maxDiffPixels: 50,
      });
    });
  }
});

test.describe("블로그 모바일 읽기 도구 비주얼", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`${theme} 한 줄 도구막대`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.addInitScript(theme => localStorage.setItem("theme", theme), theme);
      await gotoWithRetry(page, "/ko-KR/blog/dev/postgresql-clickhouse-comparison");
      await expect(page.getByTestId("blog-speech-primary")).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByTestId("blog-reading-tools")).toHaveScreenshot(
        `blog-reading-tools-${theme}.png`,
        {
          animations: "disabled",
          caret: "hide",
          maxDiffPixels: 50,
        },
      );
    });
  }
});
