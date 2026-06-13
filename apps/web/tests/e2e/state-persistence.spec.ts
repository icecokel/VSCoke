import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  getHistorySnapshot,
  resolveLocaleAndMessages,
  visit,
  waitForHistoryHydration,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

const expectHistoryToContainPaths = async (page: Parameters<typeof getHistorySnapshot>[0]) => {
  await expect
    .poll(async () => {
      const snapshot = await getHistorySnapshot(page);
      const paths = snapshot.map((item: { path: string }) => item.path);

      return {
        hasReadme: paths.some((value: string) => value.endsWith("/readme")),
        hasBlog: paths.some((value: string) => value.endsWith("/blog")),
        hasGame: paths.some((value: string) => value.endsWith("/game")),
      };
    })
    .toEqual({
      hasReadme: true,
      hasBlog: true,
      hasGame: true,
    });
};

test.describe("새로고침 상태 복원", () => {
  test("history/localStorage 상태가 reload 이후에도 유지된다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/readme`);
    await visit(page, `/${locale}/blog`);
    await visit(page, `/${locale}/game`);
    await waitForHistoryHydration(page);
    await expectHistoryToContainPaths(page);

    const beforeReload = await getHistorySnapshot(page);
    const beforePaths = beforeReload.map((item: { path: string }) => item.path);
    expect(beforePaths.some((value: string) => value.endsWith("/readme"))).toBeTruthy();
    expect(beforePaths.some((value: string) => value.endsWith("/blog"))).toBeTruthy();
    expect(beforePaths.some((value: string) => value.endsWith("/game"))).toBeTruthy();

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game$`));
    await waitForHistoryHydration(page);
    await expectHistoryToContainPaths(page);

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
