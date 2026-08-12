import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  escapeRegExp,
  gotoWithRetry,
  readFirstBlogSlug,
  readFirstResumeSlug,
  resolveLocaleAndMessages,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("딥링크 직접 진입", () => {
  test("주요 상세/게임 라우트를 URL 직접 진입으로 렌더링한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);
    const blogSlug = readFirstBlogSlug();
    const resumeSlug = readFirstResumeSlug();

    await gotoWithRetry(page, `/${locale}/blog/${blogSlug}`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/blog/.+`));
    await expect(page.locator("article.prose")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();

    await gotoWithRetry(page, `/${locale}/resume/${resumeSlug}`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/resume/.+`));
    await expect(page.locator("article.prose")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();

    await gotoWithRetry(page, `/${locale}/resume/preview`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/resume/preview$`));
    await expect(page.getByTestId("resume-preview-document")).toBeVisible();
    await expect(page.getByTestId("resume-preview-save-pdf")).toBeVisible();

    await gotoWithRetry(page, `/${locale}/game/wordle`);
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`^${escapeRegExp(messages.Game.wordleTitle)}$`),
      }),
    ).toBeVisible();

    await gotoWithRetry(page, `/${locale}/game/sky-drop`);
    await expect(page.getByTestId("game-start-button")).toBeVisible();
    await expect(page.getByTestId("game-exit-button")).toBeVisible();
  });

  test("이력서 프리뷰에서 이력서만 PDF로 내려받는다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/resume/preview`);

    await page.getByTestId("resume-preview-save-pdf").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("resume-preview-download-resume-only").click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    expect(download.suggestedFilename()).toBe("sangmin-lee-resume.pdf");
    expect(downloadPath).not.toBeNull();

    const fileContents = await readFile(downloadPath!);
    expect(fileContents.subarray(0, 4).toString()).toBe("%PDF");
  });

  test("현재 이력서에 연결된 경력기술서를 포함해 PDF로 내려받는다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/resume/preview`);

    const careerDetails = page.getByTestId("resume-preview-career-detail-document");
    await expect(careerDetails).toHaveCount(4);
    expect(await careerDetails.locator("h1").allTextContents()).toEqual([
      "오프리메드 - 의료·임상 분석 제품",
      "CodeCrayon - 커머스·백오피스",
      "CodeCrayon - WebView·웹게임",
      "CodeCrayon - AI 활용과 운영 도구",
    ]);

    await page.getByTestId("resume-preview-save-pdf").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("resume-preview-download-with-career-details").click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    expect(download.suggestedFilename()).toBe("sangmin-lee-resume-with-career-details.pdf");
    expect(downloadPath).not.toBeNull();

    const fileContents = await readFile(downloadPath!);
    expect(fileContents.subarray(0, 4).toString()).toBe("%PDF");
  });

  test("TSX 블로그 포스트를 기존 URL과 공통 셸로 렌더링한다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/blog/journal/hello-world`);

    await expect(page.getByRole("heading", { name: "블로그를 시작하며" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "블로그를 시작합니다" })).toBeVisible();
    await expect(page.getByText("좋은 개발자는 코드를 작성하는 것만큼")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible();
  });

  test("블로그 상세에 canonical BlogPosting JSON-LD를 노출한다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const slug = "journal/hello-world";
    const canonicalUrl = `https://vscoke.icecoke.kr/${locale}/blog/${slug}`;

    await gotoWithRetry(page, `/${locale}/blog/${slug}`);

    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);

    const jsonLd = JSON.parse((await jsonLdScript.textContent()) ?? "{}") as Record<
      string,
      unknown
    >;

    expect(jsonLd).toMatchObject({
      "@type": "BlogPosting",
      "@id": `${canonicalUrl}#blog-post`,
      mainEntityOfPage: {
        "@id": canonicalUrl,
      },
      url: canonicalUrl,
      inLanguage: locale,
    });
  });

  test("표·이미지·코드가 있는 TSX 블로그 포스트를 보존한다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/blog/dev/html-mistakes-1`);

    await expect(page.locator("article table")).toBeVisible();
    await expect(page.locator("article img")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Copy code" }).first()).toBeVisible();
  });

  test("존재하지 않는 블로그 slug는 404로 응답한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const response = await page.goto(`/${locale}/blog/journal/not-a-real-post`);

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: messages.notFound.title })).toBeVisible();
  });

  test("Code Crayon 상세 경력기술서의 대표 근거를 렌더링한다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/resume/commerce-backoffice-product`);
    await expect(page.getByRole("heading", { name: "커머스·백오피스", exact: true })).toBeVisible();
    await expect(
      page.getByText("한국어·일본어·영어·중국어 화면을 지원했습니다.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("Flutter Web 백오피스를 Next.js로 마이그레이션", { exact: false }),
    ).toBeVisible();

    await gotoWithRetry(page, `/${locale}/resume/translate`);
    await expect(
      page.getByText("재직 중 약 3개월 동안 운영자 3~4명이 사용했습니다.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("셀렉터스 상품 블로그 초안 생성 프로토타입", { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("약 50분에서 10분 이내로 줄였고", { exact: false })).toBeVisible();

    await gotoWithRetry(page, `/${locale}/resume/shortime-playground`);
    await expect(
      page.getByText("WebView 영역을 제안하고 프로토타입으로 시연", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("결과 제출 중 중복 진행과 Safari 오디오 재생", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("DB 기준 주간 고유 이용자 약 2,000~3,000명", { exact: false }),
    ).toBeVisible();
  });
});
