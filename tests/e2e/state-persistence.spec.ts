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

test.describe("새로고침 상태 복원", () => {
  test("history/localStorage 상태가 reload 이후에도 유지된다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await clearHistoryStorage(page);

    await visit(page, `/${locale}/readme`);
    await waitForHistoryPath(page, "/readme");
    await visit(page, `/${locale}/blog`);
    await waitForHistoryPath(page, "/blog");
    await visit(page, `/${locale}/game`);
    await waitForHistoryPath(page, "/game");
    await waitForHistoryHydration(page);

    const beforeReload = await getHistorySnapshot(page);
    const beforePaths = beforeReload.map((item: { path: string }) => item.path);
    expect(beforePaths.some((value: string) => value.endsWith("/readme"))).toBeTruthy();
    expect(beforePaths.some((value: string) => value.endsWith("/blog"))).toBeTruthy();
    expect(beforePaths.some((value: string) => value.endsWith("/game"))).toBeTruthy();

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game$`));
    await waitForHistoryHydration(page);

    const afterReload = await getHistorySnapshot(page);
    const afterPaths = afterReload.map((item: { path: string }) => item.path);
    expect(afterPaths.some((value: string) => value.endsWith("/readme"))).toBeTruthy();
    expect(afterPaths.some((value: string) => value.endsWith("/blog"))).toBeTruthy();
    expect(afterPaths.some((value: string) => value.endsWith("/game"))).toBeTruthy();

    const activeItem = afterReload.find((item: { isActive: boolean }) => item.isActive);
    expect(activeItem?.path.endsWith("/game")).toBeTruthy();

    await expect(page.getByTestId("history-tab-game")).toBeVisible();
  });
});
