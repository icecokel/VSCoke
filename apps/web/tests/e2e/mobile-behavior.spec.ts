import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  gotoWithRetry,
  loadMessages,
  SUPPORTED_LOCALES,
  verifyResumeSearchAnchors,
  type Locale,
} from "./test-helpers";
import type { ResumeDocument } from "@/services/resume-service";
import { getAllPosts } from "../../src/lib/blog";
import ko from "../../messages/ko-KR.json";

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
  for (const locale of SUPPORTED_LOCALES) {
    test(`${locale} 탐색기의 접근 이름과 설명은 현재 언어를 따른다`, async ({ page }) => {
      await gotoWithRetry(page, `/${locale}`);
      const messages = loadMessages(locale);
      const trigger = page.getByTestId("sidebar-trigger-mobile");
      await trigger.tap();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toHaveAccessibleName(messages.sidebar.explorer);
      await expect(dialog).toHaveAccessibleDescription(messages.sidebar.mobileDescription);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  }

  test("홈 검색의 프로젝트 anchor는 새로고침·언어 전환과 단일 탭을 유지한다", async ({ page }) => {
    await verifyResumeSearchAnchors(page, "fe", true);
  });

  test("블로그 폴더 더 보기와 글 목록 복귀에서 범주와 검색을 유지한다", async ({ page }) => {
    await gotoWithRetry(page, "/ko-KR/blog/dashboard");
    await page.getByTestId("sidebar-trigger-mobile").tap();
    const folder = page.getByRole("button", { name: "dev", exact: true });
    await folder.tap();
    await folder.locator("../..").getByRole("button", { name: ko.sidebar.more, exact: true }).tap();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL("/ko-KR/blog/dashboard?category=dev");
    const titles = page.locator("article h5");
    await expect(titles).toHaveText(
      getAllPosts()
        .filter(post => post.category === "dev")
        .map(post => post.title),
    );
    const input = page.getByTestId("blog-dashboard-title-search-input");
    await input.fill("ClickHouse");
    await expect(titles).toHaveCount(1);
    await page
      .getByRole("link")
      .filter({ has: page.locator("article") })
      .tap();
    await expect(page).toHaveURL(/\/blog\/dev\/postgresql-clickhouse-comparison$/, {
      timeout: 15_000,
    });
    await page.getByRole("link", { name: ko.blog.backToList, exact: true }).tap();
    await expect(page).toHaveURL("/ko-KR/blog/dashboard?category=dev");
    await expect(input).toHaveValue("ClickHouse");
    await expect(titles).toHaveCount(1);
  });

  test("검색 색인 실패 안내의 재시도 버튼을 터치해 결과를 복구한다", async ({ page }) => {
    const locale = getMobileTestLocale();
    const messages = loadMessages(locale);
    const company = messages.resume.careers.oprimed.company;
    let requests = 0;
    await page.route("**/api/hobby-search-index**", route => route.fulfill({ json: { data: [] } }));
    await page.route("**/api/resume-search-index**", async route => {
      requests += 1;
      if (requests === 1) await route.abort();
      else await route.fulfill({ response: await route.fetch() });
    });
    await gotoWithRetry(page, `/${locale}`);
    await page.getByTestId("sidebar-trigger-mobile").tap();
    const sidebar = page.getByRole("dialog");
    await sidebar.getByRole("button", { name: messages.sidebar.search, exact: true }).tap();
    await sidebar.getByRole("combobox").fill(company);
    const status = sidebar.getByRole("status");
    await expect(status).toContainText(messages.sidebar.searchLoadError);
    await expect(sidebar.getByText(messages.sidebar.searchNoResult, { exact: true })).toHaveCount(
      0,
    );
    const retry = sidebar.getByRole("button", { name: messages.sidebar.searchRetry });
    await expect(retry).toBeInViewport({ ratio: 1 });
    await retry.tap();
    const options = sidebar.getByRole("option");
    await expect(options.first()).toContainText(company);
    await expect(status).toHaveText(
      messages.sidebar.searchResultCount.replace("{count}", String(await options.count())),
    );
    await expect(retry).toHaveCount(0);
    expect(requests).toBe(2);
  });

  test("탐색기를 키보드로 열고 Escape로 닫으면 트리거에 포커스가 돌아온다", async ({ page }) => {
    const locale = getMobileTestLocale();
    const messages = loadMessages(locale);
    await gotoWithRetry(page, `/${locale}`);
    const trigger = page.getByTestId("sidebar-trigger-mobile");
    await expect(trigger).toBeVisible();
    for (let index = 0; index < 60; index += 1) {
      if (await trigger.evaluate(element => element === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAccessibleName(messages.sidebar.explorer);
  });

  test("탐색기를 포인터로 열고 바깥을 눌러 닫아도 트리거에 포커스가 돌아온다", async ({ page }) => {
    await gotoWithRetry(page, `/${getMobileTestLocale()}`);
    const trigger = page.getByTestId("sidebar-trigger-mobile");
    await trigger.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    const viewport = page.viewportSize()!;
    await page.touchscreen.tap(viewport.width - 8, viewport.height / 2);
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("언어 메뉴는 탐색기와 검색에 고정되고 Escape는 메뉴부터 닫는다", async ({
    page,
  }, testInfo) => {
    const locale = getMobileTestLocale();
    const messages = loadMessages(locale);
    await gotoWithRetry(page, `/${locale}/readme?resume=fe#career_1`);
    const trigger = page.getByTestId("sidebar-trigger-mobile");
    await trigger.tap();
    const sidebar = page.getByRole("dialog");
    const language = sidebar.getByRole("button", { name: messages.menu.language, exact: true });
    await expect(language).toBeInViewport({ ratio: 1 });
    await page.screenshot({
      path: testInfo.outputPath("language-explorer.png"),
      animations: "disabled",
    });
    await sidebar.getByRole("button", { name: messages.sidebar.search, exact: true }).tap();
    await expect(page.getByTestId("blog-dashboard-search-input")).toBeVisible();
    await expect(language).toBeInViewport({ ratio: 1 });
    await language.tap();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText([
      messages.common.korean,
      messages.common.english,
      messages.common.japanese,
    ]);
    await page.screenshot({
      path: testInfo.outputPath("language-search.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(sidebar).toBeVisible();
    await expect(language).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(sidebar).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("모바일 언어 왕복에서 FE 문서의 경로·query·hash와 쿠키를 유지한다", async ({
    page,
    request,
  }) => {
    let currentLocale: Locale = "ko-KR";
    await gotoWithRetry(page, "/ko-KR/readme?resume=fe#career_1");
    for (const [targetLocale, label] of [
      ["en-US", "english"],
      ["ja-JP", "japanese"],
      ["ko-KR", "korean"],
    ] as const) {
      const messages = loadMessages(currentLocale);
      await page.getByTestId("sidebar-trigger-mobile").tap();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: messages.menu.language, exact: true })
        .tap();
      await page.getByRole("menuitem", { name: messages.common[label], exact: true }).tap();
      await expect(page).toHaveURL(
        new RegExp(`/${escapeRegExp(targetLocale)}/readme\\?resume=fe#career_1$`),
      );
      const { data }: { data: ResumeDocument } = await (
        await request.get(
          `${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${targetLocale}&resume=fe`,
        )
      ).json();
      await expect(page.getByRole("heading", { name: data.title, exact: true })).toBeVisible();
      await expect(page.locator("#career_1")).toBeInViewport();
      expect(
        (await page.context().cookies()).find(cookie => cookie.name === "NEXT_LOCALE")?.value,
      ).toBe(targetLocale);
      await expect(page.locator("#menubar")).toHaveCount(1);
      currentLocale = targetLocale;
    }
  });

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
    const messages = loadMessages(locale);
    await page.getByRole("link", { name: messages.Game.viewOtherGames, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/game$`));
    await mobileTrigger.tap();
    await expect(
      page.getByRole("dialog").getByRole("button", { name: messages.menu.language, exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Escape");

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
    const messages = loadMessages(locale);
    const career = messages.resume.careers.oprimed;
    const project = career.projects.medicalFrontendProductization;
    await expect(
      resumeDocument.getByRole("heading", { name: messages.resumePreview.experience, exact: true }),
    ).toBeVisible();
    await expect(
      resumeDocument.getByRole("heading", { name: career.company, exact: true }),
    ).toBeVisible();
    await expect(
      resumeDocument.getByRole("heading", { name: project.title, exact: true }),
    ).toBeVisible();
    const description = project.descriptions[0]?.detail;
    if (!description) throw new Error("Oprimed 대표 프로젝트의 상세 이력 문구가 없습니다.");
    await expect(resumeDocument.getByText(description, { exact: true })).toBeVisible();

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
