import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  getHistorySnapshot,
  resolveLocaleAndMessages,
  visit,
  waitForHistoryHydration,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("히스토리 탭 상태머신", () => {
  test("공유 상세 탭은 URL 식별자 대신 공유 탭 이름으로 표시한다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const shareId = "00000000-0000-4000-8000-000000000000";
    const sharePath = `/share/${shareId}`;

    await page.evaluate(
      ({ path, title }) => {
        localStorage.setItem(
          "vscoke-history",
          JSON.stringify([
            {
              path,
              title,
              isActive: false,
              lastAccessedAt: Date.now(),
            },
          ]),
        );
      },
      { path: sharePath, title: shareId },
    );

    await visit(page, `/${locale}`);
    await waitForHistoryHydration(page);

    const shareTab = page.locator(`div[id='${sharePath}']`).first();
    await expect(shareTab).toBeVisible();
    await expect(shareTab).toContainText("share");
    await expect(shareTab).not.toContainText(shareId);
  });

  test("탭 추가/활성화/스마트 닫기 동작이 일관되다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/readme`);
    await visit(page, `/${locale}/blog`);
    await visit(page, `/${locale}/game`);

    await waitForHistoryHydration(page);

    const initialHistory = await getHistorySnapshot(page);
    const initialPaths = initialHistory.map((item: { path: string }) => item.path);
    expect(initialPaths.some((value: string) => value.endsWith("/readme"))).toBeTruthy();
    expect(initialPaths.some((value: string) => value.endsWith("/blog"))).toBeTruthy();
    expect(initialPaths.some((value: string) => value.endsWith("/game"))).toBeTruthy();

    const blogTab = page.locator("div[id='/blog']").first();
    await expect(blogTab).toBeVisible();
    await visit(page, `/${locale}/blog`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/blog$`));
    await waitForHistoryHydration(page);

    await blogTab.locator("svg").first().click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game$`));
    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.find((item: { isActive: boolean }) => item.isActive)?.path;
      })
      .toBe("/game");

    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.some((item: { path: string }) => item.path.endsWith("/blog"));
      })
      .toBe(false);

    const gameTab = page.locator("div[id='/game']").first();
    await expect(gameTab).toBeVisible();
    await gameTab.locator("svg").first().click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/readme$`));
    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.find((item: { isActive: boolean }) => item.isActive)?.path;
      })
      .toBe("/readme");

    const readmeTab = page.locator("div[id='/readme']").first();
    await expect(readmeTab).toBeVisible();
    await readmeTab.locator("svg").first().click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}(?:/)?$`));

    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        const paths = current.map((item: { path: string }) => item.path);
        return {
          hasReadme: paths.some((value: string) => value.endsWith("/readme")),
          hasBlog: paths.some((value: string) => value.endsWith("/blog")),
          hasGame: paths.some((value: string) => value.endsWith("/game")),
        };
      })
      .toEqual({ hasReadme: false, hasBlog: false, hasGame: false });

    await expect(page.getByText(messages.menu.file, { exact: true })).toBeVisible();
  });
});
