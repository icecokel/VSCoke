import { expect, test } from "@playwright/test";
import { escapeRegExp, gotoWithRetry, resolveLocaleAndMessages } from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("키보드 전용 시나리오", () => {
  test("Wordle에서 키보드만으로 입력/조작이 가능하다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await gotoWithRetry(page, `/${locale}/game/wordle`);

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`^${escapeRegExp(messages.Game.wordleTitle)}$`),
      }),
    ).toBeVisible();
    await expect(page.getByTestId("wordle-loading")).toBeHidden({ timeout: 20000 });

    await page.evaluate(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      document.body.focus();
    });

    await expect(page.getByTestId("wordle-header-restart")).toBeVisible();

    await page.keyboard.press("A");
    await page.keyboard.press("B");
    await page.keyboard.press("C");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("D");

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/wordle$`));
    await expect(page.getByText(messages.Game.notEnoughLetters).first()).toBeVisible();
  });
});
