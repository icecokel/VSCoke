import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "@playwright/test";
import ts from "typescript";
import ko from "../../messages/ko-KR.json";
import en from "../../messages/en-US.json";
import ja from "../../messages/ja-JP.json";
import { escapeRegExp, gotoWithRetry } from "./test-helpers";

const articlePath = "/ko-KR/blog/journal/hello-world";

test.describe("블로그 본문 정리", () => {
  for (const slug of [
    "dev/javascript-array-reduce",
    "dev/postman-api-test",
    "dev/what-is-knip",
    "journal/game-ux-improvement",
    "journal/journey-to-increase-game-users",
  ]) {
    test(`${slug}의 본문에 깨진 Markdown이 없다`, async ({ page }) => {
      await gotoWithRetry(page, `/ko-KR/blog/${slug}`);
      const paragraphs = await page.locator("article p").evaluateAll(elements =>
        elements.map(element => {
          const paragraph = element.cloneNode(true) as HTMLElement;
          paragraph.querySelectorAll("code").forEach(code => code.remove());
          return paragraph.textContent;
        }),
      );
      expect(paragraphs.join("\n")).not.toMatch(
        /\*\*|\]\(https?:|\[Array\.prototype|\[Download Postman/,
      );

      if (slug === "dev/javascript-array-reduce") {
        await expect(
          page.locator(
            "article a[href='https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce']",
          ),
        ).toHaveCount(2);
      }
      if (slug === "dev/postman-api-test") {
        await expect(page.locator("h1")).toContainText("REST API");
        await expect(
          page.locator("article a[href='https://www.postman.com/downloads/']"),
        ).toHaveCount(1);
      }
    });
  }

  for (const slug of ["javascript-last-day-of-month", "typescript-express-setup"]) {
    test(`${slug}의 렌더 코드와 복사 값은 줄바꿈과 구문이 유효하다`, async ({ page }) => {
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
      await gotoWithRetry(page, `/ko-KR/blog/dev/${slug}`);
      const blocks = page.getByTestId("blog-code-block");
      await expect(blocks).toHaveCount(slug === "javascript-last-day-of-month" ? 1 : 5);

      for (const [index, block] of (await blocks.all()).entries()) {
        const text = (await block.locator("pre").textContent())!;
        expect(await block.locator("pre code").textContent()).toBe(text);
        expect(text).not.toContain("\\n");
        if (index < 4) expect(text).toContain("\n");

        if (slug === "javascript-last-day-of-month") {
          expect(() => new Function(text)).not.toThrow();
          expect(text).toMatch(/new Date\(2022,\s*month,\s*0\)/);
        } else if (index === 1 || index === 2) {
          expect(() => JSON.parse(text)).not.toThrow();
        } else if (index === 3) {
          const result = ts.transpileModule(text, {
            fileName: "server.ts",
            reportDiagnostics: true,
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext },
          });
          expect(result.diagnostics).toEqual([]);
        } else {
          const result = spawnSync("bash", ["-n"], { input: text, encoding: "utf8" });
          expect(result.error).toBeUndefined();
          expect(result.stderr).toBe("");
          expect(result.status).toBe(0);
        }

        await block.getByRole("button", { name: ko.blog.detail.copyCode }).click();
        await expect(block.getByRole("status")).toHaveText(ko.blog.detail.copied);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.dataset.copiedCode))
          .toBe(text);
      }
    });
  }

  for (const [locale, messages] of [
    ["ko-KR", ko],
    ["en-US", en],
    ["ja-JP", ja],
  ] as const) {
    test(`${locale}에서 유실된 OG 이미지를 요청하지 않고 안내한다`, async ({ page }) => {
      const missingImageRequests: string[] = [];
      page.on("request", request => {
        if (request.url().includes("/images/blog/og-fail.png"))
          missingImageRequests.push(request.url());
      });
      await gotoWithRetry(page, `/${locale}/blog/journal/journey-to-increase-game-users`);
      await expect(page.locator("article img[src='/images/blog/og-fail.png']")).toHaveCount(0);
      const notice = page.getByTestId("blog-legacy-image-notice");
      await expect(notice).toHaveCount(1);
      await notice.scrollIntoViewIfNeeded();
      await expect(notice).toBeVisible();
      await expect(notice).toContainText(messages.blog.detail.imageUnavailable);
      expect(missingImageRequests).toEqual([]);
    });
  }
});

test.describe("블로그 상세 읽기 경험", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900, isMobile: false },
    { name: "mobile", width: 390, height: 844, isMobile: true },
  ]) {
    test.describe(`fragment 복원 ${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
      });

      test("목차 뒤 다른 글로 이동해도 뒤로·앞으로에서 URL과 본문이 함께 복원된다", async ({
        page,
      }, testInfo) => {
        const originalPath = "/ko-KR/blog/journal/user-flow-logging-429-investigation";
        await gotoWithRetry(page, originalPath);
        const originalTitle = await page.locator("h1").textContent();
        const originalLead = await page.locator("article p").first().textContent();
        const before = await page.evaluate(() => Boolean(history.state?.__NA));
        const outline = page.getByTestId("blog-outline");
        await expect(outline).toBeVisible();
        const summary = outline.locator("summary");
        if (await summary.isVisible()) await summary.click();
        const link = outline.locator("ol a").filter({ visible: true }).nth(1);
        const fragment = (await link.getAttribute("href"))!;
        await link.click();
        await expect
          .poll(() => page.evaluate(() => decodeURIComponent(location.hash)))
          .toBe(decodeURIComponent(fragment));
        const after = await page.evaluate(() => Boolean(history.state?.__NA));
        testInfo.annotations.push({
          type: "history-state",
          description: JSON.stringify({ before, after }),
        });

        if (viewport.isMobile) await page.getByTestId("sidebar-trigger-mobile").click();
        await page.getByRole("button", { name: ko.sidebar.search, exact: true }).click();
        await page.getByTestId("blog-dashboard-search-input").fill("PostgreSQL");
        // 개발 서버의 첫 컴파일 지연을 모사해 5초를 넘는 응답에서도 이력을 검증한다.
        await page.route(
          "**/blog/dev/postgresql-clickhouse-comparison?*",
          async route => {
            const response = await route.fetch();
            await delay(6_000);
            await route.fulfill({ response });
          },
          { times: 1 },
        );
        await page
          .locator("[data-slot='sidebar-content'] li > button")
          .filter({ hasText: "/blog/dev/postgresql-clickhouse-comparison" })
          .click();
        await expect(page).toHaveURL(/\/blog\/dev\/postgresql-clickhouse-comparison$/, {
          timeout: 15_000,
        });
        await expect(page.locator("h1")).not.toHaveText(originalTitle!);
        const nextTitle = await page.locator("h1").textContent();
        const nextLead = await page.locator("article p").first().textContent();

        await page.goBack();
        await expect(page).toHaveURL(
          new RegExp(`${escapeRegExp(originalPath)}${escapeRegExp(fragment)}$`),
        );
        await expect(page.locator("h1")).toHaveText(originalTitle!);
        await expect(page.locator("article p").first()).toHaveText(originalLead!);
        await expect(
          page.locator(`[id="${decodeURIComponent(fragment.slice(1))}"]`),
        ).toBeInViewport();
        await page.goForward();
        await expect(page).toHaveURL(/\/blog\/dev\/postgresql-clickhouse-comparison$/);
        await expect(page.locator("h1")).toHaveText(nextTitle!);
        await expect(page.locator("article p").first()).toHaveText(nextLead!);
      });
    });
  }

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
    await expect(page.getByTestId("blog-post-header").locator("time")).toHaveCount(0);
    const jsonLd = await page
      .getByTestId("blog-post")
      .locator('script[type="application/ld+json"]')
      .textContent();
    expect(JSON.parse(jsonLd ?? "{}").datePublished).toBe("2024-12-13");
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
    const [progressBox, targetBox] = await Promise.all([
      page.getByRole("progressbar", { name: ko.blog.detail.progress }).boundingBox(),
      target.boundingBox(),
    ]);
    expect(progressBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    expect(targetBox!.y).toBeGreaterThanOrEqual(progressBox!.y + progressBox!.height + 8);
    await page.reload();
    await expect(outline).toBeVisible();
    await expect
      .poll(() => page.locator("#main-scroll-container").evaluate(element => element.scrollTop))
      .toBeGreaterThan(100);
    await expect(target).toBeInViewport();
    const nextLink = outline.locator("ol a").nth(2);
    const nextFragment = (await nextLink.getAttribute("href"))!;
    await nextLink.click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(nextFragment);
    await page.goBack();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(fragment);
    await expect(target).toBeInViewport();
    await page.goForward();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(nextFragment);
    await outline.getByRole("link", { name: ko.blog.detail.backToTop, exact: true }).click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe("#blog-post-top");
    await expect(page.getByTestId("blog-post-header")).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("수정키로 목차를 열면 원래 글의 fragment와 초점을 바꾸지 않는다", async ({
    page,
    context,
  }) => {
    await gotoWithRetry(page, articlePath);
    const link = page.getByTestId("blog-outline-desktop").locator("ol a").nth(1);
    await link.focus();
    const [opened] = await Promise.all([
      context.waitForEvent("page"),
      link.click({ modifiers: ["ControlOrMeta"] }),
    ]);
    try {
      await expect(opened.locator("h1")).toHaveCount(1);
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(articlePath)}$`));
      await expect(link).toBeFocused();
    } finally {
      await opened.close();
    }
  });

  test("목차로 이동해도 탭 줄이 메뉴바 아래에 그대로 보인다", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 757 });
    await gotoWithRetry(page, articlePath);
    const outline = page.getByTestId("blog-outline");
    await expect(outline).toBeVisible();
    // 창 너비에 따라 데스크톱 목차 또는 접힌 목차가 보이므로 보이는 쪽으로 이동한다.
    const summary = outline.locator("summary");
    if (await summary.isVisible()) await summary.click();
    await outline.locator("ol a").filter({ visible: true }).nth(2).click();
    await expect.poll(() => page.evaluate(() => location.hash)).not.toBe("");

    const [menubarBox, railBox] = await Promise.all([
      page.locator("#menubar").boundingBox(),
      page.getByTestId("history-tab-rail").boundingBox(),
    ]);
    expect(railBox!.y).toBeGreaterThanOrEqual(menubarBox!.y + menubarBox!.height - 1);
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
    await expect(page).toHaveURL(/\/ko-KR\/blog\/dashboard\?category=journal$/);
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
    test(`${locale}에서 읽기 도구·목차를 현지화하고 날짜를 표시하지 않는다`, async ({ page }) => {
      await gotoWithRetry(page, `/${locale}/blog/journal/hello-world`);
      await expect(page.getByRole("group", { name: messages.blog.detail.tools })).toBeVisible();
      await expect(
        page
          .getByTestId("blog-outline-desktop")
          .getByText(messages.blog.detail.contents, { exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId("blog-post-header").locator("time")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: messages.blog.detail.copyCode }),
      ).toBeAttached();
      await expect(page.locator("article")).toHaveAttribute("lang", "ko");
    });
  }
});
