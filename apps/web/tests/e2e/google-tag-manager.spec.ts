import { expect, test } from "@playwright/test";

test.describe("Google Tag Manager", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://www.googletagmanager.com/**", async route => {
      await route.fulfill({
        status: 204,
        body: "",
      });
    });
  });

  test("NEXT_PUBLIC_GTM_ID 값이 있으면 GTM 스크립트와 noscript fallback을 렌더링한다", async ({
    page,
  }) => {
    await page.goto("/ko-KR");

    await expect(page.locator("script#google-tag-manager")).toHaveCount(1);

    const html = await page.content();

    expect(html).toContain('id="google-tag-manager"');
    expect(html).toContain("GTM-E2ETEST");
    expect(html).toContain("https://www.googletagmanager.com/gtm.js?id=GTM-E2ETEST");
    expect(html).toContain("https://www.googletagmanager.com/ns.html?id=GTM-E2ETEST");
  });
});
