import { expect, test } from "@playwright/test";
import messages from "../../messages/ko-KR.json";
import englishMessages from "../../messages/en-US.json";
import japaneseMessages from "../../messages/ja-JP.json";
import type { ResumeDocument } from "@/services/resume-service";
import { gotoWithRetry } from "./test-helpers";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

for (const [locale, localeMessages] of [
  ["ko-KR", messages],
  ["en-US", englishMessages],
  ["ja-JP", japaneseMessages],
] as const) {
  test(`${locale} 공통 경력 상세는 한국어 본문 언어와 선택 문서 복귀를 유지한다`, async ({
    page,
    request,
  }) => {
    for (const key of ["pe", "fe"]) {
      const { data: document } = await (
        await request.get(`${apiUrl}/resume?locale=${locale}&resume=${key}`)
      ).json();
      const project = document.careers
        .flatMap((career: { projects: { fileRef?: string }[] }) => career.projects)
        .find((item: { fileRef?: string }) => item.fileRef);
      const { data: detail } = await (
        await request.get(`${apiUrl}/resume/details/${project.fileRef}`)
      ).json();
      await gotoWithRetry(page, `/${locale}/resume/${detail.slug}?resume=${key}`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { name: detail.title, exact: true })).toHaveAttribute(
        "lang",
        "ko-KR",
      );
      await expect(page.locator("article.prose")).toHaveAttribute("lang", "ko-KR");
      const notice = page.getByTestId("resume-detail-language-notice");
      if (locale === "ko-KR") await expect(notice).toHaveCount(0);
      else await expect(notice).toHaveText(localeMessages.resumeDetail.languageNotice);
      const jsonLd = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').textContent())!,
      );
      expect(jsonLd.inLanguage).toBe("ko-KR");
      const back = page.getByRole("link", { name: localeMessages.resume.backToResume });
      await expect(back).toHaveAttribute("href", `/${locale}/readme?resume=${key}`);
      await back.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/readme\\?resume=${key}$`));
      await expect(page.getByRole("heading", { name: document.title, exact: true })).toBeVisible();
    }
  });
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true },
]) {
  test.describe(`경력 fragment 복원 ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
    });

    test("직접 진입과 새로고침에서 경력을 내부 스크롤 영역에 복원한다", async ({ page }) => {
      await gotoWithRetry(page, "/ko-KR/readme?resume=pe#career_1");
      const target = page.locator("#career_1");
      const container = page.locator("#main-scroll-container");
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt > 0) await page.reload();
        await expect(target).toBeAttached();
        await expect
          .poll(async () => {
            const [targetBox, containerBox] = await Promise.all([
              target.boundingBox(),
              container.boundingBox(),
            ]);
            return targetBox!.y - containerBox!.y;
          })
          .toBeGreaterThanOrEqual(-1);
        await expect
          .poll(async () => {
            const [targetBox, containerBox] = await Promise.all([
              target.boundingBox(),
              container.boundingBox(),
            ]);
            return targetBox!.y - containerBox!.y;
          })
          .toBeLessThanOrEqual(32);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        if (viewport.isMobile) {
          await expect(page.getByTestId("sidebar-trigger-mobile")).toBeVisible();
        } else {
          await expect(page.locator("#menubar")).toBeInViewport();
          await expect(page.getByTestId("history-tab-rail")).toBeInViewport();
        }
      }
    });

    test("잘못된 인코딩과 존재하지 않는 경력 hash는 무시한다", async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", error => errors.push(error));
      await gotoWithRetry(page, "/ko-KR/readme?resume=pe");
      for (const hash of ["%E0%A4%A", "career_999"]) {
        await page.goto(`/ko-KR/readme?resume=pe#${hash}`);
        await expect.poll(() => page.evaluate(() => location.hash)).toBe(`#${hash}`);
        await expect(page.locator("#career_0")).toBeAttached();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      }
      expect(errors).toEqual([]);
    });

    if (!viewport.isMobile) {
      test("경력 목차는 문서 query와 탭을 유지하며 뒤로·앞으로 이동한다", async ({ page }) => {
        await gotoWithRetry(page, "/ko-KR/readme?resume=fe");
        const rail = page.getByTestId("history-tab-rail");
        await expect(rail.locator("button[aria-current='page']")).toHaveCount(1);
        const tabCount = await rail.locator("div[id]").count();
        await page.locator('a[href="#career_1"]').click();
        await expect(page).toHaveURL(/\/readme\?resume=fe#career_1$/);
        await page.locator('a[href="#career_2"]').click();
        await expect(page).toHaveURL(/\/readme\?resume=fe#career_2$/);
        await page.goBack();
        await expect(page).toHaveURL(/\/readme\?resume=fe#career_1$/);
        await expect(page.locator("#career_1")).toBeInViewport();
        await page.goForward();
        await expect(page).toHaveURL(/\/readme\?resume=fe#career_2$/);
        await expect(page.locator("#career_2")).toBeInViewport();
        await expect(rail.locator("div[id]")).toHaveCount(tabCount);
        await expect(page.locator("#menubar")).toBeInViewport();
        await expect(rail).toBeInViewport();
      });
    }
  });
}

test.describe("이력서 조회", () => {
  test("마지막 내용이 고정 채팅 패널 위로 스크롤된다", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoWithRetry(page, "/ko-KR/readme");
    const scroll = page.locator("#main-scroll-container");
    await scroll.evaluate(element => {
      element.scrollTop = element.scrollHeight;
    });
    const content = page.getByTestId("resume-rag-chat-composer");
    const lastLink = page.locator('a[target="_blank"]').last();
    const [linkBox, panelBox] = await Promise.all([lastLink.boundingBox(), content.boundingBox()]);
    expect(linkBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(linkBox!.y + linkBox!.height).toBeLessThan(panelBox!.y);
  });
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
});

test("기본 언어에만 공개된 이력서는 404 대신 한국어 이력서로 안내한다", async ({ page }) => {
  for (const path of ["/readme", "/resume/preview"]) {
    const response = await page.goto(`/en-US${path}?resume=ko-only`);
    expect(response?.status()).toBe(200);
    const notice = page.getByTestId("resume-locale-unavailable");
    await expect(notice).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/en-US${path}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(notice.getByRole("link")).toHaveAttribute("href", `/ko-KR${path}?resume=ko-only`);
  }
  expect((await page.goto("/en-US/readme?resume=missing"))?.status()).toBe(404);
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

test("경력과 설명의 achievement를 README와 미리보기에 같은 원문으로 표시한다", async ({
  page,
  request,
}) => {
  test.skip(process.env.PLAYWRIGHT_RESUME_FIXTURE !== "1", "테스트 fixture 서버가 필요합니다.");
  const { data }: { data: ResumeDocument } = await (
    await request.get(`${apiUrl}/resume?locale=ko-KR&resume=fe`)
  ).json();
  const careerAchievements = data.careers.flatMap(career =>
    career.achievement ? [career.achievement] : [],
  );
  const descriptionAchievements = data.careers.flatMap(career =>
    career.projects.flatMap(project =>
      project.descriptions.flatMap(description =>
        description.achievement ? [description.achievement] : [],
      ),
    ),
  );
  expect(careerAchievements).toHaveLength(5);
  expect(descriptionAchievements).toHaveLength(1);
  for (const route of ["/ko-KR/readme?resume=fe", "/ko-KR/resume/preview?resume=fe"]) {
    await gotoWithRetry(page, route);
    for (const achievement of [...careerAchievements, ...descriptionAchievements])
      await expect(page.getByText(achievement, { exact: true })).toBeVisible();
    await expect(page.getByText(messages.achievement.label, { exact: true })).toHaveCount(6);
  }
});
