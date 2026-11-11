import { expect, test } from "@playwright/test";
import { gotoWithRetry, loadMessages, SUPPORTED_LOCALES } from "./test-helpers";

for (const locale of SUPPORTED_LOCALES) {
  test(`${locale} README QR 대화상자의 접근 이름과 닫기 버튼은 현재 언어를 따른다`, async ({
    page,
  }) => {
    await gotoWithRetry(page, `/${locale}/readme`);
    const messages = loadMessages(locale);
    const trigger = page.getByRole("button", { name: messages.Share.qr, exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: messages.Share.qrTitle, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription(messages.Share.qrDescription);
    const close = dialog.getByRole("button", { name: messages.common.close, exact: true });
    await expect(close).toBeVisible();
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}
