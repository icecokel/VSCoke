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
      page.getByText("3명이 하루 1~2개 작품을 처리하던 번역 업무", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("키워드를 10개 단위로 묶어 병렬 검색", { exact: false }),
    ).toBeVisible();

    await gotoWithRetry(page, `/${locale}/resume/shortime-playground`);
    await expect(
      page.getByText("결과 제출 중에는 게임 터치 입력을 막아", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("게임 배포 약 2주 뒤 한 주 동안 약 1,000명", { exact: false }),
    ).toBeVisible();
  });
});
