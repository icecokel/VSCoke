import { expect, test } from "@playwright/test";
import { recipes } from "../fixtures/hobby-api";
import {
  escapeRegExp,
  gotoWithRetry as visit,
  loadMessages,
  setHobbyApiAvailable,
  type Locale,
} from "./test-helpers";

test.use({ extraHTTPHeaders: { "Cache-Control": "no-cache" } });

const locale = (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR";
const messages = loadMessages(locale);
const recipe = recipes[0];
const query = recipe.ingredients[0].split(" ")[0];

test.afterEach(async ({ request }) => {
  if (process.env.PLAYWRIGHT_RESUME_FIXTURE === "1") await setHobbyApiAvailable(request, true);
});

for (const entry of ["직접 진입", "새로고침"]) {
  test(`API 장애 중 상세 ${entry}은 URL을 보존하고 복구 후 같은 상세를 표시한다`, async ({
    page,
    request,
  }) => {
    test.skip(
      process.env.PLAYWRIGHT_RESUME_FIXTURE !== "1",
      "장애 제어는 기본 fixture E2E에서 검증한다.",
    );
    const labels = messages.hobby.recipes;
    const params = new URLSearchParams({ q: query, recipe: recipe.id, other: "keep" });
    const detailUrl = `/${locale}/hobby/recipes?${params}`;
    const detail = page.getByRole("heading", { name: recipe.name, exact: true });
    if (entry === "새로고침") {
      await visit(page, detailUrl);
      await expect(detail).toBeVisible();
    }

    await setHobbyApiAvailable(request, false);
    if (entry === "새로고침") await page.reload();
    else await visit(page, detailUrl);
    await expect(page.getByText(labels.empty, { exact: true })).toBeVisible();
    // 빈 상태 직후 예약된 query 이동까지 끝나야 URL 보존 여부를 검증할 수 있다.
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(detailUrl);
    await expect(page.getByRole("searchbox", { name: labels.searchLabel })).toHaveValue(query);

    await setHobbyApiAvailable(request, true);
    await page.reload();
    await expect(page).toHaveURL(detailUrl);
    await expect(detail).toBeVisible();
    await expect(page.getByRole("searchbox", { name: labels.searchLabel })).toHaveValue(query);
    await expect(
      page.getByTestId("history-tab-rail").locator("div[id^='/hobby/recipes']"),
    ).toHaveCount(1);
  });
}

test("레시피 검색 맥락은 Back·Forward·새로고침·목록 복귀 후에도 유지된다", async ({ page }) => {
  const labels = messages.hobby.recipes;
  const path = `/${locale}/hobby/recipes`;
  const listUrl = `${path}?${new URLSearchParams({ q: query })}`;
  const detailUrl = `${listUrl}&recipe=${recipe.id}`;
  await visit(page, `/${locale}/blog`);
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await page.getByTestId("sidebar-trigger-mobile").click();
  } else {
    await page.getByRole("button", { name: messages.sidebar.explorer, exact: true }).click();
  }
  const sidebar = page.locator("[data-slot='sidebar-content']:visible").first();
  await sidebar.getByText("hobby", { exact: true }).click();
  await sidebar.getByText("recipes.json", { exact: true }).click();
  await expect(page).toHaveURL(path);
  const search = page.getByRole("searchbox", { name: labels.searchLabel });
  const items = page.getByRole("button", {
    name: new RegExp(escapeRegExp(labels.detailAria).replace("\\{name\\}", ".+")),
  });
  const detail = page.getByRole("heading", { name: recipe.name, exact: true });
  const openDetail = page.getByRole("button", {
    name: labels.detailAria.replace("{name}", recipe.name),
    exact: true,
  });
  const tab = page.getByTestId("history-tab-rail").locator("div[id^='/hobby/recipes']");

  await search.click();
  await search.fill(query);
  await expect(items).toHaveCount(2);
  await expect(page).toHaveURL(listUrl);
  await openDetail.click();
  await expect(page).toHaveURL(detailUrl);
  await expect(detail).toBeVisible();
  await expect(tab).toHaveCount(1);
  expect(
    await page.evaluate(() =>
      Boolean(history.state.__NA && history.state.__PRIVATE_NEXTJS_INTERNALS_TREE),
    ),
  ).toBe(true);

  await page.goBack();
  await expect(page).toHaveURL(listUrl);
  await expect(search).toHaveValue(query);
  await expect(items).toHaveCount(2);
  await page.goForward();
  await expect(detail).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(detailUrl);
  await expect(detail).toBeVisible();
  await expect(search).toHaveValue(query);
  await page.getByRole("button", { name: labels.backToList, exact: true }).click();
  await expect(page).toHaveURL(listUrl);
  await expect(items).toHaveCount(2);
  await page.goForward();
  await expect(detail).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(listUrl);
  await expect(items).toHaveCount(2);
  await page.goBack();
  await expect(page).toHaveURL(`/${locale}/blog`);
  await expect(tab).toHaveCount(1);
});

test("직접 연 상세는 검색어를 복원하고 목록 버튼으로 현재 history 항목을 교체한다", async ({
  page,
}) => {
  const labels = messages.hobby.recipes;
  const path = `/${locale}/hobby/recipes`;
  const params = new URLSearchParams({ q: query, recipe: recipe.id, other: "keep" });
  await visit(page, `/${locale}/blog`);
  await visit(page, `${path}?${params}`);
  await expect(page.getByRole("heading", { name: recipe.name, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: recipe.name, exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: labels.searchLabel })).toHaveValue(query);
  await page.getByRole("button", { name: labels.backToList, exact: true }).click();
  params.delete("recipe");
  await expect(page).toHaveURL(`${path}?${params}`);
  await expect(
    page.getByRole("button", {
      name: labels.detailAria.replace("{name}", recipe.name),
      exact: true,
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(`/${locale}/blog`);
});

test("잘못된 레시피 선택은 오류 없이 검색어와 다른 query를 유지한 목록으로 교체한다", async ({
  page,
}) => {
  const labels = messages.hobby.recipes;
  for (const id of ["missing-recipe", ""]) {
    const params = new URLSearchParams({ q: query, recipe: id, other: "keep" });
    await visit(page, `/${locale}/blog`);
    await visit(page, `/${locale}/hobby/recipes?${params}`);
    params.delete("recipe");
    await expect(page).toHaveURL(`/${locale}/hobby/recipes?${params}`);
    await expect(page.getByRole("searchbox", { name: labels.searchLabel })).toHaveValue(query);
    await expect(page.getByRole("button", { name: labels.backToList, exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: new RegExp(escapeRegExp(labels.detailAria).replace("\\{name\\}", ".+")),
      }),
    ).toHaveCount(2);
    await expect(
      page.getByTestId("history-tab-rail").locator("div[id^='/hobby/recipes']"),
    ).toHaveCount(1);
    await page.goBack();
    await expect(page).toHaveURL(`/${locale}/blog`);
  }
});

test("디바운스 전에 상세를 열어도 입력한 검색어를 목록 history에 반영한다", async ({ page }) => {
  const labels = messages.hobby.recipes;
  await visit(page, `/${locale}/hobby/recipes`);
  const search = page.getByRole("searchbox", { name: labels.searchLabel });
  await search.click();
  await search.fill(query);
  await page
    .getByRole("button", { name: labels.detailAria.replace("{name}", recipe.name), exact: true })
    .click();
  await expect(page).toHaveURL(
    `/${locale}/hobby/recipes?${new URLSearchParams({ q: query, recipe: recipe.id })}`,
  );
  await page.goBack();
  await expect(page.getByRole("searchbox", { name: labels.searchLabel })).toHaveValue(query);
  await expect(page).toHaveURL(`/${locale}/hobby/recipes?${new URLSearchParams({ q: query })}`);
});

test("늦게 완료된 검색 이동이 더 최근 입력을 덮어쓰지 않는다", async ({ page }) => {
  await visit(page, `/${locale}/hobby/recipes`);
  await expect(
    page.getByTestId("history-tab-rail").locator("button[aria-current='page']"),
  ).toHaveCount(1);
  let release = () => {};
  let hasStarted = false;
  const released = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route(`**/${locale}/hobby/recipes?**`, async route => {
    if (new URL(route.request().url()).searchParams.get("q") === query) {
      hasStarted = true;
      await released;
    }
    await route.continue();
  });
  const search = page.getByRole("searchbox", { name: messages.hobby.recipes.searchLabel });
  const latestQuery = recipe.ingredients[0];
  try {
    await search.click();
    await search.fill(query);
    await expect.poll(() => hasStarted).toBe(true);
    await search.fill(latestQuery);
    release();
    await expect(page).toHaveURL(
      `/${locale}/hobby/recipes?${new URLSearchParams({ q: latestQuery })}`,
    );
    await expect(search).toHaveValue(latestQuery);
    await search.fill("");
    await expect(page).toHaveURL(`/${locale}/hobby/recipes`);
  } finally {
    release();
  }
});
