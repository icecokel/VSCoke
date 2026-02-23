import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  getHistorySnapshot,
  resolveLocaleAndMessages,
  visit,
  waitForHistoryHydration,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("새로고침 상태 복원", () => {
  test("history/localStorage 상태가 reload 이후에도 유지된다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/readme`);
    await visit(page, `/${locale}/blog`);
    await visit(page, `/${locale}/game`);
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

    await expect(page.locator('div[id$="/game"][class*="bg-gray-800"]')).toBeVisible();
  });
});
