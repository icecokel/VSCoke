import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  clearHistoryStorage,
  getHistorySnapshot,
  resolveLocaleAndMessages,
  visit,
  waitForHistoryPath,
  waitForHistoryHydration,
} from "./test-helpers";

test.describe("히스토리 탭 상태머신", () => {
  test("탭 추가/활성화/스마트 닫기 동작이 일관되다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await clearHistoryStorage(page);

    await visit(page, `/${locale}/readme`);
    await waitForHistoryPath(page, "/readme");
    await visit(page, `/${locale}/blog`);
    await waitForHistoryPath(page, "/blog");
    await visit(page, `/${locale}/game`);
    await waitForHistoryPath(page, "/game");

    await waitForHistoryHydration(page);

    const initialHistory = await getHistorySnapshot(page);
    const initialPaths = initialHistory.map((item: { path: string }) => item.path);
    expect(initialPaths.some((value: string) => value.endsWith("/readme"))).toBeTruthy();
    expect(initialPaths.some((value: string) => value.endsWith("/blog"))).toBeTruthy();
    expect(initialPaths.some((value: string) => value.endsWith("/game"))).toBeTruthy();

    const blogTab = page.getByTestId("history-tab-blog");
    await expect(blogTab).toBeVisible();
    await blogTab.click();

    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/blog$`));
    await waitForHistoryHydration(page);

    await page.getByTestId("history-tab-close-blog").click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game$`));

    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.some((item: { path: string }) => item.path.endsWith("/blog"));
      })
      .toBe(false);

    const gameTab = page.getByTestId("history-tab-game");
    await expect(gameTab).toBeVisible();
    await page.getByTestId("history-tab-close-game").click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/readme$`));

    const readmeTab = page.getByTestId("history-tab-readme");
    await expect(readmeTab).toBeVisible();
    await page.getByTestId("history-tab-close-readme").click({ force: true });
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
