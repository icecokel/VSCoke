import { expect, test } from "@playwright/test";
import messages from "../../messages/ko-KR.json";
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
          (item: { path: string }) =>
            item.path === `/resume/${data.personalProjects[0].fileRef}?resume=pe`,
        ),
      ).toBeTruthy();
    });
  }

  test("미리보기, 상세, 없는 상세와 사이트맵을 조회한다", async ({ page, request }) => {
    const document = await (await request.get(`${apiUrl}/resume?locale=ko-KR`)).json();
    const slugs = [
      ...new Set(
        document.data.careers.flatMap((career: { projects: { fileRef?: string }[] }) =>
          career.projects.flatMap(project => (project.fileRef ? [project.fileRef] : [])),
        ),
      ),
    ];
    const response = await request.get(`${apiUrl}/resume/details/${slugs[0]}`);
    expect(response.ok()).toBeTruthy();
    const { data } = await response.json();

    await gotoWithRetry(page, "/ko-KR/resume/preview");
    await expect(page.getByTestId("resume-preview-document")).toBeVisible();
    await expect(page.getByTestId("resume-preview-career-detail-document")).toHaveCount(
      slugs.length,
    );
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

test("선택 문서의 metadata·상세 복귀·미리보기·언어 전환이 같은 key를 유지한다", async ({
  page,
  request,
}) => {
  const { data } = await (await request.get(`${apiUrl}/resume?locale=ko-KR&resume=fe`)).json();
  await gotoWithRetry(page, "/ko-KR/readme?resume=fe");
  await expect(page.getByRole("heading", { name: data.title, exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: messages.resume.personalProjects.title }),
  ).toHaveCount(data.personalProjects.length > 0 ? 1 : 0);
  await expect(page).toHaveTitle(data.title);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/ko-KR\/readme\?resume=fe$/,
  );
  await expect(
    page.getByRole("link", { name: messages.resumePreview.openPreview }),
  ).toHaveAttribute("href", "/ko-KR/resume/preview?resume=fe");
  const fileRef = data.careers
    .flatMap((career: { projects: Array<{ fileRef?: string }> }) => career.projects)
    .find((project: { fileRef?: string }) => project.fileRef).fileRef;
  await gotoWithRetry(page, `/ko-KR/resume/${fileRef}?resume=fe`);
  await expect(page.getByRole("link", { name: messages.resume.backToResume })).toHaveAttribute(
    "href",
    "/ko-KR/readme?resume=fe",
  );
  await gotoWithRetry(page, "/ko-KR/resume/preview?resume=fe");
  await expect(
    page.getByTestId("resume-preview-document").getByText(data.title, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: messages.resumePreview.backToWebResume }),
  ).toHaveAttribute("href", "/ko-KR/readme?resume=fe");
  await page.locator("#menubar").getByText(messages.menu.language, { exact: true }).click();
  await page.getByRole("menuitem", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en-US\/resume\/preview\?resume=fe$/);
  const english = await (await request.get(`${apiUrl}/resume?locale=en-US&resume=fe`)).json();
  await expect(
    page.getByTestId("resume-preview-document").getByText(english.data.title, { exact: true }),
  ).toBeVisible();
});

test("미등록·비공개·현재 버전 없음과 없는 locale은 다른 문서로 대체하지 않는다", async ({
  page,
  request,
}) => {
  for (const query of [
    "resume=missing",
    "resume=private",
    "resume=no-current",
    "resume=",
    "resume=pe&resume=fe",
  ]) {
    const response = await page.goto(`/ko-KR/readme?${query}`);
    expect(response?.status()).toBe(404);
    expect((await request.get(`/api/resume-search-index?locale=ko-KR&${query}`)).status()).toBe(
      404,
    );
  }
  expect((await page.goto("/en-US/readme?resume=ko-only"))?.status()).toBe(404);
});

test("문서 버전 갱신이 다음 조회에 반영되고 다른 문서는 바뀌지 않는다", async ({
  page,
  request,
}) => {
  test.skip(process.env.PLAYWRIGHT_RESUME_FIXTURE !== "1", "테스트 fixture 서버가 필요합니다.");
  const pe = await (await request.get(`${apiUrl}/resume?locale=ko-KR`)).json();
  const before = await (await request.get(`${apiUrl}/resume?locale=ko-KR&resume=fe`)).json();
  await gotoWithRetry(page, "/ko-KR/readme?resume=fe");
  await expect(page.getByRole("heading", { name: before.data.title, exact: true })).toBeVisible();
  expect((await request.post(`${apiUrl}/__test__/resume-version?resume=fe`)).status()).toBe(204);
  await page.reload();
  const after = await (await request.get(`${apiUrl}/resume?locale=ko-KR&resume=fe`)).json();
  expect(after.data.versionId).not.toBe(before.data.versionId);
  await expect(page.getByRole("heading", { name: after.data.title, exact: true })).toBeVisible();
  const search = await (
    await request.get("/api/resume-search-index?locale=ko-KR&resume=fe")
  ).json();
  expect(search.data[0].keywords).toContain(after.data.title);
  expect((await (await request.get(`${apiUrl}/resume?locale=ko-KR`)).json()).data.contentHash).toBe(
    pe.data.contentHash,
  );
});

test("education만 있는 문서의 교육정보를 README와 미리보기에 표시하고 빈 링크를 숨긴다", async ({
  page,
  request,
}) => {
  test.skip(process.env.PLAYWRIGHT_RESUME_FIXTURE !== "1", "테스트 fixture 서버가 필요합니다.");
  const { data } = await (await request.get(`${apiUrl}/resume?locale=ko-KR&resume=fe`)).json();
  expect(data.education).toHaveLength(1);
  expect(data.certifications).toEqual([]);
  expect(data.links).toEqual([]);
  for (const route of ["/ko-KR/readme?resume=fe", "/ko-KR/resume/preview?resume=fe"]) {
    await gotoWithRetry(page, route);
    await expect(
      page.getByRole("heading", { name: messages.profile.education, exact: true }),
    ).toBeVisible();
    for (const value of Object.values(data.education[0]) as string[]) {
      await expect(page.getByText(value, { exact: true })).toBeVisible();
    }
    await expect(
      page.getByRole("heading", { name: messages.profile.links, exact: true }),
    ).toHaveCount(0);
  }
});

test("교육·자격·링크가 모두 빈 문서는 빈 섹션을 표시하지 않는다", async ({ page, request }) => {
  test.skip(process.env.PLAYWRIGHT_RESUME_FIXTURE !== "1", "테스트 fixture 서버가 필요합니다.");
  const { data } = await (await request.get(`${apiUrl}/resume?locale=ko-KR&resume=ko-only`)).json();
  expect(data.education).toEqual([]);
  expect(data.certifications).toEqual([]);
  expect(data.links).toEqual([]);
  for (const route of ["/ko-KR/readme?resume=ko-only", "/ko-KR/resume/preview?resume=ko-only"]) {
    await gotoWithRetry(page, route);
    await expect(
      page.getByRole("heading", { name: messages.profile.education, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: messages.profile.links, exact: true }),
    ).toHaveCount(0);
  }
});

test("기존 certifications의 과정명과 세부내용도 README와 미리보기에 유지한다", async ({
  page,
  request,
}) => {
  const { data } = await (await request.get(`${apiUrl}/resume?locale=ko-KR&resume=pe`)).json();
  test.skip(data.certifications.length === 0, "선택 문서에 certifications가 없습니다.");
  for (const route of ["/ko-KR/readme?resume=pe", "/ko-KR/resume/preview?resume=pe"]) {
    await gotoWithRetry(page, route);
    for (const certification of data.certifications) {
      await expect(
        page.getByRole("heading", { name: certification.name, exact: true }),
      ).toBeVisible();
      for (const detail of certification.details)
        await expect(page.getByText(detail, { exact: true })).toBeVisible();
    }
  }
});
