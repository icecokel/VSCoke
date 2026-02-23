import { expect, test } from "@playwright/test";
import { escapeRegExp, expectPath, resolveLocaleAndMessages, visit } from "./test-helpers";

test.describe("브라우저 네비게이션", () => {
  test("히스토리 이동은 뒤로/앞으로 버튼으로 일관되게 동작한다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/readme`);
    await visit(page, `/${locale}/blog`);
    await visit(page, `/${locale}/game`);

    await page.goBack();
    await expectPath(page, new RegExp(`^/${localeRegex}/blog$`));

    await page.goBack();
    await expectPath(page, new RegExp(`^/${localeRegex}/readme$`));

    await page.goForward();
    await expectPath(page, new RegExp(`^/${localeRegex}/blog$`));

    await page.goForward();
    await expectPath(page, new RegExp(`^/${localeRegex}/game$`));
  });
});
