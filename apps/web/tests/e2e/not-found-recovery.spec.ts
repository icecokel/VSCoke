import { expect, test, type Page } from "@playwright/test";
import {
  escapeRegExp,
  expectPath,
  getHistorySnapshot,
  loadMessages,
  resolveLocaleAndMessages,
  visit,
  waitForHistoryHydration,
} from "./test-helpers";

// README 탭 제목은 URL의 variant로 구분한다.
const PE_TITLE = "README.md";
const FE_TITLE = "README.md · FE";

const installHistoryFixture = async (page: Page, paths: string[]) => {
  await page.addInitScript(
    ({ paths, peTitle, feTitle }) => {
      if (sessionStorage.getItem("__not-found-history-installed")) return;
      localStorage.setItem(
        "vscoke-history",
        JSON.stringify(
          paths.map((path, index) => ({
            path,
            title: path === "/readme" ? peTitle : path === "/readme?resume=fe" ? feTitle : path,
            isActive: index === 1,
            lastAccessedAt: Date.now(),
          })),
        ),
      );
      sessionStorage.setItem("__not-found-history-installed", "true");
    },
    { paths, peTitle: PE_TITLE, feTitle: FE_TITLE },
  );
};

test.describe.configure({ mode: "serial" });

test.describe("404 자동 복구", () => {
  for (const locale of ["ko-KR", "en-US", "ja-JP"] as const) {
    test(`${locale} 같은 경로의 실패 query만 제거하고 FE 본문으로 복구한다`, async ({
      page,
      request,
    }) => {
      const errors: Error[] = [];
      page.on("pageerror", error => errors.push(error));
      const documentUrls: string[] = [];
      page.on("request", request => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
          const { pathname, search } = new URL(request.url());
          documentUrls.push(`${pathname}${search}`);
        }
      });
      const { data: fe } = await (
        await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}&resume=fe`)
      ).json();
      await installHistoryFixture(page, ["/readme", "/readme?resume=missing", "/readme?resume=fe"]);
      const response = await page.goto(`/${locale}/readme?resume=missing`);
      expect(response?.status()).toBe(404);
      expect(errors).toEqual([]);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt > 0) await page.reload();
        await expect(page).toHaveURL(new RegExp(`/${locale}/readme\\?resume=fe$`));
        await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
        await expect(
          page.getByText(loadMessages(locale).notFound.title, { exact: true }),
        ).toHaveCount(0);
        await expect
          .poll(async () =>
            (await getHistorySnapshot(page)).map((item: { path: string; isActive: boolean }) => [
              item.path,
              item.isActive,
            ]),
          )
          .toEqual([
            ["/readme", false],
            ["/readme?resume=fe", true],
          ]);
        const rail = page.getByTestId("history-tab-rail");
        await expect(rail.getByRole("button", { name: PE_TITLE, exact: true })).toBeVisible();
        await expect(rail.getByRole("button", { name: FE_TITLE, exact: true })).toHaveAttribute(
          "aria-current",
          "page",
        );
        await expect(rail.locator("div[id='/readme?resume=missing']")).toHaveCount(0);
      }
      expect(documentUrls).toEqual([
        `/${locale}/readme?resume=missing`,
        `/${locale}/readme?resume=fe`,
        `/${locale}/readme?resume=fe`,
      ]);
      expect(errors).toEqual([]);
    });
  }

  for (const isMobile of [false, true]) {
    test.describe(isMobile ? "모바일" : "데스크톱", () => {
      test.use({
        viewport: isMobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
        isMobile,
        hasTouch: isMobile,
      });

      test("localStorage 쓰기 실패 중에도 FE로 복구하고 새로고침 후 실패 탭을 되살리지 않는다", async ({
        page,
        request,
      }) => {
        const { data: fe } = await (
          await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=ko-KR&resume=fe`)
        ).json();
        await installHistoryFixture(page, [
          "/readme",
          "/readme?resume=missing",
          "/readme?resume=fe",
        ]);
        await page.addInitScript(() => {
          const setItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (
              this === localStorage &&
              key === "vscoke-history" &&
              sessionStorage.getItem("__not-found-history-installed") &&
              !sessionStorage.getItem("__history-writes-restored")
            )
              throw new DOMException("full", "QuotaExceededError");
            return setItem.call(this, key, value);
          };
        });
        expect((await page.goto("/ko-KR/readme?resume=missing"))?.status()).toBe(404);

        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (attempt > 0) await page.reload();
          await expect(page).toHaveURL(/\/ko-KR\/readme\?resume=fe$/);
          await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
          const rail = page.getByTestId("history-tab-rail");
          await expect(
            rail.getByRole("button", { name: FE_TITLE, exact: true, includeHidden: true }),
          ).toHaveAttribute("aria-current", "page");
          await expect
            .poll(() => rail.locator("[id]").evaluateAll(tabs => tabs.map(tab => tab.id)))
            .toEqual(["/readme", "/readme?resume=fe"]);
          await expect
            .poll(() =>
              page.evaluate(() =>
                JSON.parse(sessionStorage.getItem("vscoke-history") ?? "[]").map(
                  (item: { path: string }) => item.path,
                ),
              ),
            )
            .toEqual(["/readme", "/readme?resume=fe"]);
        }

        await page.evaluate(() => sessionStorage.setItem("__history-writes-restored", "true"));
        await page.reload();
        await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
        await expect
          .poll(async () => (await getHistorySnapshot(page)).map(item => item.path))
          .toEqual(["/readme", "/readme?resume=fe"]);
        await expect
          .poll(() => page.evaluate(() => sessionStorage.getItem("vscoke-history")))
          .toBeNull();
      });
    });
  }

  test("두 저장소에 모두 쓸 수 없으면 문서를 떠나지 않고 정상 탭을 보존해 홈으로 간다", async ({
    page,
  }) => {
    await installHistoryFixture(page, ["/readme", "/readme?resume=missing", "/readme?resume=fe"]);
    await page.addInitScript(() => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "vscoke-history" && sessionStorage.getItem("__not-found-history-installed"))
          throw new DOMException("full", "QuotaExceededError");
        return setItem.call(this, key, value);
      };
    });
    const documentPaths: string[] = [];
    page.on("request", request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        documentPaths.push(new URL(request.url()).pathname);
      }
    });
    await page.goto("/ko-KR/readme?resume=missing");
    await expect(page).toHaveURL(/\/ko-KR\/?$/);
    await expect(page.getByText(loadMessages("ko-KR").menu.file, { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page
          .getByTestId("history-tab-rail")
          .locator("[id]")
          .evaluateAll(tabs => tabs.map(tab => tab.id)),
      )
      .toEqual(["/readme", "/readme?resume=fe", "/"]);
    expect(documentPaths).toEqual(["/ko-KR/readme"]);
  });

  test("다른 pathname의 404는 문서를 다시 로드하지 않고 FE 본문으로 복구한다", async ({
    page,
    request,
  }) => {
    const { data: fe } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=ko-KR&resume=fe`)
    ).json();
    await installHistoryFixture(page, ["/readme", "/blog/missing-post", "/readme?resume=fe"]);
    const documentPaths: string[] = [];
    page.on("request", request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        documentPaths.push(new URL(request.url()).pathname);
      }
    });
    expect((await page.goto("/ko-KR/blog/missing-post"))?.status()).toBe(404);
    await expect(page).toHaveURL(/\/ko-KR\/readme\?resume=fe$/);
    await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
    await expect
      .poll(async () => (await getHistorySnapshot(page)).map(item => item.path))
      .toEqual(["/readme", "/readme?resume=fe"]);
    expect(documentPaths).toEqual(["/ko-KR/blog/missing-post"]);
  });

  for (const target of ["/readme?resume=private", "/resume/nonexistent-resume-detail"]) {
    test(`복구 대상 ${target}도 404이면 다른 정상 탭을 지우지 않고 홈으로 한 번만 이동한다`, async ({
      page,
    }) => {
      await installHistoryFixture(page, ["/readme", "/readme?resume=missing", target]);
      const routes: string[] = [];
      page.on("framenavigated", frame => {
        if (frame !== page.mainFrame()) return;
        const path = new URL(frame.url()).pathname + new URL(frame.url()).search;
        if (routes.at(-1) !== path) routes.push(path);
      });
      expect((await page.goto("/ko-KR/readme?resume=missing"))?.status()).toBe(404);
      await expect(page).toHaveURL(/\/ko-KR\/?$/);
      await expect(page.getByText(loadMessages("ko-KR").menu.file, { exact: true })).toBeVisible();
      await expect
        .poll(async () => (await getHistorySnapshot(page)).map(item => item.path))
        .toEqual(["/readme", "/"]);
      expect(routes.filter(path => path === "/ko-KR")).toHaveLength(1);
      expect(routes.filter(path => path === "/ko-KR/readme?resume=missing")).toHaveLength(1);
      expect(routes.filter(path => path === `/ko-KR${target}`)).toHaveLength(1);
      await page.reload();
      await expect(page).toHaveURL(/\/ko-KR\/?$/);
      await expect
        .poll(async () => (await getHistorySnapshot(page)).map(item => item.path))
        .toEqual(["/readme", "/"]);
    });
  }

  test("뒤로 실패 URL에 재진입한 뒤 앞으로 이동해도 정상 탭을 보존한다", async ({ page }) => {
    await installHistoryFixture(page, ["/readme", "/readme?resume=missing", "/readme?resume=fe"]);
    await page.addInitScript(() => {
      if (location.search !== "?resume=missing" || sessionStorage.getItem("__failed-entry-added"))
        return;
      // 복구가 replace할 항목 앞에도 실패 URL을 남겨 실제 뒤로·앞으로 재진입을 검사한다.
      history.pushState(history.state, "", location.href);
      sessionStorage.setItem("__failed-entry-added", "true");
    });
    await page.goto("/ko-KR/readme?resume=missing");
    await expect(page).toHaveURL(/\/ko-KR\/readme\?resume=fe$/);
    await expect(
      page.getByTestId("history-tab-rail").getByRole("button", { name: FE_TITLE, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.goBack();
    await expect(page).toHaveURL(/\/ko-KR\/?$/);
    await expect(page.getByText(loadMessages("ko-KR").menu.file, { exact: true })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/\/ko-KR\/readme\?resume=fe$/);
    await expect(
      page.getByTestId("history-tab-rail").getByRole("button", { name: FE_TITLE, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect
      .poll(async () => (await getHistorySnapshot(page)).map(item => item.path))
      .toEqual(["/readme", "/readme?resume=fe", "/"]);
  });

  test("앞으로 실패 URL에 재진입해도 한 번만 FE 본문으로 복구한다", async ({ page, request }) => {
    const { data: fe } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=ko-KR&resume=fe`)
    ).json();
    await visit(page, "/ko-KR/readme");
    await installHistoryFixture(page, ["/readme", "/readme?resume=missing", "/readme?resume=fe"]);
    // 최초 404의 hydration만 막아 앞으로 이동할 실패 항목을 브라우저 기록에 남긴다.
    await page.route("**/_next/static/**/*.js", route => route.abort());
    expect((await page.goto("/ko-KR/readme?resume=missing"))?.status()).toBe(404);
    await page.unroute("**/_next/static/**/*.js");
    await page.goBack();
    await expect(page).toHaveURL(/\/ko-KR\/readme$/);
    await expect(page.getByTestId("history-tab-rail")).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/\/ko-KR\/readme\?resume=fe$/);
    await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
    await expect
      .poll(async () => (await getHistorySnapshot(page)).map(item => item.path))
      .toEqual(["/readme", "/readme?resume=fe"]);
  });

  test("문서 간 복구 상태를 저장할 수 없으면 반복 이동 없이 홈으로 복구한다", async ({ page }) => {
    await installHistoryFixture(page, ["/readme", "/readme?resume=missing", "/readme?resume=fe"]);
    const errors: Error[] = [];
    page.on("pageerror", error => errors.push(error));
    await page.addInitScript(() => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "vscoke-not-found-target") throw new DOMException("blocked", "SecurityError");
        return setItem.call(this, key, value);
      };
    });
    await page.goto("/ko-KR/readme?resume=missing");
    await expect(page).toHaveURL(/\/ko-KR\/?$/);
    await expect(page.getByText(loadMessages("ko-KR").menu.file, { exact: true })).toBeVisible();
    await expect
      .poll(async () => (await getHistorySnapshot(page)).map(item => item.path))
      .toEqual(["/readme", "/readme?resume=fe", "/"]);
    expect(errors).toEqual([]);
  });

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

  test("잘못된 공유 결과 id는 서버 예외가 아니라 404로 처리된다", async ({ page }) => {
    const { locale } = await resolveLocaleAndMessages(page);

    const response = await page.goto(`/${locale}/share/not-a-real-id`);

    expect(response?.status()).toBe(404);
  });
});
