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
    await expect(page.getByTestId("blog-post").getByRole("article")).toBeVisible();
    await expect(page.getByTestId("blog-post").getByRole("heading", { level: 1 })).toBeVisible();

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

  test("이력서만 인쇄할 수 있다", async ({ page }, testInfo) => {
    const { locale } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/resume/preview`);

    await page.getByTestId("resume-preview-save-pdf").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.evaluate(() => {
      window.print = () => {
        document.body.dataset.printRequested = "true";
      };
    });
    await page.getByTestId("resume-preview-download-resume-only").click();
    await expect(page.locator("body")).toHaveAttribute("data-print-requested", "true");
    await page.emulateMedia({ media: "print" });
    await expect(page.getByTestId("resume-preview-document")).toBeVisible();
    await expect(page.getByTestId("resume-preview-career-detail-document").first()).toBeHidden();
    await page.pdf({
      path: testInfo.outputPath("resume.pdf"),
      printBackground: true,
      preferCSSPageSize: true,
    });
  });

  test("이력서에서 제안 연락 수단을 제공한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/readme`);
    await page.getByRole("button", { name: messages.profile.proposal }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: messages.profile.sendEmail })).toHaveAttribute(
      "href",
      "mailto:red9runge@gmail.com",
    );
    await expect(dialog.getByRole("link", { name: messages.profile.call })).toHaveAttribute(
      "href",
      "tel:+821020809652",
    );
  });

  test("현재 이력서에 연결된 경력기술서를 포함해 인쇄할 수 있다", async ({ page }, testInfo) => {
    const { locale } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/resume/preview`);

    const careerDetails = page.getByTestId("resume-preview-career-detail-document");
    await expect(careerDetails).toHaveCount(5);
    expect(await careerDetails.locator("h1").allTextContents()).toEqual([
      "오프리메드 - 의료·임상 제품과 개발·검증 체계",
      "CodeCrayon - 제안에서 운영까지 이어진 WebView·웹게임",
      "CodeCrayon - AI 활용과 콘텐츠 운영 도구",
      "CodeCrayon - 고객 주문과 판매자·운영자 업무",
      "AOT - 보험 가입 흐름과 공통 연동 SDK",
    ]);

    await page.getByTestId("resume-preview-save-pdf").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.evaluate(() => {
      window.print = () => {
        document.body.dataset.printRequested = "true";
      };
    });
    await page.getByTestId("resume-preview-download-with-career-details").click();
    await expect(page.locator("body")).toHaveAttribute("data-print-requested", "true");
    await page.emulateMedia({ media: "print" });
    await expect(careerDetails.first()).toBeVisible();
    await page.pdf({
      path: testInfo.outputPath("resume-details.pdf"),
      printBackground: true,
      preferCSSPageSize: true,
    });
  });

  test("TSX 블로그 포스트를 기존 URL과 공통 셸로 렌더링한다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/blog/journal/hello-world`);

    await expect(page.getByRole("heading", { name: "블로그를 시작하며" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "블로그를 시작합니다" })).toBeVisible();
    await expect(page.getByText("좋은 개발자는 코드를 작성하는 것만큼")).toBeVisible();
    await expect(page.getByRole("button", { name: messages.blog.detail.copyCode })).toBeVisible();
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
    const { locale, messages } = await resolveLocaleAndMessages(page);

    await gotoWithRetry(page, `/${locale}/blog/dev/html-mistakes-1`);

    await expect(page.locator("article table")).toBeVisible();
    // 만료된 외부 스크린샷은 기존 정책대로 안내 카드로 대체한다.
    await expect(page.getByTestId("blog-legacy-image-notice")).toHaveCount(3);
    await expect(page.locator("article img")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: messages.blog.detail.copyCode }).first(),
    ).toBeVisible();
  });

  test("존재하지 않는 블로그 slug는 404 응답 후 홈으로 복구한다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const response = await page.goto(`/${locale}/blog/journal/not-a-real-post`);

    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/?$`));
  });

  test("Code Crayon 상세 경력기술서의 대표 근거를 렌더링한다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const documents = [
      { slug: "commerce-backoffice-product", sectionIndexes: [2, 4] },
      { slug: "translate", sectionIndexes: [2, 3, 4] },
      { slug: "shortime-playground", sectionIndexes: [2, 3] },
    ];

    for (const { slug, sectionIndexes } of documents) {
      const source = await readFile(`resume-detail/${slug}.mdx`, "utf8");
      const sections = source.split(/^## /m);
      await gotoWithRetry(page, `/${locale}/resume/${slug}`);

      for (const index of sectionIndexes) {
        const [heading, ...paragraphs] = sections[index].trim().split(/\n\n+/);
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
        for (const paragraph of paragraphs) {
          await expect(page.getByText(paragraph, { exact: true })).toBeVisible();
        }
      }
    }
  });
});
