import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  gotoWithRetry,
  mockWordleWord,
  resolveLocaleAndMessages,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("키보드 전용 시나리오", () => {
  test("Wordle에서 키보드만으로 입력/조작이 가능하다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const wordleWord = await mockWordleWord(page);

    await gotoWithRetry(page, `/${locale}/game/wordle`);

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`^${escapeRegExp(messages.Game.wordleTitle)}$`),
      }),
    ).toBeVisible();
    await expect(page.getByTestId("wordle-loading")).toBeHidden({ timeout: 20000 });
    await expect.poll(() => wordleWord.getRequestCount()).toBeGreaterThanOrEqual(1);

    const restartButton = page.getByTestId("wordle-header-restart");
    for (let index = 0; index < 30; index += 1) {
      if (await restartButton.evaluate(element => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(restartButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => wordleWord.getRequestCount()).toBeGreaterThanOrEqual(2);
    await expect(page.getByTestId("wordle-loading")).toBeHidden({ timeout: 20000 });

    const board = page.locator("main div[style*='aspect-ratio']").first();
    await page.keyboard.press("Control+A");
    await expect(board).not.toContainText("A");

    await page.keyboard.press("A");
    await page.keyboard.press("B");
    await page.keyboard.press("C");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("D");

    await expect(board).toContainText("ABD");
    await expect(board).not.toContainText("ABC");

    await page.keyboard.press("Enter");
    await expect(page.getByText(messages.Game.notEnoughLetters).first()).toBeVisible();
  });
});
