import { expect, test } from "@playwright/test";
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
