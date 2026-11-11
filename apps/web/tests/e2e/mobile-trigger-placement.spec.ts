import { expect, test, type Page } from "@playwright/test";
import { gotoWithRetry, loadMessages } from "./test-helpers";

const expectReservedTrigger = async (page: Page) => {
  const trigger = page.getByTestId("sidebar-trigger-mobile");
  await expect(trigger).toBeInViewport({ ratio: 1 });
  const triggerBox = (await trigger.boundingBox())!;
  const contentBox = (await page.locator("#main-scroll-container").boundingBox())!;
  expect(triggerBox.width).toBeGreaterThanOrEqual(44);
  expect(triggerBox.height).toBeGreaterThanOrEqual(44);
  expect(triggerBox.y + triggerBox.height).toBeLessThanOrEqual(contentBox.y);
  const overlaps = await trigger.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return Array.from(
      document.querySelectorAll('a, button, input, textarea, select, summary, [role="button"]'),
    )
      .filter(target => {
        if (element.contains(target) || target.contains(element)) return false;
        const box = target.getBoundingClientRect();
        return (
          box.width > 0 &&
          box.height > 0 &&
          box.left < bounds.right &&
          box.right > bounds.left &&
          box.top < bounds.bottom &&
          box.bottom > bounds.top
        );
      })
      .map(target => target.outerHTML);
  });
  expect(overlaps).toEqual([]);
};

test("데스크톱은 기존 탭 행을 유지하고 모바일 바를 숨긴다", async ({ page, isMobile }) => {
  test.skip(isMobile);
  await gotoWithRetry(page, "/ko-KR");
  await expect(page.getByTestId("history-tab-rail")).toBeVisible();
  await expect(page.getByTestId("sidebar-trigger-mobile")).toBeHidden();
  const rail = (await page.getByTestId("history-tab-rail").boundingBox())!;
  const content = (await page.locator("#main-scroll-container").boundingBox())!;
  expect(content.y).toBe(rail.y + rail.height);
});

test.describe("모바일 탐색기 예약 공간", () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(!isMobile);
  });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 568, height: 320 },
  ]) {
    for (const { locale, slug } of [
      { locale: "ko-KR", slug: "journal/user-flow-logging-429-investigation" },
      { locale: "ja-JP", slug: "journal/user-flow-logging-429-investigation" },
      { locale: "ja-JP", slug: "dev/javascript-last-day-of-month" },
    ] as const) {
      test(`${locale} ${viewport.width}×${viewport.height} ${slug} 글의 QR을 가리지 않는다`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await gotoWithRetry(page, `/${locale}/blog/${slug}`);
        const qr = page.getByRole("button", { name: loadMessages(locale).Share.qr, exact: true });
        if (viewport.width > viewport.height) await qr.scrollIntoViewIfNeeded();
        await expect(qr).toBeInViewport({ ratio: 1 });
        await expect
          .poll(() =>
            qr.evaluate(element => {
              const box = element.getBoundingClientRect();
              return element.contains(
                document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
              );
            }),
          )
          .toBe(true);
        await expectReservedTrigger(page);
        await qr.tap();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toHaveAccessibleName(await page.locator("h1").innerText());
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await page.locator("#main-scroll-container").evaluate(element => {
          element.scrollTop = 300;
        });
        await expectReservedTrigger(page);
      });
    }

    test(`${viewport.width}×${viewport.height} 게임과 이력 질문 입력을 가리지 않는다`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.route("**/game/ranking*", route => route.fulfill({ json: [] }));
      await gotoWithRetry(page, "/ko-KR/game/sky-drop");
      await expect(page.getByTestId("game-start-button")).toBeEnabled();
      await expectReservedTrigger(page);
      const contentBox = await page.locator("#main-scroll-container").boundingBox();
      await page.getByTestId("sidebar-trigger-mobile").tap();
      const sidebar = page.getByRole("dialog");
      expect(await page.locator("#main-scroll-container").boundingBox()).toEqual(contentBox);
      await expect(
        sidebar.getByRole("button", { name: loadMessages("ko-KR").menu.language, exact: true }),
      ).toBeInViewport({ ratio: 1 });
      await page.keyboard.press("Escape");
      await expect(sidebar).toBeHidden();
      await expect(page.getByTestId("sidebar-trigger-mobile")).toBeFocused();
      await page.getByTestId("game-start-button").tap();
      await expect(page.getByTestId("sky-drop-game")).toHaveAttribute("data-state", "playing");
      await expect(page.getByTestId("sidebar-trigger-mobile")).toBeHidden();

      await page.route("**/wordle/word", route =>
        route.fulfill({ json: { success: true, data: { word: "apple" } } }),
      );
      await gotoWithRetry(page, "/ko-KR/game/wordle");
      await expect(page.getByTestId("sidebar-trigger-mobile")).toBeHidden();
      const key = page.getByRole("button", { name: "A", exact: true });
      await expect(key).toBeEnabled();
      await key.tap();
      await expect(page.getByTestId("wordle-board")).toHaveText("A");

      await gotoWithRetry(page, "/ko-KR/resume/question");
      const composer = page.getByTestId("resume-rag-question-composer");
      await expect(composer).toBeInViewport({ ratio: 1 });
      await expectReservedTrigger(page);
      const input = composer.getByRole("textbox");
      await input.fill("경력 질문");
      await expect(input).toBeFocused();
      await expectReservedTrigger(page);
    });
  }
});
