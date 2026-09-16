import { devices, expect, test, type Locator } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import en from "../../messages/en-US.json";
import ja from "../../messages/ja-JP.json";
import { gotoWithRetry } from "./test-helpers";

const articlePath = "/ko-KR/blog/dev/postgresql-clickhouse-comparison";

const expectCompactTools = async (tools: Locator) => {
  const bounds = await tools.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.height).toBeLessThanOrEqual(64);
  const buttons = await tools.getByRole("button").all();
  const boxes = await Promise.all(buttons.map(button => button.boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  for (const box of boxes) {
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
    expect(Math.abs(box!.y - boxes[0]!.y)).toBeLessThanOrEqual(1);
  }
  expect(
    await tools.evaluate(element => element.scrollWidth - element.clientWidth),
  ).toBeLessThanOrEqual(1);
};

for (const width of [320, 375, 390, 430]) {
  test.describe(`블로그 읽기 도구 ${width}px`, () => {
    test.use({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: devices["iPhone 13"].userAgent,
    });

    test("게시일 없이 한 줄의 읽기·공유 도구를 제공한다", async ({ page }) => {
      await gotoWithRetry(page, articlePath);
      const tools = page.getByTestId("blog-reading-tools");
      await expect(page.getByTestId("blog-speech-primary")).toBeEnabled();
      await expect(page.getByTestId("blog-post-header").locator("time")).toHaveCount(0);
      await expect(page.getByTestId("blog-post-header")).not.toContainText(
        ko.blog.detail.publishedOn,
      );
      await expect(
        page
          .getByTestId("blog-speech-primary")
          .getByText(ko.blog.speech.compactRead, { exact: true }),
      ).toBeVisible();
      await expectCompactTools(tools);
      await expect(tools.getByRole("button", { name: ko.Share.share, exact: true })).toHaveCount(1);
      await expect(tools.getByRole("button", { name: ko.Share.qr, exact: true })).toHaveCount(1);
      const metadata = await page
        .getByTestId("blog-post")
        .locator('script[type="application/ld+json"]')
        .textContent();
      expect(JSON.parse(metadata ?? "{}").datePublished).toBe("2026-09-14");
    });

    test("재생·일시정지·재개·배속·중지를 터치해도 한 줄을 유지한다", async ({ page }) => {
      await gotoWithRetry(page, articlePath);
      const tools = page.getByTestId("blog-reading-tools");
      const primary = page.getByTestId("blog-speech-primary");
      const rate = page.getByTestId("blog-speech-rate");
      await expect(primary).toBeEnabled();
      await primary.tap();
      await expect(primary).toHaveAttribute("aria-label", ko.blog.speech.pause);
      await expectCompactTools(tools);
      await primary.tap();
      await expect(primary).toHaveAttribute("aria-label", ko.blog.speech.resume);
      await expectCompactTools(tools);
      for (const value of ["1.2", "0.8", "1"]) {
        await rate.tap();
        await expect(rate).toHaveAttribute(
          "aria-label",
          ko.blog.speech.speed.replace("{rate}", value),
        );
        await expectCompactTools(tools);
      }
      await primary.tap();
      await expect(primary).toHaveAttribute("aria-label", ko.blog.speech.pause);
      await page.getByTestId("blog-speech-stop").tap();
      await expect(primary).toHaveAttribute("aria-label", ko.blog.speech.read);
      await expect(page.getByTestId("blog-speech-stop")).toHaveCount(0);
      await expectCompactTools(tools);
    });

    test("QR 아이콘에서 공유창을 열고 닫은 뒤 목차를 사용할 수 있다", async ({ page }) => {
      await gotoWithRetry(page, articlePath);
      const tools = page.getByTestId("blog-reading-tools");
      await tools.getByRole("button", { name: ko.Share.qr, exact: true }).tap();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(articlePath);
      await expect(
        dialog.getByRole("button", { name: ko.Share.copyLink, exact: true }),
      ).toBeVisible();
      await dialog.locator('[data-slot="dialog-close"]').tap();
      await expect(dialog).toBeHidden();
      const outline = page.getByTestId("blog-outline").locator("details");
      await outline.locator("summary").tap();
      await outline.locator("nav a").first().tap();
      await expect(outline).not.toHaveAttribute("open", "");
      await expect(page.locator("article h2").first()).toBeInViewport();
    });
  });
}

for (const [locale, messages] of [
  ["en-US", en],
  ["ja-JP", ja],
] as const) {
  test.describe(`블로그 읽기 도구 ${locale}`, () => {
    test.use({ viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true });
    test("번역과 재생 상태가 바뀌어도 작은 화면에서 도구가 줄바꿈되지 않는다", async ({ page }) => {
      await gotoWithRetry(page, `/${locale}/blog/dev/postgresql-clickhouse-comparison`);
      const primary = page.getByTestId("blog-speech-primary");
      const tools = page.getByTestId("blog-reading-tools");
      await expect(primary).toBeEnabled();
      await expect(primary).toHaveAttribute("aria-label", messages.blog.speech.read);
      await expectCompactTools(tools);
      await primary.tap();
      await expect(primary).toHaveAttribute("aria-label", messages.blog.speech.pause);
      await expectCompactTools(tools);
      await page.getByTestId("blog-speech-rate").tap();
      await expect(page.getByTestId("blog-speech-rate")).toHaveAttribute(
        "aria-label",
        messages.blog.speech.speed.replace("{rate}", "1.2"),
      );
      await expectCompactTools(tools);
      await primary.tap();
      await expect(primary).toHaveAttribute("aria-label", messages.blog.speech.resume);
      await expectCompactTools(tools);
      await page.getByTestId("blog-speech-stop").tap();
    });
  });
}

test.describe("블로그 읽기 도구 호환성", () => {
  test("데스크톱에서는 기존 전체 레이블을 표시하고 날짜만 제거한다", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await gotoWithRetry(page, articlePath);
    const tools = page.getByTestId("blog-reading-tools");
    await expect(page.getByTestId("blog-speech-primary")).toBeEnabled();
    await expect(tools.getByText(ko.blog.speech.read, { exact: true })).toBeVisible();
    await expect(tools.getByText(ko.Share.share, { exact: true })).toBeVisible();
    await expect(tools.getByText(ko.Share.qr, { exact: true })).toBeVisible();
    await expect(page.getByTestId("blog-post-header").locator("time")).toHaveCount(0);
  });

  test("음성 API가 없어도 안내·공유·QR 버튼은 남는다", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.addInitScript(() => {
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
    });
    await gotoWithRetry(page, articlePath);
    const tools = page.getByTestId("blog-reading-tools");
    await expect(page.getByTestId("blog-speech-primary")).toHaveAttribute(
      "aria-label",
      ko.blog.speech.unsupported,
    );
    await expect(page.getByTestId("blog-speech-primary")).toBeDisabled();
    await expectCompactTools(tools);
    await tools.getByRole("button", { name: ko.Share.qr, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
