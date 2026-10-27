import { expect, test } from "@playwright/test";
import { gotoWithRetry } from "./test-helpers";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

test.describe("이력서 조회", () => {
  for (const locale of ["ko-KR", "en-US", "ja-JP"]) {
    test(`${locale} 이력서와 검색 색인을 조회한다`, async ({ page, request }) => {
      const response = await request.get(`${apiUrl}/resume?locale=${locale}`);
      expect(response.ok()).toBeTruthy();
      const { data } = await response.json();

      await gotoWithRetry(page, `/${locale}/readme`);
      await expect(page.getByRole("heading", { name: data.title, exact: true })).toBeVisible();

      const search = await request.get(`/api/resume-search-index?locale=${locale}`);
      expect(search.ok()).toBeTruthy();
      const index = await search.json();
      expect(
        index.data.find((item: { id: string }) => item.id === "profile:readme").description,
      ).toContain(data.name);
      expect(
        index.data.some(
          (item: { path: string }) => item.path === "/resume/worxphere-recruitment-board",
        ),
      ).toBeTruthy();
    });
  }

  test("미리보기, 상세, 없는 상세와 사이트맵을 조회한다", async ({ page, request }) => {
    const response = await request.get(
      `${apiUrl}/resume/details/oprimed-medical-frontend-productization`,
    );
    expect(response.ok()).toBeTruthy();
    const { data } = await response.json();

    await gotoWithRetry(page, "/ko-KR/resume/preview");
    await expect(page.getByTestId("resume-preview-document")).toBeVisible();
    await expect(page.getByTestId("resume-preview-career-detail-document")).toHaveCount(5);
    await gotoWithRetry(page, `/ko-KR/resume/${data.slug}`);
    await expect(page.getByRole("heading", { name: data.title })).toBeVisible();
    await expect(page.locator("article.prose")).toBeVisible();

    const missing = await page.goto("/ko-KR/resume/nonexistent-resume-detail");
    expect(missing?.status()).toBe(404);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain(`/ja-JP/resume/${data.slug}`);
  });
});
