import { expect, test, type Page } from "@playwright/test";
import { getAllPosts } from "@/lib/blog";
import type { ResumeDetail, ResumeDocument } from "@/services/resume-service";
import {
  escapeRegExp,
  getHistorySnapshot,
  loadMessages,
  type Locale,
  resolveLocaleAndMessages,
  visit,
  waitForHistoryHydration,
  waitForHistoryPaths,
} from "./test-helpers";

const getTestLocale = (): Locale =>
  (process.env.PLAYWRIGHT_LOCALE as Locale | undefined) ?? "ko-KR";

const installHistoryFixture = async (
  page: Page,
  history: Array<{
    path: string;
    title: string;
    isActive: boolean;
    lastAccessedAt?: number;
  }>,
) => {
  await page.addInitScript(items => {
    const fixtureFlag = "__vscoke-history-fixture-installed";
    if (sessionStorage.getItem(fixtureFlag)) return;

    localStorage.setItem("vscoke-history", JSON.stringify(items));
    sessionStorage.setItem(fixtureFlag, "true");
  }, history);
};

test.describe("히스토리 탭 상태머신", () => {
  test("손상된 저장 경로를 제외하고 정상 탭과 본문을 복원한다", async ({ page }) => {
    const locale = getTestLocale();
    const messages = loadMessages(locale);
    await installHistoryFixture(
      page,
      [
        "/readme?resume=pe#career_1",
        "http://[",
        "",
        "readme",
        "https://example.com/readme",
        "//example.com/readme",
        "//[",
        "/\\example.com/readme",
        "/game",
      ].map(path => ({ path, title: path, isActive: false, lastAccessedAt: Date.now() })),
    );

    await visit(page, `/${locale}/game`);
    const rail = page.getByTestId("history-tab-rail");
    for (const shouldReload of [false, true]) {
      if (shouldReload) await page.reload();
      await expect(page.locator("main").getByRole("heading", { level: 1 })).toHaveText(
        messages.home.cards.gameTitle,
      );
      await expect(rail.locator("div[id]")).toHaveCount(2);
      await expect(
        rail.locator("div[id='/readme']").getByRole("button", {
          name: messages.historyTabs.readmeTitle,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        rail.locator("div[id='/game']").getByRole("button", {
          name: messages.home.cards.gameTitle,
          exact: true,
        }),
      ).toHaveAttribute("aria-current", "page");
      await expect
        .poll(async () =>
          (await getHistorySnapshot(page)).map((item: { path: string }) => item.path),
        )
        .toEqual(["/readme", "/game"]);
    }
  });

  for (const key of ["pe", "fe"]) {
    test(`${key} README의 직접·검색·탐색기 진입은 같은 탭 제목을 쓴다`, async ({
      page,
      browser,
    }) => {
      const locale = getTestLocale();
      const messages = loadMessages(locale);
      const expectedTitle =
        key === "pe" ? messages.historyTabs.readmeTitle : messages.historyTabs.readmeFrontendTitle;
      const path = key === "pe" ? "/readme" : "/readme?resume=fe";
      await installHistoryFixture(page, []);
      await visit(page, `/${locale}/readme?resume=${key}`);
      const directTab = page.getByTestId("history-tab-rail").locator(`div[id='${path}']`);
      const directButton = directTab.getByRole("button", { name: expectedTitle, exact: true });
      await expect(directButton).toHaveAttribute("aria-current", "page");
      const directTitle = await directButton.textContent();

      const searchPage = await browser.newPage();
      try {
        await installHistoryFixture(searchPage, []);
        await visit(searchPage, `/${locale}?resume=${key}`);
        const rail = searchPage.getByTestId("history-tab-rail");
        const tab = rail.locator(`div[id='${path}']`);
        await waitForHistoryHydration(searchPage);
        await expect(rail.locator("div[id^='/readme']")).toHaveCount(0);
        await searchPage
          .getByRole("button", { name: messages.sidebar.search, exact: true })
          .click();
        await searchPage
          .getByTestId("blog-dashboard-search-input")
          .fill(messages.historyTabs.readmeTitle);
        await searchPage
          .getByRole("option")
          .filter({ hasText: `/readme?resume=${key}` })
          .first()
          .click();
        await expect(searchPage).toHaveURL(
          new RegExp(`/${escapeRegExp(locale)}/readme\\?resume=${key}$`),
        );
        const searchButton = tab.getByRole("button", { name: expectedTitle, exact: true });
        await expect(searchButton).toHaveAttribute("aria-current", "page");
        await expect(searchButton).toHaveText(directTitle!);
        await expect(rail.locator("div[id^='/readme']")).toHaveCount(1);
        await expect
          .poll(
            async () =>
              (await getHistorySnapshot(searchPage)).find(
                (item: { path: string }) => item.path === path,
              )?.title,
          )
          .toBe(expectedTitle);
        if (key === "pe") {
          await searchPage.waitForLoadState("networkidle");
          await searchPage
            .getByRole("button", { name: messages.sidebar.explorer, exact: true })
            .click();
          await searchPage
            .locator("[data-slot='sidebar-content']")
            .getByText(expectedTitle, { exact: true })
            .click();
          await expect(searchPage).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme$`));
          await expect(searchButton).toHaveText(directTitle!);
          await expect(rail.locator("div[id^='/readme']")).toHaveCount(1);
        }
      } finally {
        await searchPage.close();
      }
    });
  }

  for (const entry of ["direct", "search"]) {
    test(`일반 탭은 URL로 의미 있는 제목을 표시한다 (${entry})`, async ({ page }) => {
      const locale = getTestLocale();
      const messages = loadMessages(locale);
      await installHistoryFixture(page, []);
      if (entry === "direct") {
        await visit(page, `/${locale}/game`);
      } else {
        await visit(page, `/${locale}`);
        await waitForHistoryHydration(page);
        await expect(page.getByTestId("history-tab-rail").locator("div[id='/game']")).toHaveCount(
          0,
        );
        await page.getByRole("button", { name: messages.sidebar.search, exact: true }).click();
        await page.getByTestId("blog-dashboard-search-input").fill("game");
        await page.getByRole("option").filter({ hasText: "/game" }).first().click();
      }
      await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/game$`));
      const tab = page.getByTestId("history-tab-rail").locator("div[id='/game']");
      await expect(
        tab.getByRole("button", { name: messages.home.cards.gameTitle, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect
        .poll(
          async () =>
            (await getHistorySnapshot(page)).find((item: { path: string }) => item.path === "/game")
              ?.title,
        )
        .toBe(messages.home.cards.gameTitle);
    });
  }

  for (const entry of ["direct", "search"]) {
    test(`블로그 탭은 slug 대신 글 제목을 표시한다 (${entry})`, async ({ page }) => {
      const locale = getTestLocale();
      const messages = loadMessages(locale);
      const post = getAllPosts().find(post => post.slug === "journal/hello-world")!;
      const path = `/blog/${post.slug}`;
      await installHistoryFixture(page, []);
      if (entry === "direct") {
        await visit(page, `/${locale}${path}`);
      } else {
        await visit(page, `/${locale}`);
        await waitForHistoryHydration(page);
        await page.getByRole("button", { name: messages.sidebar.search, exact: true }).click();
        await page.getByTestId("blog-dashboard-search-input").fill(post.title);
        await page.getByRole("option").filter({ hasText: path }).click();
      }
      const title = post.title;
      await expect(page.locator("h1")).toHaveText(title);
      const rail = page.getByTestId("history-tab-rail");
      const tab = rail.locator(`div[id='${path}']`);
      await expect(tab.getByRole("button", { name: title, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect
        .poll(
          async () =>
            (await getHistorySnapshot(page)).find((item: { path: string }) => item.path === path)
              ?.title,
        )
        .toBe(title);
      await page.reload();
      await expect(tab.getByRole("button", { name: title, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(rail.locator(`div[id='${path}']`)).toHaveCount(1);
    });
  }

  test("색인에 없는 일반 탭도 저장된 제목을 보존한다", async ({ page }) => {
    const locale = getTestLocale();
    const path = "/package";
    const title = "package.json";
    await installHistoryFixture(page, [
      { path, title, isActive: false, lastAccessedAt: Date.now() },
    ]);
    await visit(page, `/${locale}/game`);
    const tab = page.getByTestId("history-tab-rail").locator(`div[id='${path}']`);
    await expect(tab.getByRole("button", { name: title, exact: true })).toBeVisible();
    await tab.getByRole("button", { name: title, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}${path}$`));
    await expect(tab.getByRole("button", { name: title, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.reload();
    await expect(tab.getByRole("button", { name: title, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect
      .poll(
        async () =>
          (await getHistorySnapshot(page)).find((item: { path: string }) => item.path === path)
            ?.title,
      )
      .toBe(title);
  });

  for (const key of ["pe", "fe"]) {
    for (const hasStoredTab of [false, true]) {
      test(`추가 쿼리가 있는 경력 제목을 현재 탭에 반영한다 (${key}, 저장 ${hasStoredTab})`, async ({
        page,
        request,
      }) => {
        const locale = getTestLocale();
        const { data }: { data: ResumeDocument } = await (
          await request.get(
            `${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}&resume=${key}`,
          )
        ).json();
        const project = data.careers
          .flatMap(career => career.projects)
          .find(project => project.fileRef)!;
        const { data: detail }: { data: ResumeDetail } = await (
          await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume/details/${project.fileRef}`)
        ).json();
        const query = key === "pe" ? "?utm_source=test" : "?utm_source=test&resume=fe";
        const path = `/resume/${project.fileRef}${query}`;
        await installHistoryFixture(
          page,
          hasStoredTab
            ? [
                {
                  path: `${path}#section`,
                  title: project.fileRef!,
                  isActive: false,
                  lastAccessedAt: Date.now(),
                },
              ]
            : [],
        );
        await visit(page, `/${locale}${path}`);
        await expect(page.getByRole("heading", { name: detail.title, exact: true })).toBeVisible();
        const rail = page.getByTestId("history-tab-rail");
        const tab = rail.locator(`div[id='${path}']`);
        await expect(tab.getByRole("button", { name: detail.title, exact: true })).toHaveAttribute(
          "aria-current",
          "page",
        );
        await expect(rail.locator("div[id^='/resume/']")).toHaveCount(1);
        await expect
          .poll(async () =>
            (await getHistorySnapshot(page))
              .filter((item: { path: string }) => item.path.startsWith("/resume/"))
              .map((item: { path: string; title: string }) => [item.path, item.title]),
          )
          .toEqual([[path, detail.title]]);
        await page.reload();
        await expect(tab.getByRole("button", { name: detail.title, exact: true })).toHaveAttribute(
          "aria-current",
          "page",
        );
        await expect(rail.locator("div[id^='/resume/']")).toHaveCount(1);
      });
    }
  }

  for (const entry of ["direct", "career-button", "search"]) {
    test(`저장된 경력 slug 제목을 중복 없이 문서 이름으로 갱신한다 (${entry})`, async ({
      page,
      request,
    }) => {
      const locale = getTestLocale();
      const messages = loadMessages(locale);
      const { data }: { data: ResumeDocument } = await (
        await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}`)
      ).json();
      const project = data.careers
        .flatMap(career => career.projects)
        .find(project => project.fileRef)!;
      const { data: detail }: { data: ResumeDetail } = await (
        await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume/details/${project.fileRef}`)
      ).json();
      const path = `/resume/${project.fileRef}`;
      await installHistoryFixture(page, [
        {
          path: `${path}?resume=pe#section`,
          title: project.fileRef!,
          isActive: false,
          lastAccessedAt: Date.now(),
        },
      ]);
      if (entry === "direct") {
        await visit(page, `/${locale}${path}?resume=pe`);
      } else {
        await visit(page, `/${locale}/readme?resume=pe`);
        if (entry === "career-button") {
          await page
            .getByRole("button", { name: messages.resume.viewDescription, exact: true })
            .first()
            .click();
        } else {
          await page.getByRole("button", { name: messages.sidebar.search, exact: true }).click();
          await page.getByTestId("blog-dashboard-search-input").fill(project.title);
          await page.getByRole("option").filter({ hasText: path }).first().click();
        }
      }
      await expect(page).toHaveURL(
        new RegExp(`/${escapeRegExp(locale)}${escapeRegExp(path)}\\?resume=pe$`),
      );
      const rail = page.getByTestId("history-tab-rail");
      const tab = rail.locator(`div[id='${path}']`);
      await expect(tab.getByRole("button", { name: detail.title, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(rail.locator("div[id^='/resume/']")).toHaveCount(1);
      await expect
        .poll(
          async () =>
            (await getHistorySnapshot(page)).find((item: { path: string }) => item.path === path)
              ?.title,
        )
        .toBe(detail.title);
      await page.reload();
      await expect(tab.getByRole("button", { name: detail.title, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(rail.locator("div[id^='/resume/']")).toHaveCount(1);
    });
  }

  test("이미 이름이 있는 경력 탭은 URL 동기화 때 덮어쓰지 않는다", async ({ page, request }) => {
    const locale = getTestLocale();
    const { data }: { data: ResumeDocument } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}&resume=fe`)
    ).json();
    const project = data.careers
      .flatMap(career => career.projects)
      .find(project => project.fileRef)!;
    const path = `/resume/${project.fileRef}?resume=fe`;
    await installHistoryFixture(page, [
      { path, title: project.title, isActive: false, lastAccessedAt: Date.now() },
    ]);
    await visit(page, `/${locale}${path}`);
    const rail = page.getByTestId("history-tab-rail");
    await expect(rail.getByRole("button", { name: project.title, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(rail.locator("div[id^='/resume/']")).toHaveCount(1);
    await page.reload();
    await expect(rail.getByRole("button", { name: project.title, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("기본 README의 과거 중복 탭은 최근 제목과 순서를 보존해 합친다", async ({ page }) => {
    const now = Date.now();
    await installHistoryFixture(page, [
      { path: "/readme", title: "old title", isActive: false, lastAccessedAt: now - 1000 },
      { path: "/blog", title: "blog", isActive: false, lastAccessedAt: now },
      {
        path: "/readme?resume=pe#career_1",
        title: "recent title",
        isActive: true,
        lastAccessedAt: now,
      },
    ]);
    await visit(page, `/${getTestLocale()}/game`);
    await waitForHistoryHydration(page);

    await expect
      .poll(async () => {
        const history = await getHistorySnapshot(page);
        return history.map((item: { path: string; title: string }) => [item.path, item.title]);
      })
      .toEqual([
        ["/readme", "recent title"],
        ["/blog", "blog"],
        ["/game", loadMessages(getTestLocale()).home.cards.gameTitle],
      ]);
  });

  test("README 탐색기와 기본 문서 검색을 왕복해도 탭이 하나다", async ({ page }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    await visit(page, `/${locale}/readme`);
    await page.getByRole("button", { name: messages.sidebar.search, exact: true }).click();
    await page.getByTestId("blog-dashboard-search-input").fill("README.md");
    await page.locator("[data-slot='sidebar-content'] li > button").first().click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme\\?resume=pe$`));

    const rail = page.getByTestId("history-tab-rail");
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(1);
    await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
    await page.getByRole("button", { name: messages.sidebar.explorer, exact: true }).click();
    await page
      .locator("[data-slot='sidebar-content']")
      .getByText("README.md", { exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme$`));
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(1);
  });

  test("경력 상세 버튼 한 번으로 제목 있는 탭 하나를 열고 새로고침 후 닫는다", async ({
    page,
    request,
  }) => {
    const { locale, messages } = await resolveLocaleAndMessages(page);
    const { data }: { data: ResumeDocument } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}`)
    ).json();
    const project = data.careers
      .flatMap(career => career.projects)
      .find(project => project.fileRef)!;
    const detailPath = `/resume/${project.fileRef}`;
    const { data: detail }: { data: ResumeDetail } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume/details/${project.fileRef}`)
    ).json();
    await visit(page, `/${locale}/readme?resume=pe`);
    await page
      .getByRole("button", { name: messages.resume.viewDescription, exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${escapeRegExp(locale)}${escapeRegExp(detailPath)}\\?resume=pe$`),
    );

    const rail = page.getByTestId("history-tab-rail");
    const detailTab = rail.locator(`div[id='${detailPath}']`);
    await expect(rail.locator("div[id^='/resume/']")).toHaveCount(1);
    await expect(
      detailTab.getByRole("button", { name: detail.title, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.reload();
    await expect(
      detailTab.getByRole("button", { name: detail.title, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await detailTab
      .getByRole("button", { name: `${messages.historyTabs.close}: ${detail.title}`, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme$`));
    await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
    await expect(rail.locator("div[id^='/resume/']")).toHaveCount(0);
  });

  for (const query of ["", "?resume=pe"]) {
    test(`이동 중인 상세 탭을 닫으면 늦은 RSC 응답이 탭을 다시 열지 않는다 (${query || "기본 경로"})`, async ({
      page,
      request,
    }) => {
      const locale = getTestLocale();
      const messages = loadMessages(locale);
      const { data }: { data: ResumeDocument } = await (
        await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}`)
      ).json();
      const project = data.careers
        .flatMap(career => career.projects)
        .find(project => project.fileRef)!;
      const detailPath = `/resume/${project.fileRef}`;
      await installHistoryFixture(page, [
        { path: "/readme", title: "README", isActive: true, lastAccessedAt: Date.now() },
      ]);
      await visit(page, `/${locale}/readme${query}`);
      await waitForHistoryHydration(page);

      let release = () => {};
      const released = new Promise<void>(resolve => {
        release = resolve;
      });
      let markStarted = () => {};
      const started = new Promise<void>(resolve => {
        markStarted = resolve;
      });
      const deliveries: Promise<void>[] = [];
      await page.route(`**/${locale}${detailPath}**`, async route => {
        if (route.request().headers().rsc !== "1") {
          await route.continue();
          return;
        }
        const delivery = (async () => {
          const response = await route.fetch();
          markStarted();
          await released;
          await route.fulfill({ response });
        })();
        deliveries.push(delivery);
        await delivery;
      });

      const rail = page.getByTestId("history-tab-rail");
      const detailTab = rail.locator(`div[id='${detailPath}']`);
      try {
        await page
          .getByRole("button", { name: messages.resume.viewDescription, exact: true })
          .first()
          .click();
        await started;
        await expect(
          detailTab.getByRole("button", { name: project.fileRef!, exact: true }),
        ).toHaveAttribute("aria-current", "page");
        await expect(page).toHaveURL(
          new RegExp(`/${escapeRegExp(locale)}/readme${escapeRegExp(query)}$`),
        );
        await detailTab
          .getByRole("button", {
            name: `${messages.historyTabs.close}: ${project.fileRef}`,
            exact: true,
          })
          .click();
        await expect(detailTab).toHaveCount(0);

        release();
        await Promise.all(deliveries);
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(
          new RegExp(`/${escapeRegExp(locale)}/readme(?:\\?resume=pe)?$`),
        );
        await expect(page.getByRole("heading", { name: data.title, exact: true })).toBeVisible();
        await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
        await expect(detailTab).toHaveCount(0);
        await expect
          .poll(async () =>
            (await getHistorySnapshot(page)).some(
              (item: { path: string }) => item.path === detailPath,
            ),
          )
          .toBe(false);
      } finally {
        release();
        await Promise.all(deliveries);
      }
    });
  }

  test("비활성 탭을 닫아도 현재 문서와 활성 탭은 유지한다", async ({ page }) => {
    const locale = getTestLocale();
    const messages = loadMessages(locale);
    await installHistoryFixture(page, [
      { path: "/readme", title: "README", isActive: true, lastAccessedAt: Date.now() },
      { path: "/blog", title: "blog", isActive: false, lastAccessedAt: Date.now() },
    ]);
    await visit(page, `/${locale}/readme?resume=pe`);
    const beforeUrl = page.url();
    const heading = await page.getByRole("heading").first().textContent();
    const rail = page.getByTestId("history-tab-rail");
    const inactiveTab = rail.locator("div[id='/blog']");
    await expect(inactiveTab.locator("button[aria-current='page']")).toHaveCount(0);
    await inactiveTab.hover();
    await inactiveTab
      .getByRole("button", {
        name: new RegExp(`^${escapeRegExp(messages.historyTabs.close)}: `),
      })
      .click();
    await expect(inactiveTab).toHaveCount(0);
    await expect(page).toHaveURL(beforeUrl);
    await expect(page.getByRole("heading").first()).toHaveText(heading!);
    await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
  });

  test("FE와 PE 문서는 별개 탭으로 새로고침과 뒤로·앞으로 이동에도 유지한다", async ({
    page,
    request,
  }) => {
    const locale = getTestLocale();
    const { data: pe }: { data: ResumeDocument } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}&resume=pe`)
    ).json();
    const { data: fe }: { data: ResumeDocument } = await (
      await request.get(`${process.env.NEXT_PUBLIC_API_URL}/resume?locale=${locale}&resume=fe`)
    ).json();
    await visit(page, `/${locale}/readme?resume=pe`);
    await visit(page, `/${locale}/readme?resume=fe`);
    const rail = page.getByTestId("history-tab-rail");
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(2);
    await expect(
      rail
        .locator("div[id='/readme']")
        .getByRole("button", { name: loadMessages(locale).historyTabs.readmeTitle, exact: true }),
    ).toBeVisible();
    await expect(
      rail.locator("div[id='/readme?resume=fe']").getByRole("button", {
        name: loadMessages(locale).historyTabs.readmeFrontendTitle,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      rail.locator("div[id='/readme?resume=fe'] button[aria-current='page']"),
    ).toHaveCount(1);
    await page.reload();
    await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
    await expect(rail.locator("button[aria-current='page']")).toHaveCount(1);
    await page.goBack();
    await expect(page.getByRole("heading", { name: pe.title, exact: true })).toBeVisible();
    await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
    await page.goForward();
    await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
    await expect(
      rail.locator("div[id='/readme?resume=fe'] button[aria-current='page']"),
    ).toHaveCount(1);
    await rail.locator("div[id='/readme'] > button").first().click();
    await expect(page.getByRole("heading", { name: pe.title, exact: true })).toBeVisible();
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(2);
    const feTab = rail.locator("div[id='/readme?resume=fe']");
    await feTab.locator("button").first().click();
    await expect(page.getByRole("heading", { name: fe.title, exact: true })).toBeVisible();
    await feTab
      .getByRole("button", {
        name: new RegExp(`^${escapeRegExp(loadMessages(locale).historyTabs.close)}: `),
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${escapeRegExp(locale)}/readme$`));
    await expect(rail.locator("div[id^='/readme']")).toHaveCount(1);
    await expect(rail.locator("div[id='/readme'] button[aria-current='page']")).toHaveCount(1);
  });

  test("없는 상세 query 탭만 닫고 인접 FE 문서로 복구한다", async ({ page }) => {
    const now = Date.now();
    await installHistoryFixture(page, [
      { path: "/readme", title: "PE", isActive: false, lastAccessedAt: now },
      {
        path: "/resume/nonexistent-resume-detail?resume=fe",
        title: "missing",
        isActive: true,
        lastAccessedAt: now,
      },
      { path: "/readme?resume=fe", title: "FE", isActive: false, lastAccessedAt: now },
    ]);
    const response = await page.goto(
      `/${getTestLocale()}/resume/nonexistent-resume-detail?resume=fe`,
    );
    expect(response?.status()).toBe(404);

    await expect(page).toHaveURL(
      new RegExp(`/${escapeRegExp(getTestLocale())}/readme\\?resume=fe$`),
    );
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
    await expect(
      page.getByTestId("history-tab-rail").getByRole("button", {
        name: loadMessages(getTestLocale()).historyTabs.readmeTitle,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByTestId("history-tab-rail").getByRole("button", {
        name: loadMessages(getTestLocale()).historyTabs.readmeFrontendTitle,
        exact: true,
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("저장소 접근이 차단되어도 현재 탭을 표시한다", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", error => errors.push(error));
    await page.addInitScript(() => {
      const originalGet = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === "vscoke-history") throw new DOMException("blocked", "SecurityError");
        return originalGet.call(this, key);
      };
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "vscoke-history") throw new DOMException("blocked", "SecurityError");
        return originalSet.call(this, key, value);
      };
      const originalRemove = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key) {
        if (key === "vscoke-history") throw new DOMException("blocked", "SecurityError");
        return originalRemove.call(this, key);
      };
    });

    await visit(page, `/${getTestLocale()}/game`);
    await expect(
      page.getByTestId("history-tab-rail").locator('button[aria-current="page"]'),
    ).toContainText(loadMessages(getTestLocale()).home.cards.gameTitle);
    expect(errors).toEqual([]);
  });

  test("저장소 쓰기가 실패해도 현재 탭을 표시한다", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", error => errors.push(error));
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "vscoke-history") throw new DOMException("full", "QuotaExceededError");
        return original.call(this, key, value);
      };
    });

    await visit(page, `/${getTestLocale()}/game`);
    await expect(
      page.getByTestId("history-tab-rail").locator('button[aria-current="page"]'),
    ).toContainText(loadMessages(getTestLocale()).home.cards.gameTitle);
    expect(errors).toEqual([]);
  });

  test("마지막 접근 값이 없거나 3일 지난 탭은 만료된다", async ({ page }) => {
    const locale = getTestLocale();
    const expiredAt = Date.now() - 4 * 24 * 60 * 60 * 1000;

    await installHistoryFixture(page, [
      {
        path: "/blog",
        title: "blog",
        isActive: true,
        lastAccessedAt: expiredAt,
      },
      {
        path: "/readme",
        title: "readme",
        isActive: false,
        lastAccessedAt: Date.now(),
      },
      {
        path: "/package",
        title: "package",
        isActive: false,
      },
    ]);

    await visit(page, `/${locale}/game`);
    await waitForHistoryHydration(page);

    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        const paths = current.map((item: { path: string }) => item.path);

        return {
          hasExpiredTab: paths.includes("/blog"),
          hasLegacyTab: paths.includes("/package"),
          hasRecentTab: paths.includes("/readme"),
          activePath: current.find((item: { isActive: boolean }) => item.isActive)?.path,
        };
      })
      .toEqual({
        hasExpiredTab: false,
        hasLegacyTab: false,
        hasRecentTab: true,
        activePath: "/game",
      });
  });

  test("빈 히스토리 상태에서도 탭 영역 높이를 예약한다", async ({ page }) => {
    await installHistoryFixture(page, []);

    const locale = getTestLocale();
    await visit(page, `/${locale}`);

    const tabRail = page.locator('[data-testid="history-tab-rail"]');
    await expect(tabRail).toBeVisible();
    await expect(tabRail).toHaveCSS("height", "32px");

    await waitForHistoryHydration(page);
    await expect(tabRail).toHaveCSS("height", "32px");
  });

  test("공유 상세 탭은 URL 식별자 대신 공유 탭 이름으로 표시한다", async ({ page }) => {
    const locale = getTestLocale();
    const shareId = "00000000-0000-4000-8000-000000000000";
    const sharePath = `/share/${shareId}`;

    await installHistoryFixture(page, [
      {
        path: sharePath,
        title: shareId,
        isActive: false,
        lastAccessedAt: Date.now(),
      },
    ]);

    await visit(page, `/${locale}`);
    await waitForHistoryHydration(page);
    await waitForHistoryPaths(page, [sharePath]);

    const shareTab = page.locator(`div[id='${sharePath}']`).first();
    await expect(shareTab).toBeVisible();
    await expect(shareTab).toContainText("share");
    await expect(shareTab).not.toContainText(shareId);
  });

  test("탭이 많아 넘쳐도 새로 연 탭이 탭 줄 안에 보인다", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 757 });
    await installHistoryFixture(
      page,
      Array.from({ length: 16 }, (_, index) => ({
        path: `/blog/fixture-${index}`,
        title: `fixture-tab-${index}`,
        isActive: index === 0,
        lastAccessedAt: Date.now(),
      })),
    );
    const locale = getTestLocale();

    await visit(page, `/${locale}/game`);
    await waitForHistoryHydration(page);
    const rail = page.getByTestId("history-tab-rail");
    const activeTab = rail.locator("div[id='/game']");
    await expect(
      activeTab.getByRole("button", {
        name: loadMessages(locale).home.cards.gameTitle,
        exact: true,
      }),
    ).toHaveAttribute("aria-current", "page");
    await expect
      .poll(() => rail.evaluate(element => element.scrollWidth > element.clientWidth))
      .toBe(true);
    await expect
      .poll(async () => {
        const [railBox, tabBox] = await Promise.all([rail.boundingBox(), activeTab.boundingBox()]);
        return (
          tabBox!.x >= railBox!.x - 1 &&
          tabBox!.x + tabBox!.width <= railBox!.x + railBox!.width + 1
        );
      })
      .toBe(true);
  });

  test("탭 추가/활성화/스마트 닫기 동작이 일관되다", async ({ page }) => {
    await installHistoryFixture(page, []);

    const { locale, messages } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/readme`);
    await visit(page, `/${locale}/blog`);
    await visit(page, `/${locale}/game`);

    await waitForHistoryHydration(page);
    await waitForHistoryPaths(page, ["/readme", "/blog", "/game"]);

    const initialHistory = await getHistorySnapshot(page);
    const initialPaths = initialHistory.map((item: { path: string }) => item.path);
    expect(initialPaths.some((value: string) => value.endsWith("/readme"))).toBeTruthy();
    expect(initialPaths.some((value: string) => value.endsWith("/blog"))).toBeTruthy();
    expect(initialPaths.some((value: string) => value.endsWith("/game"))).toBeTruthy();

    const blogTab = page.locator("div[id='/blog']").first();
    await expect(blogTab).toBeVisible();
    await visit(page, `/${locale}/blog`);
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/blog$`));
    await waitForHistoryHydration(page);

    await blogTab.locator("svg").first().click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/game$`));
    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.find((item: { isActive: boolean }) => item.isActive)?.path;
      })
      .toBe("/game");

    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.some((item: { path: string }) => item.path.endsWith("/blog"));
      })
      .toBe(false);

    const gameTab = page.locator("div[id='/game']").first();
    await expect(gameTab).toBeVisible();
    await gameTab.locator("svg").first().click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/readme$`));
    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.find((item: { isActive: boolean }) => item.isActive)?.path;
      })
      .toBe("/readme");

    const readmeTab = page.locator("div[id='/readme']").first();
    await expect(readmeTab).toBeVisible();
    await readmeTab.locator("svg").first().click({ force: true });
    await expect(page).toHaveURL(new RegExp(`/${localeRegex}(?:/)?$`));

    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        const paths = current.map((item: { path: string }) => item.path);
        return {
          hasReadme: paths.some((value: string) => value.endsWith("/readme")),
          hasBlog: paths.some((value: string) => value.endsWith("/blog")),
          hasGame: paths.some((value: string) => value.endsWith("/game")),
        };
      })
      .toEqual({ hasReadme: false, hasBlog: false, hasGame: false });

    await expect(page.getByText(messages.menu.file, { exact: true })).toBeVisible();
  });

  test("휠 클릭으로 탭을 스마트 닫기한다", async ({ page }) => {
    await installHistoryFixture(page, []);

    const { locale } = await resolveLocaleAndMessages(page);
    const localeRegex = escapeRegExp(locale);

    await visit(page, `/${locale}/readme`);
    await visit(page, `/${locale}/blog`);

    await waitForHistoryHydration(page);
    await waitForHistoryPaths(page, ["/readme", "/blog"]);

    const blogTab = page.locator("div[id='/blog']").first();
    await blogTab.click({ button: "middle" });

    await expect(page).toHaveURL(new RegExp(`/${localeRegex}/readme$`));
    await expect
      .poll(async () => {
        const current = await getHistorySnapshot(page);
        return current.some((item: { path: string }) => item.path.endsWith("/blog"));
      })
      .toBe(false);
  });
});
