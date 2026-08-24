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
      resumeDocument.getByText("긴 분석 과정에서 입력과 결과가 끊기지 않도록", {
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

    await savePdfButton.click();
    const downloadDialog = page.getByRole("dialog");
    await expect(downloadDialog).toBeVisible();
    await expect(page.getByTestId("resume-preview-download-resume-only")).toBeVisible();
    await expect(page.getByTestId("resume-preview-download-with-career-details")).toBeVisible();

    const dialogBox = await downloadDialog.boundingBox();
    const viewport = page.viewportSize();
    expect(dialogBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height);

    await page.keyboard.press("Escape");
    await expect(downloadDialog).toBeHidden();
  });

  test("README 채팅은 모바일에서 아이콘과 첫 진입 안내로 표시한다", async ({ page }) => {
    const locale = getMobileTestLocale();

    await gotoWithRetry(page, `/${locale}/readme`);

    const chatTrigger = page.getByTestId("resume-rag-chat-trigger");
    const chatComposer = page.getByTestId("resume-rag-chat-composer");
    const chatHint = page.getByTestId("resume-rag-mobile-hint");

    await expect(chatTrigger).toBeVisible();
    await expect(chatComposer).toBeHidden();
    await expect(chatHint).toBeVisible();

    await expect(chatHint).toBeHidden({ timeout: 5000 });
  });
});
