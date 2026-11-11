import { expect, test, type Page, type Route } from "@playwright/test";
import type { SearchItem } from "@/types/search";
import { gotoWithRetry, loadMessages, SUPPORTED_LOCALES, type Locale } from "./test-helpers";

const openSearch = async (page: Page, locale: Locale = "ko-KR") => {
  await gotoWithRetry(page, `/${locale}`);
  await page
    .getByRole("button", { name: loadMessages(locale).sidebar.search, exact: true })
    .click();
  return page.getByRole("combobox");
};

for (const locale of SUPPORTED_LOCALES) {
  test(`${locale} 이력 색인이 지연되면 로딩을 공지하고 완료 후에만 결과 없음을 표시한다`, async ({
    page,
  }) => {
    const messages = loadMessages(locale);
    const company = messages.resume.careers.oprimed.company;
    let pending: Route | undefined;
    await page.route("**/api/hobby-search-index**", route => route.fulfill({ json: { data: [] } }));
    await page.route("**/api/resume-search-index**", route => {
      pending = route;
    });
    const input = await openSearch(page, locale);
    await input.fill(company);
    const panel = page.locator("[data-slot='sidebar-content']");
    const status = panel.getByRole("status");
    await expect(status).toHaveText(messages.sidebar.searchLoading.replace("{count}", "0"));
    await expect(panel.getByText(messages.sidebar.searchNoResult, { exact: true })).toHaveCount(0);
    await expect.poll(() => Boolean(pending)).toBe(true);
    await pending!.fulfill({ response: await pending!.fetch() });
    const options = panel.getByRole("option");
    await expect(options.first()).toContainText(company);
    await expect(status).toHaveText(
      messages.sidebar.searchResultCount.replace("{count}", String(await options.count())),
    );
    await input.fill("no-matching-search-result-7391");
    await expect(status).toHaveText(messages.sidebar.searchResultCount.replace("{count}", "0"));
    await expect(panel.getByText(messages.sidebar.searchNoResult, { exact: true })).toBeVisible();
  });
}

for (const failedSource of ["resume", "hobby"] as const) {
  test(`${failedSource} 색인 실패는 정상 결과를 유지하고 실패한 소스만 재시도한다`, async ({
    page,
  }) => {
    const messages = loadMessages("ko-KR");
    const company = messages.resume.careers.oprimed.company;
    const hobbyItem: SearchItem = {
      id: "hobby:fixture",
      type: "hobby",
      title: "Fixture coffee",
      keywords: [company],
      path: "/hobby/espresso",
    };
    const requests = { resume: 0, hobby: 0 };
    let retryRoute: Route | undefined;
    for (const source of ["resume", "hobby"] as const) {
      await page.route(`**/api/${source}-search-index**`, async route => {
        requests[source] += 1;
        if (source === failedSource) {
          if (requests[source] === 1) {
            if (source === "resume") await route.abort();
            else await route.fulfill({ status: 503, json: { data: [] } });
          } else retryRoute = route;
        } else if (source === "resume") await route.fulfill({ response: await route.fetch() });
        else await route.fulfill({ json: { data: [hobbyItem] } });
      });
    }
    const input = await openSearch(page);
    await input.fill(company);
    const panel = page.locator("[data-slot='sidebar-content']");
    const status = panel.getByRole("status");
    const options = panel.getByRole("option");
    await expect(options.first()).toBeVisible();
    await expect(status).toContainText(messages.sidebar.searchLoadError);
    const healthyTitles = await options.allTextContents();
    await input.fill("no-matching-search-result-7391");
    await expect(options).toHaveCount(0);
    await expect(status).toContainText(messages.sidebar.searchLoadError);
    await expect(panel.getByText(messages.sidebar.searchNoResult, { exact: true })).toHaveCount(0);
    await input.fill(company);
    await panel.getByRole("button", { name: messages.sidebar.searchRetry }).click();
    await expect(status).toHaveText(
      messages.sidebar.searchLoading.replace("{count}", String(healthyTitles.length)),
    );
    await expect(options).toHaveText(healthyTitles);
    await expect.poll(() => Boolean(retryRoute)).toBe(true);
    if (failedSource === "resume") {
      await retryRoute!.fulfill({ response: await retryRoute!.fetch() });
    } else await retryRoute!.fulfill({ json: { data: [hobbyItem] } });
    await expect.poll(() => options.count()).toBeGreaterThan(healthyTitles.length);
    await expect(status).toHaveText(
      messages.sidebar.searchResultCount.replace("{count}", String(await options.count())),
    );
    await expect(panel.getByRole("button", { name: messages.sidebar.searchRetry })).toHaveCount(0);
    expect(requests).toEqual({
      resume: failedSource === "resume" ? 2 : 1,
      hobby: failedSource === "hobby" ? 2 : 1,
    });
  });
}

test("늦게 도착한 이력 색인으로 목록이 줄어도 현재 선택과 Enter 대상이 일치한다", async ({
  page,
}) => {
  let pending: Route | undefined;
  await page.route("**/api/hobby-search-index**", route =>
    route.fulfill({
      json: {
        data: ["recipes", "espresso"].map(type => ({
          id: `hobby:${type}:fixture`,
          type: "hobby",
          title: `README.md ${type}`,
          path: `/hobby/${type}`,
        })),
      },
    }),
  );
  await page.route("**/api/resume-search-index**", route => {
    pending = route;
  });
  const input = await openSearch(page);
  await input.fill("README.md");
  await expect(page.getByRole("option")).toHaveCount(3);
  await input.press("ArrowDown");
  await input.press("ArrowDown");
  await expect(page.getByRole("option").nth(2)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => Boolean(pending)).toBe(true);
  await pending!.fulfill({ json: { data: [] } });
  await expect(page.getByRole("option")).toHaveCount(2);
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await input.press("ArrowUp");
  const selected = page.getByRole("option", { selected: true });
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    (await selected.getAttribute("id"))!,
  );
  const path = (await selected.locator("span").last().textContent())!;
  await input.press("Enter");
  await expect(page).toHaveURL(`/ko-KR${path}`, { timeout: 15_000 });
});

test("한 소스가 로딩 중이고 다른 소스가 실패하면 두 상태를 함께 공지한다", async ({ page }) => {
  const messages = loadMessages("ko-KR");
  let pending: Route | undefined;
  await page.route("**/api/hobby-search-index**", route => route.abort());
  await page.route("**/api/resume-search-index**", route => {
    pending = route;
  });
  const input = await openSearch(page);
  await input.fill("no-matching-search-result-7391");
  const panel = page.locator("[data-slot='sidebar-content']");
  const status = panel.getByRole("status");
  await expect(status).toContainText(messages.sidebar.searchLoading.replace("{count}", "0"));
  await expect(status).toContainText(messages.sidebar.searchLoadError);
  await expect(panel.getByText(messages.sidebar.searchNoResult, { exact: true })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: messages.sidebar.searchRetry })).toBeVisible();
  await expect.poll(() => Boolean(pending)).toBe(true);
  await pending!.fulfill({ json: { data: [] } });
  await expect(status).not.toContainText(messages.sidebar.searchLoading.replace("{count}", "0"));
  await expect(status).toContainText(messages.sidebar.searchLoadError);
  await expect(panel.getByText(messages.sidebar.searchNoResult, { exact: true })).toHaveCount(0);
});

test("이력서 변형 변경 뒤 이전 성공·실패 응답이 현재 색인을 덮어쓰지 않는다", async ({ page }) => {
  const messages = loadMessages("ko-KR");
  const pending: Route[] = [];
  await page.route("**/api/hobby-search-index**", route => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/resume-search-index**", route => {
    pending.push(route);
  });
  const input = await openSearch(page);
  await input.fill("Fixture");
  await expect.poll(() => pending.length).toBe(1);
  await page.evaluate(() => window.history.pushState(null, "", "?resume=fe"));
  await expect.poll(() => pending.length).toBe(2);
  await page.evaluate(() => window.history.pushState(null, "", "?resume=worxphere"));
  await expect.poll(() => pending.length).toBe(3);
  await pending[2].fulfill({ response: await pending[2].fetch() });
  const options = page.getByRole("option");
  await expect(options.first()).toContainText("Fixture worxphere");
  const currentResults = await options.allTextContents();
  await pending[0].fulfill({ response: await pending[0].fetch() });
  await pending[1].fulfill({ status: 503, json: { data: [] } });
  await expect(options).toHaveText(currentResults);
  const status = page.locator("[data-slot='sidebar-content']").getByRole("status");
  await expect(status).toHaveText(
    messages.sidebar.searchResultCount.replace("{count}", String(currentResults.length)),
  );
});

for (const previousStatus of ["ready", "error"] as const) {
  test(`A→B→A로 돌아오면 이전 ${previousStatus} 상태 대신 새 이력 색인의 로딩을 공지한다`, async ({
    page,
  }) => {
    const messages = loadMessages("ko-KR");
    const company = messages.resume.careers.oprimed.company;
    const pending: Route[] = [];
    const hobbyItem: SearchItem = {
      id: "hobby:fixture",
      type: "hobby",
      title: "Fixture coffee",
      keywords: [company],
      path: "/hobby/espresso",
    };
    await page.route("**/api/hobby-search-index**", route =>
      route.fulfill({ json: { data: [hobbyItem] } }),
    );
    await page.route("**/api/resume-search-index**", route => {
      pending.push(route);
    });
    const input = await openSearch(page);
    await input.fill(company);
    await expect.poll(() => pending.length).toBe(1);
    const panel = page.locator("[data-slot='sidebar-content']");
    const status = panel.getByRole("status");
    const options = panel.getByRole("option");
    if (previousStatus === "ready") {
      await pending[0].fulfill({ response: await pending[0].fetch() });
      await expect(options.first()).toContainText(company);
      await expect(status).toHaveText(
        messages.sidebar.searchResultCount.replace("{count}", String(await options.count())),
      );
    } else {
      await pending[0].abort();
      await expect(status).toContainText(messages.sidebar.searchLoadError);
    }

    await page.evaluate(() => window.history.pushState(null, "", "?resume=fe"));
    await expect.poll(() => pending.length).toBe(2);
    await page.goBack();
    await expect.poll(() => pending.length).toBe(3);
    expect(pending[2].request().url()).toBe(pending[0].request().url());
    await expect(status).toHaveText(messages.sidebar.searchLoading.replace("{count}", "1"));
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText(hobbyItem.title);
    await expect(panel.getByText(messages.sidebar.searchNoResult, { exact: true })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: messages.sidebar.searchRetry })).toHaveCount(0);

    await pending[1].fulfill({ status: 503, json: { data: [] } });
    await pending[2].fulfill({ response: await pending[2].fetch() });
    await expect(options.first()).toContainText(company);
    await expect(status).toHaveText(
      messages.sidebar.searchResultCount.replace("{count}", String(await options.count())),
    );
    await expect(options.filter({ hasText: hobbyItem.title })).toHaveCount(1);
  });
}
