import { expect, test } from "@playwright/test";
import { resolveLocaleAndMessages } from "./test-helpers";

test.describe.configure({ mode: "serial" });

test.describe("서버 라우트 API 실패 fallback", () => {
  test("게임 공유 상세 조회 실패 시 서버 예외 대신 404 복구로 처리된다", async ({ page }) => {
    test.setTimeout(120_000);

    const { locale } = await resolveLocaleAndMessages(page);
    const missingResultId = "00000000-0000-4000-8000-000000000000";

    const response = await page.goto(`/${locale}/share/${missingResultId}`);

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Game Result Not Found" })).toBeVisible();
  });
});
