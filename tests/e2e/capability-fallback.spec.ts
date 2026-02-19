import { expect, test } from "@playwright/test";
import { resolveLocaleAndMessages } from "./test-helpers";

test.describe("브라우저 capability fallback", () => {
  test("share/clipboard 미지원 환경에서 copy fallback 으로 동작한다", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __vscokeCopyFallbackCalled: boolean }).__vscokeCopyFallbackCalled =
        false;
      const setDescriptor = (target: Navigator, key: keyof Navigator, value: unknown) => {
        try {
          Object.defineProperty(target, key, { configurable: true, value });
        } catch {
          try {
            Object.defineProperty(Object.getPrototypeOf(target), key as string, {
              configurable: true,
              value,
            });
          } catch {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (target as any)[key] = value;
          }
        }
      };

      setDescriptor(navigator, "share" as keyof Navigator, undefined);
      setDescriptor(navigator, "clipboard" as keyof Navigator, {
        writeText: () => Promise.reject(new Error("clipboard blocked")),
      });

      document.execCommand = (command?: string) => {
        if (command === "copy") {
          (
            window as unknown as { __vscokeCopyFallbackCalled: boolean }
          ).__vscokeCopyFallbackCalled = true;
        }
        return true;
      };
    });

    const { locale, messages } = await resolveLocaleAndMessages(page);
    const response = await page.goto(`/${locale}/blog`);
    expect(response?.status()).toBeLessThan(400);

    await page.evaluate(() => {
      const navigatorAny = navigator as unknown as {
        share: unknown;
        clipboard: { writeText: () => Promise<void> };
      };
      navigatorAny.share = undefined;
      navigatorAny.clipboard = {
        writeText: () => Promise.reject(new Error("clipboard blocked")),
      };
      (window as unknown as { __vscokeCopyFallbackCalled: boolean }).__vscokeCopyFallbackCalled =
        false;
      document.execCommand = (command?: string) => {
        if (command === "copy") {
          (
            window as unknown as { __vscokeCopyFallbackCalled: boolean }
          ).__vscokeCopyFallbackCalled = true;
        }
        return true;
      };
    });

    const shareButton = page.getByTestId("share-link-button").first();
    await shareButton.waitFor();
    await shareButton.evaluate(el => (el as HTMLButtonElement).click());
    await expect
      .poll(
        async () => {
          const toastVisible = await page
            .getByText(messages.Share.copied, { exact: false })
            .isVisible()
            .catch(() => false);
          const copyFallbackUsed = await page.evaluate(
            () =>
              (window as unknown as { __vscokeCopyFallbackCalled: boolean })
                .__vscokeCopyFallbackCalled,
          );

          return toastVisible || copyFallbackUsed;
        },
        { timeout: 10_000 },
      )
      .toBe(true);
  });
});
