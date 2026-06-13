import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  expectPath,
  getHistorySnapshot,
  resolveLocaleAndMessages,
  visit,
  waitForHistoryHydration,
} from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("404 자동 복구", () => {
  test("잘못된 경로 진입 시 유효 탭으로 복구되고 히스토리에서 제거된다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);
    const invalidSegment = `missing-${Date.now()}`;

    await visit(page, `/${locale}/blog`);
    await visit(page, `/${locale}/game`);
    await waitForHistoryHydration(page);

    const invalidResponse = await page.goto(`/${locale}/${invalidSegment}`);
    expect(invalidResponse?.status()).toBe(404);

    await expectPath(page, new RegExp(`^/${localeRegex}(?:/game)?$`));

    await expect
      .poll(async () => {
        const history = await getHistorySnapshot(page);
        return history.some((item: { path: string }) => item.path.includes(invalidSegment));
      })
      .toBe(false);
  });
});
