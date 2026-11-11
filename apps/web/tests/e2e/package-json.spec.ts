import { expect, test } from "@playwright/test";
import webPackage from "../../package.json";
import { gotoWithRetry } from "./test-helpers";

for (const locale of ["ko-KR", "ja-JP"]) {
  test(`${locale} 웹 앱 package.json은 유효한 JSON이며 코드 안에서 가로 스크롤된다`, async ({
    page,
  }) => {
    await gotoWithRetry(page, `/${locale}/package`);
    const code = page.locator("pre > code");
    await expect(code).toBeVisible();
    const text = (await code.textContent()) ?? "";
    const data = JSON.parse(text);
    expect(data.name).toBe("@vscoke/web");
    expect(data).toEqual(webPackage);
    expect(text).toBe(JSON.stringify(webPackage, null, 2));

    if ((page.viewportSize()?.width ?? 0) <= 430) {
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const main = page.locator("#main-scroll-container");
      expect(await main.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      const pre = page.locator("pre");
      expect(await pre.evaluate(element => getComputedStyle(element).whiteSpace)).toBe("pre");
      expect(await pre.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
      await pre.evaluate(element => {
        element.scrollLeft = element.scrollWidth;
      });
      expect(await pre.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
  });
}
