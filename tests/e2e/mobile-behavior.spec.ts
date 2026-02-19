import { expect, test } from "@playwright/test";
import { gotoWithRetry, resolveLocaleAndMessages, visit } from "./test-helpers";

test.describe.configure({ mode: "serial" });

const MOBILE_VIEWPORTS: Record<string, { width: number; height: number; browserName: string }> = {
  "chromium-mobile-sm": { width: 360, height: 780, browserName: "chromium" },
  "chromium-mobile-md": { width: 390, height: 844, browserName: "chromium" },
  "chromium-mobile-lg": { width: 430, height: 932, browserName: "chromium" },
  "webkit-mobile-sm": { width: 360, height: 780, browserName: "webkit" },
  "webkit-mobile-md": { width: 390, height: 844, browserName: "webkit" },
  "webkit-mobile-lg": { width: 430, height: 932, browserName: "webkit" },
  "firefox-mobile-sm": { width: 360, height: 780, browserName: "firefox" },
  "firefox-mobile-md": { width: 390, height: 844, browserName: "firefox" },
  "firefox-mobile-lg": { width: 430, height: 932, browserName: "firefox" },
};

test.describe("모바일 전용 동작", () => {
  test("브라우저·사이즈별로 트리거 규칙이 맞다", async ({ page }, testInfo) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const project = MOBILE_VIEWPORTS[testInfo.project.name];
    if (!project) {
      throw new Error(`미지원 모바일 프로젝트입니다: ${testInfo.project.name}`);
    }
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error("viewport 정보를 읽어오지 못했습니다.");
    }

    expect(viewport).toMatchObject({ width: project.width, height: project.height });
    expect(page.context().browser()?.browserType().name()).toBe(project.browserName);

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

    await page.getByRole("button", { name: /Start Game/i }).click();
    await expect(mobileTrigger).toBeHidden();
  });
});
