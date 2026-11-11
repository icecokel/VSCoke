import { expect, test } from "@playwright/test";
import type { ResumeDocument } from "@/services/resume-service";
import { gotoWithRetry, loadMessages, verifyResumeSearchAnchors } from "./test-helpers";

for (const key of ["pe", "fe"] as const) {
  test(`${key} 홈 검색에서 프로젝트 도착·새로고침·언어 전환과 단일 탭을 유지한다`, async ({
    page,
  }) => {
    await verifyResumeSearchAnchors(page, key);
  });
}

test("빈 ID와 중복 ID가 있는 프로젝트도 각 검색 결과의 제목으로 도착한다", async ({
  page,
  request,
}) => {
  const key = "anchor-collisions";
  const { data: document }: { data: ResumeDocument } = await (
    await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?resume=${key}&locale=ko-KR`)
  ).json();
  const career = document.careers[0];
  const messages = loadMessages("ko-KR");
  await gotoWithRetry(page, `/ko-KR?resume=${key}`);
  const paths = new Set<string>();
  for (const [projectIndex, project] of career.projects.entries()) {
    await page.getByRole("button", { name: messages.sidebar.search, exact: true }).click();
    const panel = page.locator("[data-slot='sidebar-content']");
    await panel.getByRole("combobox").fill(career.company);
    const prefix = `/readme?resume=${key}#${encodeURIComponent(`resume-project:0-${projectIndex}`)}`;
    const option = panel
      .getByRole("option")
      .filter({ hasText: `${career.company} · ${project.title}` })
      .filter({ hasText: prefix });
    const path = (await option.getByText(/^\/readme\?/).textContent())!;
    paths.add(path);
    await option.click();
    await expect(page).toHaveURL(`/ko-KR${path}`);
    const id = decodeURIComponent(new URL(path, "http://localhost").hash.slice(1));
    const heading = page
      .locator(`[id="${id}"] > header`)
      .getByRole("heading", { name: project.title, exact: true });
    await expect(heading).toBeInViewport({ ratio: 1 });
    await page.reload();
    await expect(heading).toBeInViewport({ ratio: 1 });
  }
  expect(paths.size).toBe(career.projects.length);
  const ids = await page
    .locator('article[id^="resume-project:"]')
    .evaluateAll(elements => elements.map(element => element.id));
  expect(new Set(ids).size).toBe(career.projects.length);
});
