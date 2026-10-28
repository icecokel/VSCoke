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

test("유효한 이력서의 연결 상세 누락은 복구 가능한 오류로 표시한다", async ({ page, request }) => {
  test.skip(process.env.PLAYWRIGHT_RESUME_FIXTURE !== "1", "테스트 fixture 서버가 필요합니다.");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const { data } = await (await request.get(`${apiUrl}/resume?locale=ko-KR&resume=fe`)).json();
  const slug = data.careers
    .flatMap((career: { projects: Array<{ fileRef?: string }> }) => career.projects)
    .find((project: { fileRef?: string }) => project.fileRef).fileRef;
  const setAvailable = async (available: boolean) => {
    expect(
      (
        await request.post(
          `${apiUrl}/__test__/resume-detail-availability?${new URLSearchParams({ slug, available: String(available) })}`,
        )
      ).status(),
    ).toBe(204);
  };
  try {
    await setAvailable(false);
    expect((await request.get(`${apiUrl}/resume/preview?locale=ko-KR&resume=fe`)).status()).toBe(
      503,
    );
    await page.goto("/ko-KR/resume/preview?resume=fe");
    await expect(page.getByRole("heading", { name: messages.errorTracking.title })).toBeVisible();
    await setAvailable(true);
    await page.getByRole("button", { name: messages.errorTracking.retry }).click();
    await expect(page.getByTestId("resume-preview-document")).toBeVisible();
    await expect(
      page.getByTestId("resume-preview-document").getByText(data.title, { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/resume\/preview\?resume=fe$/);
  } finally {
    await setAvailable(true);
  }
});
