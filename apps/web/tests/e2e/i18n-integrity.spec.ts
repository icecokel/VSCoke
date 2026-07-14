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

interface ResumeCopyMessages {
  resume: {
    introduction: string[];
    careers: {
      oprimed: {
        projects: {
          medicalFrontendProductization: {
            title: string;
            descriptions: Array<{
              subtitle: string;
              detail?: string;
              tasks?: string[];
            }>;
          };
        };
      };
      codecrayon: {
        projects: {
          commerceBackoffice: {
            title: string;
            descriptions: Array<{
              tasks?: string[];
            }>;
          };
          subtitleSystem: {
            title: string;
          };
          shortimePlayground: {
            title: string;
          };
          freebootingFinder: {
            title: string;
          };
        };
      };
      allofthem: {
        projects: {
          insuranceSubscription: {
            title: string;
          };
          insuranceResponsive: {
            title: string;
          };
        };
      };
      datalogics: {
        projects: {
          consularCallCenter: {
            title: string;
          };
          smartDis: {
            title: string;
          };
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

  test("Wanted 베이스 이력서 핵심 문구가 모든 locale에 반영되어 있다", () => {
    const koMessages = loadMessages("ko-KR") as AppMessages & ResumeCopyMessages;
    const enMessages = loadMessages("en-US") as AppMessages & ResumeCopyMessages;
    const jaMessages = loadMessages("ja-JP") as AppMessages & ResumeCopyMessages;

    expect(koMessages.resume.introduction).toEqual([
      "커머스와 의료·임상 분석 제품을 개발하며, 사용자가 경험하는 화면과 운영자가 일하는 도구를 함께 만들어 왔습니다.",
      "AI 활용을 개인의 생산성에 머물지 않고, 팀의 개발과 운영 방식으로 확장하고 있습니다.",
    ]);
    expect(enMessages.resume.introduction).toEqual([
      "I have developed commerce and medical and clinical analysis products, building both the screens users experience and the tools operators use.",
      "I am extending AI use beyond individual productivity into the team's development and operational practices.",
    ]);
    expect(jaMessages.resume.introduction).toEqual([
      "コマースおよび医療・臨床分析プロダクトを開発し、ユーザーが使う画面と運用者が使うツールの両方を作ってきました。",
      "AIの活用を個人の生産性にとどめず、チームの開発・運用の進め方へ広げています。",
    ]);

    expect(
      koMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual(["의료·임상 분석 제품 화면과 분석 데이터", "팀 운영과 개발·검증 기준"]);
    expect(
      enMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual([
      "Medical and Clinical Analysis Product Screens and Analysis Data",
      "Team Operations and Development and Verification Standards",
    ]);
    expect(
      jaMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual(["医療・臨床分析プロダクト画面と分析データ", "チーム運営と開発・検証基準"]);

    expect(
      koMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[1]
        ?.detail,
    ).toContain("프로젝트 컨벤션과 구현 일관성");
    expect(
      enMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[1]
        ?.detail,
    ).toContain("project conventions and implementation consistency");
    expect(
      jaMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[1]
        ?.detail,
    ).toContain("プロジェクトの規約と実装の一貫性");

    expect(koMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "커머스·백오피스",
    );
    expect(koMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "AI 자막 번역과 콘텐츠 운영 자동화",
    );
    expect(koMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "모바일 웹뷰 제품",
    );
    expect(enMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "Commerce and Back-office",
    );
    expect(enMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "AI Subtitle Translation and Content Operations Automation",
    );
    expect(enMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "Mobile WebView Product",
    );
    expect(jaMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "コマース・バックオフィス",
    );
    expect(jaMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "AI字幕翻訳とコンテンツ運用の自動化",
    );
    expect(jaMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "モバイルWebViewプロダクト",
    );

    expect(
      koMessages.resume.careers.codecrayon.projects.commerceBackoffice.descriptions[0]?.tasks?.[0],
    ).toContain("PC에서도 모바일 싱글 컬럼");
    expect(
      enMessages.resume.careers.codecrayon.projects.commerceBackoffice.descriptions[0]?.tasks?.[0],
    ).toContain("single-column layout");
    expect(
      jaMessages.resume.careers.codecrayon.projects.commerceBackoffice.descriptions[0]?.tasks?.[0],
    ).toContain("PCでもモバイルのシングルカラム");

    expect(koMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "보험 가입 웹 성능 개선",
    );
    expect(koMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "보험 가입·결제와 관리자 화면 개발",
    );
    expect(enMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "Insurance Subscription Web Performance Improvement",
    );
    expect(enMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "Insurance Subscription, Payment, and Admin Screen Development",
    );
    expect(jaMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "保険加入Webのパフォーマンス改善",
    );
    expect(jaMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "保険加入・決済と管理画面の開発",
    );

    expect(koMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "운영 중인 서비스의 유지보수, API 개발, 장애 대응",
    );
    expect(koMessages.resume.careers.datalogics.projects.smartDis.title).toBe(
      "데이터 마이그레이션과 실행 환경 전환",
    );
    expect(enMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "Maintenance, API Development, and Incident Response for a Live Service",
    );
    expect(enMessages.resume.careers.datalogics.projects.smartDis.title).toBe(
      "Data Migration and Runtime Environment Transition",
    );
    expect(jaMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "稼働中サービスの保守、API開発、障害対応",
    );
    expect(jaMessages.resume.careers.datalogics.projects.smartDis.title).toBe(
      "データ移行と実行環境の切り替え",
    );
  });

  test("지원 locale 라우트가 모두 렌더링된다", async ({ page }) => {
    for (const locale of SUPPORTED_LOCALES) {
      await visit(page, `/${locale}`);
      await expectPath(page, new RegExp(`^/${escapeRegExp(locale)}(?:/)?$`));
    }
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
