import { expect, test } from "@playwright/test";
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
    const canonicalUrl = `https://vscoke.vercel.app/${locale}/blog/${slug}`;

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
    await expect(
      page.getByRole("heading", { name: "상품 카드와 판매 방식의 공통 구조" }),
    ).toBeVisible();
    await expect(
      page.getByText("고객용 웹은 PC에서도 최대 420px 싱글 컬럼", { exact: false }),
    ).toBeVisible();

    await gotoWithRetry(page, `/${locale}/resume/translate`);
    await expect(
      page.getByText("재직 중 약 3개월 동안 3~4명의 운영자가 사용했습니다.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("키워드를 10개 단위로 묶어 병렬 검색", { exact: false }),
    ).toBeVisible();

    await gotoWithRetry(page, `/${locale}/resume/shortime-playground`);
    await expect(
      page.getByText("결과 제출 중에는 게임 터치 입력을 막아", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("프로토타입으로 시연한 게임 흐름이 실제 기능으로 채택", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("주간 고유 이용자 2,000~3,000명을 확인했습니다.", { exact: false }),
    ).toBeVisible();
  });
});
