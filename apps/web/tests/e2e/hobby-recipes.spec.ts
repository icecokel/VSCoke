import { expect, test } from "@playwright/test";
import { escapeRegExp, expectPath, resolveLocaleAndMessages, visit } from "./test-helpers";

const usesUnavailableHobbyApi = process.env.NEXT_PUBLIC_API_URL === "http://127.0.0.1:65535";

test.describe("취미 레시피 페이지", () => {
  test("API 장애 시 레시피 페이지가 500 대신 빈 상태를 렌더링한다", async ({ page }) => {
    test.skip(!usesUnavailableHobbyApi, "API 미연결 E2E 환경에서만 fallback을 검증한다.");

    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/hobby/recipes`);
    await expectPath(page, new RegExp(`^/${localeRegex}/hobby/recipes$`));

    await expect(page.getByRole("heading", { name: "레시피" })).toBeVisible();
    await expect(
      page.getByText("레시피를 불러오지 못했거나 아직 등록된 레시피가 없습니다."),
    ).toBeVisible();
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
  });

  test("API 장애 시 취미 검색 인덱스가 빈 배열을 반환한다", async ({ request }) => {
    test.skip(!usesUnavailableHobbyApi, "API 미연결 E2E 환경에서만 fallback을 검증한다.");

    const response = await request.get("/api/hobby-search-index");

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [] });
  });

  test("레시피 목록을 검색하고 상세 내용을 확인한다", async ({ page }) => {
    test.skip(
      usesUnavailableHobbyApi,
      "API 의존 상세 시나리오는 fixture 분리 후 기본 E2E에 포함한다.",
    );

    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/hobby/recipes`);
    await expectPath(page, new RegExp(`^/${localeRegex}/hobby/recipes$`));

    await expect(page.getByRole("heading", { name: "레시피" })).toBeVisible();
    await expect(page.getByText("총 8개 레시피")).toBeVisible();
    await expect(page.getByRole("button", { name: /장각구이 상세 보기/ })).toBeVisible();

    const searchInput = page.getByRole("searchbox", { name: "레시피 검색" });
    await expect(searchInput).toBeVisible();
    await searchInput.fill("부타동");

    await expect(page.getByRole("button", { name: /부타동 상세 보기/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /장각구이 상세 보기/ })).toHaveCount(0);

    await page.getByRole("button", { name: /부타동 상세 보기/ }).click();
    await expect(page.getByRole("heading", { name: "부타동" })).toBeVisible();
    await expect(page.getByText("우동다시 1")).toBeVisible();
    await expect(page.getByText("양파를 얇게 슬라이스해서 충분히 볶는다.")).toBeVisible();

    await page.getByRole("button", { name: "목록으로" }).click();
    await expect(page.getByRole("button", { name: /부타동 상세 보기/ })).toBeVisible();
  });

  test("사이드바와 검색에서 레시피 페이지로 이동한다", async ({ page }) => {
    test.skip(
      usesUnavailableHobbyApi,
      "API 의존 검색 상세 시나리오는 fixture 분리 후 기본 E2E에 포함한다.",
    );

    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}`);

    await page
      .getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.sidebar.explorer)}$`) })
      .first()
      .click();

    const sidebarContent = page.locator("[data-slot='sidebar-content']").first();
    await expect(sidebarContent.getByText("hobby", { exact: true })).toBeVisible();
    await sidebarContent.getByText("hobby", { exact: true }).click();
    await sidebarContent.getByText("recipes.json", { exact: true }).click();
    await expectPath(page, new RegExp(`^/${localeRegex}/hobby/recipes$`));

    await visit(page, `/${locale}`);

    await page
      .getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.sidebar.search)}$`) })
      .first()
      .click();

    const searchInput = page.getByTestId("blog-dashboard-search-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("부타동");
    await page
      .getByRole("button", { name: /부타동/ })
      .first()
      .click();
    await expectPath(page, new RegExp(`^/${localeRegex}/hobby/recipes$`));
  });
});
