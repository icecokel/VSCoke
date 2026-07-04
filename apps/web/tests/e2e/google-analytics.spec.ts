import { expect, test } from "@playwright/test";

test.describe("Google Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://www.googletagmanager.com/**", async route => {
      await route.fulfill({
        status: 204,
        body: "",
      });
    });
  });

  test("NEXT_PUBLIC_GA_MEASUREMENT_ID 값이 있으면 GA4 gtag 스크립트를 렌더링한다", async ({
    page,
  }) => {
    await page.goto("/ko-KR");

    await expect(page.locator("script#google-analytics")).toHaveCount(1);

    const html = await page.content();

    expect(html).toContain("G-E2ETEST");
    expect(html).toContain("https://www.googletagmanager.com/gtag/js?id=G-E2ETEST");
    expect(html).toContain("gtag('config', 'G-E2ETEST')");
  });
});
