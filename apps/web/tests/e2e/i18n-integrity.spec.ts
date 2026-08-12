import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  expectPath,
  loadMessages,
  resolveLocaleAndMessages,
  SUPPORTED_LOCALES,
  type AppMessages,
  type Locale,
  visit,
} from "./test-helpers";

const LANGUAGE_LABEL_KEYS: Record<Locale, keyof AppMessages["common"]> = {
  "ko-KR": "korean",
  "en-US": "english",
  "ja-JP": "japanese",
};

interface ResumeProjectCopy {
  title: string;
  descriptions: Array<{
    subtitle: string;
    detail?: string;
    skills?: string;
    tasks?: string[];
  }>;
}

interface ResumeCopyMessages {
  resume: {
    title: string;
    introduction: string[];
    careers: {
      oprimed: {
        role: string;
        projects: {
          medicalFrontendProductization: ResumeProjectCopy;
        };
      };
      codecrayon: {
        role: string;
        projects: {
          commerceBackoffice: ResumeProjectCopy;
          shortimePlayground: ResumeProjectCopy;
          subtitleSystem: ResumeProjectCopy;
        };
      };
      allofthem: {
        role: string;
        projects: {
          insuranceSubscription: ResumeProjectCopy;
          insuranceResponsive: ResumeProjectCopy;
        };
      };
      datalogics: {
        role: string;
        projects: {
          consularCallCenter: ResumeProjectCopy;
        };
      };
      datalogicsInfra: {
        role: string;
        projects: {
          policyCoordination: ResumeProjectCopy;
        };
      };
    };
  };
}

test.describe.configure({ mode: "serial" });

test.describe("i18n 무결성", () => {
  const collectLeafPaths = (value: unknown, prefix = ""): string[] => {
    if (Array.isArray(value)) {
      return value.flatMap((item, index) => collectLeafPaths(item, `${prefix}[${index}]`));
    }

    if (value && typeof value === "object") {
      return Object.entries(value).flatMap(([key, child]) =>
        collectLeafPaths(child, prefix ? `${prefix}.${key}` : key),
      );
    }

    return [prefix];
  };

  test("모든 locale 메시지의 키와 배열 구조가 일치한다", () => {
    const [baseLocale, ...otherLocales] = SUPPORTED_LOCALES;
    const basePaths = collectLeafPaths(loadMessages(baseLocale)).sort();

    for (const locale of otherLocales) {
      expect(collectLeafPaths(loadMessages(locale)).sort(), `${locale} 메시지 구조`).toEqual(
        basePaths,
      );
    }
  });

  test("최신 베이스 이력서 핵심 문구가 모든 locale에 반영되어 있다", () => {
    const koMessages = loadMessages("ko-KR") as AppMessages & ResumeCopyMessages;
    const enMessages = loadMessages("en-US") as AppMessages & ResumeCopyMessages;
    const jaMessages = loadMessages("ja-JP") as AppMessages & ResumeCopyMessages;

    expect(koMessages.resume.title).toBe("비즈니스 가치를 만들고, 팀의 고통을 줄이는 개발자");
    expect(enMessages.resume.title).toBe(
      "A developer who creates business value and reduces team pain points",
    );
    expect(jaMessages.resume.title).toBe("ビジネス価値を生み出し、チームの負担を減らす開発者");

    for (const messages of [koMessages, enMessages, jaMessages]) {
      expect(messages.resume.introduction).toHaveLength(4);
    }
    expect(koMessages.resume.introduction[0]).toBe(
      "안녕하세요. 프론트엔드를 중심으로 제품과 운영에 필요한 기능을 개발해 온 이상민입니다.",
    );
    expect(koMessages.resume.introduction[3]).toContain("프로젝트별 지침·Skill·Hook·PR 검증 기준");
    expect(enMessages.resume.introduction[1]).toContain("independent WebView product");
    expect(jaMessages.resume.introduction[2]).toContain("ログ保存、リクエスト追跡");

    expect(
      koMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual(["의료·임상 분석 화면 개발", "AI 개발 도구 활용", "인프라와 백엔드"]);
    expect(
      enMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual([
      "Medical and Clinical Analysis Screen Development",
      "AI Development Tooling",
      "Infrastructure and Backend",
    ]);
    expect(
      jaMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual(["医療・臨床分析画面の開発", "AI開発ツールの活用", "インフラとバックエンド"]);
    expect(koMessages.resume.careers.oprimed.role).toBe("서비스 개발자");
    expect(
      koMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[0]
        ?.tasks?.[2],
    ).toContain("약 95%");
    expect(
      enMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[1]
        ?.tasks?.[1],
    ).toContain("typecheck, test, and build");
    expect(
      jaMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[2]
        ?.skills,
    ).toContain("Django REST Framework");

    expect([
      koMessages.resume.careers.codecrayon.projects.commerceBackoffice.title,
      koMessages.resume.careers.codecrayon.projects.shortimePlayground.title,
      koMessages.resume.careers.codecrayon.projects.subtitleSystem.title,
    ]).toEqual(["커머스·백오피스", "WebView·웹게임", "AI 활용과 운영 도구"]);
    expect([
      enMessages.resume.careers.codecrayon.projects.commerceBackoffice.title,
      enMessages.resume.careers.codecrayon.projects.shortimePlayground.title,
      enMessages.resume.careers.codecrayon.projects.subtitleSystem.title,
    ]).toEqual([
      "Commerce and Back Office",
      "WebView and Web Games",
      "AI Use and Operations Tools",
    ]);
    expect([
      jaMessages.resume.careers.codecrayon.projects.commerceBackoffice.title,
      jaMessages.resume.careers.codecrayon.projects.shortimePlayground.title,
      jaMessages.resume.careers.codecrayon.projects.subtitleSystem.title,
    ]).toEqual(["コマース・バックオフィス", "WebView・Webゲーム", "AI活用と運用ツール"]);
    expect(
      koMessages.resume.careers.codecrayon.projects.commerceBackoffice.descriptions[0]?.tasks?.[0],
    ).toContain("한국어·일본어·영어·중국어");
    expect(
      koMessages.resume.careers.codecrayon.projects.shortimePlayground.descriptions[0]?.tasks?.[1],
    ).toContain("2,000~3,000명");
    expect(
      koMessages.resume.careers.codecrayon.projects.subtitleSystem.descriptions[0]?.tasks?.[1],
    ).toContain("상품 블로그 초안 생성 프로토타입");

    expect(koMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "공통 가입 진입과 성능 개선",
    );
    expect(enMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "Subscription and Operations Systems",
    );
    expect(
      jaMessages.resume.careers.allofthem.projects.insuranceSubscription.descriptions[0]?.detail,
    ).toBe("顧客企業の流入から加入・運用までをつなぐ保険プロダクト");

    expect(koMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "외교부 영사콜센터 유지보수와 Smart-DIS ETL 개발",
    );
    expect(enMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "Consular Call Center Maintenance and Smart-DIS ETL Development",
    );
    expect(jaMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "領事コールセンター保守とSmart-DIS ETL開発",
    );
    expect(
      koMessages.resume.careers.datalogics.projects.consularCallCenter.descriptions[0]?.tasks,
    ).toHaveLength(3);
    expect(
      koMessages.resume.careers.datalogicsInfra.projects.policyCoordination.descriptions[0]?.tasks,
    ).toHaveLength(3);
    expect(
      enMessages.resume.careers.datalogicsInfra.projects.policyCoordination.descriptions[0]?.skills,
    ).toContain("L2/L3");
    expect(
      jaMessages.resume.careers.datalogicsInfra.projects.policyCoordination.descriptions[0]
        ?.tasks?.[2],
    ).toContain("児童保護専門機関");
  });

  test("지원 locale 라우트가 올바른 server-rendered 언어로 렌더링된다", async ({ page }) => {
    for (const locale of SUPPORTED_LOCALES) {
      const response = await page.request.get(`/${locale}`);

      expect(response.status()).toBeLessThan(400);
      expect(await response.text()).toContain(`<html lang="${locale}"`);

      await visit(page, `/${locale}`);
      await expectPath(page, new RegExp(`^/${escapeRegExp(locale)}(?:/)?$`));
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
    }
  });

  test("취미 검색 설명이 현재 locale로 요청되고 표시된다", async ({ page }) => {
    const descriptions: Record<Locale, string> = {
      "ko-KR": "재료 2개 · 단계 3개",
      "en-US": "2 ingredients · 3 steps",
      "ja-JP": "材料2件 · 手順3件",
    };

    for (const locale of SUPPORTED_LOCALES) {
      const title = `Hobby fixture ${locale}`;
      let requestedLocale: string | null = null;

      await page.route("**/api/hobby-search-index**", async route => {
        requestedLocale = new URL(route.request().url()).searchParams.get("locale");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: `hobby:${locale}`,
                type: "hobby",
                title,
                description: descriptions[locale],
                path: "/hobby/recipes",
                priority: 210,
              },
            ],
          }),
        });
      });

      await visit(page, `/${locale}`);
      const messages = loadMessages(locale);
      await page
        .getByRole("button", {
          name: new RegExp(`^${escapeRegExp(messages.sidebar.search)}$`),
        })
        .first()
        .click();

      await expect.poll(() => requestedLocale).toBe(locale);
      const searchInput = page.getByTestId("blog-dashboard-search-input");
      await searchInput.fill(title);
      await expect(page.getByText(descriptions[locale], { exact: true })).toBeVisible();

      await page.unroute("**/api/hobby-search-index**");
    }
  });

  test("공개 이력서에 최신 제목과 회사별 역할이 표시된다", async ({ page }) => {
    await visit(page, "/ko-KR/readme");
    await page.setViewportSize({ width: 390, height: 844 });

    await expect(
      page.getByRole("heading", {
        name: "비즈니스 가치를 만들고, 팀의 고통을 줄이는 개발자",
      }),
    ).toBeVisible();
    await expect(page.getByText("서비스 개발자")).toBeVisible();
    await expect(
      page
        .getByRole("heading", {
          name: "외교부 영사콜센터 유지보수와 Smart-DIS ETL 개발",
          exact: true,
        })
        .first(),
    ).toBeVisible();

    const descriptionSubtitle = page.getByRole("heading", {
      name: "의료·임상 분석 화면 개발",
      exact: true,
    });
    const descriptionDetail = page.getByText(
      "의료·임상 분석 제품의 화면 개발과 접근성·성능 개선, AI 개발 환경, CI/CD와 백엔드 로그 작업을 맡고 있습니다.",
      { exact: true },
    );
    const [subtitleBox, detailBox] = await Promise.all([
      descriptionSubtitle.boundingBox(),
      descriptionDetail.boundingBox(),
    ]);

    expect(subtitleBox).not.toBeNull();
    expect(detailBox).not.toBeNull();
    if (!subtitleBox || !detailBox) {
      throw new Error("이력서 소제목과 본문 위치를 확인할 수 없습니다.");
    }
    expect(detailBox.y).toBeGreaterThanOrEqual(subtitleBox.y + subtitleBox.height);
  });

  test("언어 전환 후 URL/쿠키/새로고침/루트 리다이렉트가 일치한다", async ({ page }) => {
    const { locale: currentLocale, messages: currentMessages } =
      await resolveLocaleAndMessages(page);
    const targetLocale = SUPPORTED_LOCALES.find(locale => locale !== currentLocale) as Locale;
    const targetMessages = loadMessages(targetLocale);
    const targetLabel = currentMessages.common[LANGUAGE_LABEL_KEYS[targetLocale]];

    await visit(page, `/${currentLocale}/blog`);

    const menuBar = page.locator("#menubar");
    await menuBar.getByText(currentMessages.menu.language, { exact: true }).click();
    await page.getByRole("menuitem", { name: targetLabel }).click();

    await expectPath(page, new RegExp(`^/${escapeRegExp(targetLocale)}/blog(?:/)?$`));
    await expect(menuBar.getByText(targetMessages.menu.file, { exact: true })).toBeVisible();

    const localeCookie = (await page.context().cookies()).find(
      cookie => cookie.name === "NEXT_LOCALE",
    );
    expect(localeCookie?.value).toBe(targetLocale);

    await page.reload();
    await expectPath(page, new RegExp(`^/${escapeRegExp(targetLocale)}/blog(?:/)?$`));
    await expect(menuBar.getByText(targetMessages.menu.file, { exact: true })).toBeVisible();

    const rootResponse = await page.goto("/");
    expect(rootResponse?.status()).toBeLessThan(400);
    await expectPath(page, new RegExp(`^/${escapeRegExp(targetLocale)}(?:/)?$`));
  });
});
