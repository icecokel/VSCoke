import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

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
      const warmup = await page.goto("/");
      expect(warmup?.status()).toBeLessThan(400);

      let response = await page.goto(pageCase.path);
      for (let attempt = 0; attempt < 6; attempt += 1) {
        if ((response?.status() ?? 500) < 400) {
          break;
        }
        await page.waitForTimeout(1200);
        response = await page.goto(pageCase.path);
      }

      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("#menubar")).toBeVisible();

      if (pageCase.ready === "home") {
        await expect(page.getByText("VSCOKE HUB")).toBeVisible();
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
      });
    });
  }
});
