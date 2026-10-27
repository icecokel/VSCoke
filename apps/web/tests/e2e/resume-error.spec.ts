import { expect, test } from "@playwright/test";
import messages from "../../messages/ko-KR.json";

test("이력서 API 장애를 표시하고 복구 후 재시도한다", async ({ page, request }) => {
  test.skip(process.env.PLAYWRIGHT_RESUME_FIXTURE !== "1", "테스트 fixture 서버가 필요합니다.");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const setAvailable = async (available: boolean) => {
    const response = await request.post(
      `${apiUrl}/__test__/resume-availability?available=${available}`,
    );
    expect(response.status()).toBe(204);
  };

  try {
    await setAvailable(false);
    await page.goto("/ko-KR/readme");
    await expect(page.getByRole("heading", { name: messages.errorTracking.title })).toBeVisible();
    const search = await request.get("/api/resume-search-index?locale=ko-KR");
    expect(search.status()).toBeGreaterThanOrEqual(500);
    await setAvailable(true);
    await page.getByRole("button", { name: messages.errorTracking.retry }).click();
    await expect(page.getByRole("heading", { name: messages.resume.title })).toBeVisible();
  } finally {
    await setAvailable(true);
  }
});
