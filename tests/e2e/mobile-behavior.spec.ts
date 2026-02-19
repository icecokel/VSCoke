import { expect, test } from "@playwright/test";
import { gotoWithRetry, resolveLocaleAndMessages, visit } from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("모바일 전용 동작", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("모바일 사이드바 트리거 표시/숨김 규칙이 맞다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);

    await visit(page, `/${locale}`);
    const mobileTrigger = page.getByRole("button", { name: "Toggle Sidebar" });
    await expect(mobileTrigger).toBeVisible();

    await mobileTrigger.click();
    await expect(mobileTrigger).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(mobileTrigger).toBeVisible();

    await gotoWithRetry(page, `/${locale}/game/wordle`);
    await expect(mobileTrigger).toBeHidden();

    await gotoWithRetry(page, `/${locale}/game/sky-drop`);
    await expect(mobileTrigger).toBeVisible();

    await page.getByRole("button", { name: "Start Game" }).click();
    await expect(mobileTrigger).toBeHidden();
  });
});
