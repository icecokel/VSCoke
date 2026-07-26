import { expect, test } from "@playwright/test";
import { gotoWithRetry, type Locale } from "./test-helpers";

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

const getMobileTestLocale = (): Locale =>
  (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR";

test.describe("모바일 전용 동작", () => {
  test("브라우저·사이즈별로 트리거 규칙이 맞다", async ({ page }, testInfo) => {
    const locale = getMobileTestLocale();
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

    await gotoWithRetry(page, `/${locale}`);
    await expect(page.locator("#menubar")).toBeHidden();
    await expect(page.getByTestId("history-tab-rail")).toBeHidden();

    const mobileTrigger = page.getByTestId("sidebar-trigger-mobile");
    await expect(mobileTrigger).toBeVisible();

    await mobileTrigger.click();
    await expect(mobileTrigger).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(mobileTrigger).toBeVisible();

    await gotoWithRetry(page, `/${locale}/game/wordle`);
    await expect(mobileTrigger).toBeHidden();

    await gotoWithRetry(page, `/${locale}/game/sky-drop`);
    await expect(mobileTrigger).toBeVisible();

    await page.getByTestId("game-start-button").click();
    await expect(mobileTrigger).toBeHidden();
  });

  test("이력서 프리뷰에 상세 경력을 보이고 PDF 저장 버튼을 우측 상단에 둔다", async ({ page }) => {
    const locale = getMobileTestLocale();

    await gotoWithRetry(page, `/${locale}/resume/preview`);

    const resumeDocument = page.getByTestId("resume-preview-document");
    const savePdfButton = page.getByTestId("resume-preview-save-pdf");
    await expect(resumeDocument).toBeVisible();
    await expect(savePdfButton).toBeVisible();
    await expect(
      page.getByText("작업 데이터를 서버에 저장하고 작업별 클라이언트 캐시를 분리해", {
        exact: false,
      }),
    ).toBeVisible();

    const [documentBox, buttonBox] = await Promise.all([
      resumeDocument.boundingBox(),
      savePdfButton.boundingBox(),
    ]);
    expect(documentBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();

    expect(buttonBox!.y).toBeLessThan(documentBox!.y);
    expect(
      Math.abs(buttonBox!.x + buttonBox!.width - (documentBox!.x + documentBox!.width)),
    ).toBeLessThanOrEqual(1);
  });
});
