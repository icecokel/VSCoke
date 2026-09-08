import { expect, test } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import en from "../../messages/en-US.json";
import ja from "../../messages/ja-JP.json";
import { gotoWithRetry } from "./test-helpers";

const articlePath = "/ko-KR/blog/journal/hello-world";

test.describe("블로그 상세 읽기 경험", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("제목·메타·도구·본문 순서와 의미 있는 제목 계층을 제공한다", async ({ page }) => {
    await gotoWithRetry(page, articlePath);
    await expect(page.getByTestId("blog-outline-desktop")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("article h2")).toHaveCount(1);
    await expect(page.locator("article h3")).toHaveCount(3);
    await expect(page.locator("article")).toHaveAttribute("lang", "ko");
    await expect(page.getByRole("group", { name: ko.blog.detail.tools })).toBeVisible();
    const boxes = await Promise.all([
      page.getByTestId("blog-post-header").boundingBox(),
      page.getByTestId("blog-reading-tools").boundingBox(),
      page.locator("article").boundingBox(),
    ]);
    expect(boxes.every(Boolean)).toBe(true);
    expect(boxes[0]!.y + boxes[0]!.height).toBeLessThan(boxes[1]!.y);
    expect(boxes[1]!.y + boxes[1]!.height).toBeLessThan(boxes[2]!.y);
    expect(boxes[2]!.width).toBeLessThanOrEqual(768);
    await expect(page.locator("header time")).toHaveAttribute("datetime", "2024-12-13");
  });

  test("목차는 키보드로 이동하고 fragment·초점·새로고침 위치를 유지한다", async ({ page }) => {
    await gotoWithRetry(page, articlePath);
    const outline = page.getByTestId("blog-outline-desktop");
    await expect(outline).toBeVisible();
    const link = outline.getByRole("link").nth(1);
    const fragment = await link.getAttribute("href");
    expect(fragment).toBeTruthy();
    await link.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.evaluate(() => decodeURIComponent(location.hash)))
      .toBe(decodeURIComponent(fragment!));
    const target = page.locator(`[id="${decodeURIComponent(fragment!.slice(1))}"]`);
    await expect(target).toBeFocused();
    await expect(link).toHaveAttribute("aria-current", "location");
    await page.reload();
    await expect(outline).toBeVisible();
    await expect
      .poll(() => page.locator("#main-scroll-container").evaluate(element => element.scrollTop))
      .toBeGreaterThan(100);
    await expect(target).toBeInViewport();
  });

  test("코드 복사는 본문만 복사하고 완료 상태를 알린다", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            document.documentElement.dataset.copiedCode = value;
          },
        },
      });
    });
    await gotoWithRetry(page, articlePath);
    const block = page.getByTestId("blog-code-block");
    const original = await block.locator("pre").textContent();
    await block.getByRole("button", { name: ko.blog.detail.copyCode }).click();
    await expect(block.getByRole("status")).toHaveText(ko.blog.detail.copied);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.copiedCode))
      .toBe(original);
  });

  test("클립보드 권한 거부 시 오류를 표시하고 코드를 계속 읽을 수 있다", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new DOMException("Denied", "NotAllowedError");
          },
        },
      });
    });
    await gotoWithRetry(page, articlePath);
    const block = page.getByTestId("blog-code-block");
    await block.getByRole("button", { name: ko.blog.detail.copyCode }).click();
    await expect(block.getByRole("status")).toHaveText(ko.blog.detail.copyFailed);
    await expect(block.locator("pre")).toContainText("const greeting");
    await block.locator("pre").focus();
    await expect(block.locator("pre")).toBeFocused();
  });

  test("QR 공유와 목록 복귀를 유지한다", async ({ page }) => {
    await gotoWithRetry(page, articlePath);
    await page.getByRole("button", { name: ko.Share.qr, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("/ko-KR/blog/journal/hello-world");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByRole("link", { name: ko.blog.backToList, exact: true }).click();
    await expect(page).toHaveURL(/\/ko-KR\/blog$/);
  });

  test("내부 스크롤 진행률과 마지막 목차 항목을 갱신한다", async ({ page }) => {
    await gotoWithRetry(page, articlePath);
    const outline = page.getByTestId("blog-outline-desktop");
    await expect(outline).toBeVisible();
    const progress = page.getByRole("progressbar", { name: ko.blog.detail.progress });
    await expect(progress).toHaveAttribute("aria-valuenow", "0");
    await page.locator("#main-scroll-container").evaluate(element => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(progress).toHaveAttribute("aria-valuenow", "100");
    await expect(outline.locator("ol a").last()).toHaveAttribute("aria-current", "location");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("Mermaid 도표가 토큰 테마로 렌더링되고 본문 밖으로 넘치지 않는다", async ({ page }) => {
    await gotoWithRetry(page, "/ko-KR/blog/journal/wiki-mcp-for-designers");
    await expect(page.locator("article [role=img] svg")).toHaveCount(4, { timeout: 30_000 });
    const colors = await page
      .locator("article [role=img]")
      .first()
      .evaluate(element => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, border: style.borderTopColor };
      });
    expect(colors.background).not.toBe("rgba(0, 0, 0, 0)");
    await page.setViewportSize({ width: 360, height: 800 });
    await expect
      .poll(() =>
        page
          .locator("#main-scroll-container")
          .evaluate(element => element.scrollWidth - element.clientWidth),
      )
      .toBeLessThanOrEqual(1);
  });

  test("긴 표는 자체 영역에서 스크롤되고 키보드로 접근할 수 있다", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 844 });
    await gotoWithRetry(page, "/ko-KR/blog/dev/node-env-vars");
    const table = page.locator("article table").first();
    await expect(table).toBeAttached();
    const region = table.locator("..");
    await region.focus();
    await expect(region).toBeFocused();
    await expect
      .poll(() =>
        page
          .locator("#main-scroll-container")
          .evaluate(element => element.scrollWidth - element.clientWidth),
      )
      .toBeLessThanOrEqual(1);
  });

  for (const width of [360, 390, 768]) {
    test(`${width}px에서 접이식 목차·코드·본문에 페이지 가로 넘침이 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await gotoWithRetry(page, articlePath);
      await expect(page.getByTestId("blog-outline-desktop")).toBeHidden();
      const details = page.getByTestId("blog-outline").locator("details");
      await expect(details).toBeVisible();
      await details.locator("summary").click();
      const target = details.locator("a").nth(1);
      await expect(target).toBeVisible();
      await target.click();
      await expect(details).not.toHaveAttribute("open", "");
      await expect
        .poll(() =>
          page
            .locator("#main-scroll-container")
            .evaluate(element => element.scrollWidth - element.clientWidth),
        )
        .toBeLessThanOrEqual(1);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await page.getByTestId("blog-code-block").scrollIntoViewIfNeeded();
      await expect(page.getByRole("button", { name: ko.blog.detail.copyCode })).toBeVisible();
    });
  }

  for (const [locale, messages] of [
    ["en-US", en],
    ["ja-JP", ja],
  ] as const) {
    test(`${locale}에서 읽기 도구·목차·날짜를 현지화한다`, async ({ page }) => {
      await gotoWithRetry(page, `/${locale}/blog/journal/hello-world`);
      await expect(page.getByRole("group", { name: messages.blog.detail.tools })).toBeVisible();
      await expect(
        page
          .getByTestId("blog-outline-desktop")
          .getByText(messages.blog.detail.contents, { exact: true }),
      ).toBeVisible();
      await expect(page.locator("header time")).toContainText("2024");
      await expect(
        page.getByRole("button", { name: messages.blog.detail.copyCode }),
      ).toBeAttached();
      await expect(page.locator("article")).toHaveAttribute("lang", "ko");
    });
  }
});
