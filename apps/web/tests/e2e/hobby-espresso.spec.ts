import { expect, test } from "@playwright/test";
import { escapeRegExp, expectPath, resolveLocaleAndMessages, visit } from "./test-helpers";

test.describe("취미 원두 기록 페이지", () => {
  test("원두 리스트에서 디테일 페이지로 이동해 추출 기록을 확인한다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);
    const beanId = "bean-fritz-jal-doeeo-gasina";

    await visit(page, `/${locale}/hobby/espresso`);
    await expectPath(page, new RegExp(`^/${localeRegex}/hobby/espresso$`));

    await expect(page.getByRole("heading", { name: "원두 기록" })).toBeVisible();
    await expect(page.getByText("총 2개 원두")).toBeVisible();
    await expect(page.getByTestId("espresso-navigation-tree")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /프릳츠 잘 되어 가시나/ })).toBeVisible();
    await expect(page.getByTestId("espresso-bean-card").first()).toContainText(
      "프릳츠 잘 되어 가시나",
    );
    await expect(page.getByTestId("espresso-bean-card").first()).toContainText("2026-06-11");

    await page.getByRole("link", { name: /프릳츠 잘 되어 가시나/ }).click();
    await expectPath(page, new RegExp(`^/${localeRegex}/hobby/espresso/${beanId}$`));
    await expect(page.getByRole("heading", { name: "프릳츠 잘 되어 가시나" })).toBeVisible();

    const tree = page.getByTestId("espresso-navigation-tree");
    await expect(tree.getByRole("button", { name: "추출 세팅" })).toBeVisible();
    await expect(tree.getByRole("button", { name: "현재 기준 세팅" })).toBeVisible();
    await expect(tree.getByRole("button", { name: "다음 테스트 세팅" })).toBeVisible();
    await expect(tree.getByRole("button", { name: "조정 가이드" })).toBeVisible();
    await expect(tree.getByRole("button", { name: "히스토리" })).toBeVisible();
    await expect(tree.getByRole("button", { name: "라운드 1" })).toBeVisible();
    await expect(tree.getByRole("button", { name: "라운드 4" })).toBeVisible();
    await expect(tree.getByRole("button", { name: /^라운드 \d+$/ })).toHaveText([
      "라운드 4",
      "라운드 3",
      "라운드 2",
      "라운드 1",
    ]);

    await expect(page.getByRole("heading", { name: "현재 기준 세팅" })).toBeVisible();
    await expect(page.getByText("CRM 3605 PWM 2버전")).toHaveCount(1);
    await expect(page.getByText("IMS 20g")).toHaveCount(1);
    await expect(page.getByText("도징쉐이커")).toHaveCount(1);
    await expect(page.getByText("찌르는 산미 약간 감소")).toBeVisible();

    await tree.getByRole("button", { name: "다음 테스트 세팅" }).click();
    await expect(page.getByRole("heading", { name: "다음 테스트 세팅" })).toBeVisible();
    await expect(page.getByText("목표 라운드 5")).toBeVisible();
    await expect(
      page.getByText("2.4 기준에서 아주 조금만 가늘게 조정", { exact: true }),
    ).toBeVisible();

    await tree.getByRole("button", { name: "조정 가이드" }).click();
    await expect(page.getByRole("heading", { name: "조정 가이드" })).toBeVisible();
    await expect(page.getByText("여전히 20초 이하")).toBeVisible();
    await expect(page.getByText("분쇄도 아주 조금만 가늘게")).toBeVisible();

    await tree.getByRole("button", { name: "히스토리" }).click();
    await expect(page.getByRole("heading", { name: "히스토리" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "라운드 4" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^라운드 \d+$/ })).toHaveText([
      "라운드 4",
      "라운드 3",
      "라운드 2",
      "라운드 1",
    ]);

    await tree.getByRole("button", { name: "라운드 2" }).click();
    await expect(page.getByRole("heading", { name: "라운드 2" }).first()).toBeVisible();
    await expect(page.getByText("그라인더가 힘들어함")).toBeVisible();
  });

  test("사이드바와 검색에서 원두 기록 페이지로 이동한다", async ({ page }) => {
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
    await sidebarContent.getByText("espresso.json", { exact: true }).click();
    await expectPath(page, new RegExp(`^/${localeRegex}/hobby/espresso$`));

    await visit(page, `/${locale}`);

    await page
      .getByRole("button", { name: new RegExp(`^${escapeRegExp(messages.sidebar.search)}$`) })
      .first()
      .click();

    const searchInput = page.getByTestId("blog-dashboard-search-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("프릳츠");
    await page
      .getByRole("button", { name: /프릳츠 잘 되어 가시나/ })
      .first()
      .click();
    await expectPath(
      page,
      new RegExp(`^/${localeRegex}/hobby/espresso/bean-fritz-jal-doeeo-gasina$`),
    );
  });
});
