import { expect, test } from "@playwright/test";
import { gotoWithRetry, resolveLocaleAndMessages } from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("키보드 전용 시나리오", () => {
  test("Wordle에서 키보드만으로 입력/조작이 가능하다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await gotoWithRetry(page, `/${locale}/game/wordle`);

    await expect(page.getByRole("heading", { name: "Wordle" })).toBeVisible();
    await expect(page.getByText("Loading word...")).toBeHidden({ timeout: 20000 });

    const restartButton = page.getByTitle("Restart Game");
    for (let index = 0; index < 30; index += 1) {
      if (await restartButton.evaluate(element => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(restartButton).toBeFocused();
    await page.keyboard.press("Enter");

    await page.keyboard.press("A");
    await page.keyboard.press("B");
    await page.keyboard.press("C");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("D");

    const board = page.locator("main div[style*='aspect-ratio']").first();
    await expect(board).toContainText("ABD");

    await page.keyboard.press("Enter");
    await expect(page.getByText(messages.Game.notEnoughLetters).first()).toBeVisible();
  });
});
