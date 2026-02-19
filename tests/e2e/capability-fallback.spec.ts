import { expect, test } from "@playwright/test";
import { resolveLocaleAndMessages } from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("브라우저 capability fallback", () => {
  test("share/clipboard 미지원 환경에서 copy fallback 으로 동작한다", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: undefined,
      });

      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new Error("clipboard blocked")),
        },
      });

      document.execCommand = () => true;
    });

    const { locale, messages } = await resolveLocaleAndMessages(page);
    const response = await page.goto(`/${locale}/blog`);
    expect(response?.status()).toBeLessThan(400);

    await page.getByRole("button", { name: messages.Share.share }).first().click();
    await expect(page.getByText(messages.Share.copied)).toBeVisible({ timeout: 10000 });
  });
});
