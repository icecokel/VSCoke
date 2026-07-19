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
    title: string;
    introduction: string[];
    careers: {
      oprimed: {
        role: string;
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
        role: string;
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
            descriptions: Array<{
              tasks?: string[];
            }>;
          };
          freebootingFinder: {
            title: string;
          };
        };
      };
      allofthem: {
        role: string;
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
        role: string;
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

    expect(koMessages.resume.title).toBe("서비스를 만들고, 팀의 고통을 줄이는 개발자");
    expect(enMessages.resume.title).toBe(
      "A developer who builds services and reduces the team's pain",
    );
    expect(jaMessages.resume.title).toBe("サービスを作り、チームの痛みを減らす開発者");

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
    expect(koMessages.resume.careers.oprimed.role).toBe("서비스 개발자 · 팀장");
    expect(enMessages.resume.careers.oprimed.role).toBe("Service Developer · Team Lead");
    expect(jaMessages.resume.careers.oprimed.role).toBe("サービス開発者 · チームリーダー");
    expect(
      koMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[1]?.tasks?.at(
        -1,
      ),
    ).toContain("의료·임상 용어와 화면 상태");

    expect(koMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "커머스·백오피스",
    );
    expect(koMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "운영팀의 반복 콘텐츠 업무를 웹 도구로 전환",
    );
    expect(koMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "앱 배포 주기와 분리한 모바일 WebView Playground",
    );
    expect(enMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "Commerce and Back-office",
    );
    expect(enMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "Moved Repetitive Content Operations into Web Tools",
    );
    expect(enMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "Mobile WebView Playground Decoupled from App Release Cycles",
    );
    expect(jaMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "コマース・バックオフィス",
    );
    expect(jaMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "運用チームの反復的なコンテンツ業務をWebツールへ移行",
    );
    expect(jaMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "アプリ配布サイクルから分離したモバイルWebView Playground",
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
    expect(
      koMessages.resume.careers.codecrayon.projects.commerceBackoffice.descriptions[0]?.tasks?.[3],
    ).toContain("프론트엔드 구현을 단독으로 맡고");
    expect(
      koMessages.resume.careers.codecrayon.projects.shortimePlayground.descriptions[0]?.tasks?.[1],
    ).toContain("2,500~3,000명");

    expect(koMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "고객 신호를 반영한 보험 가입 성능 전환",
    );
    expect(koMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "가입·결제와 관리자 화면",
    );
    expect(enMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "Insurance Subscription Performance Migration Driven by Customer Signals",
    );
    expect(enMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "Subscription, Payment, and Admin Screens",
    );
    expect(jaMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "顧客のシグナルを反映した保険加入パフォーマンス移行",
    );
    expect(jaMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "加入・決済と管理画面",
    );

    expect(koMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "운영 서비스 개발과 장애 대응",
    );
    expect(koMessages.resume.careers.datalogics.projects.smartDis.title).toBe(
      "데이터 마이그레이션과 실행 환경 전환",
    );
    expect(enMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "Live Service Development and Incident Response",
    );
    expect(enMessages.resume.careers.datalogics.projects.smartDis.title).toBe(
      "Data Migration and Runtime Environment Transition",
    );
    expect(jaMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "運用サービスの開発と障害対応",
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

  test("공개 이력서에 Wanted 제목과 회사별 역할이 표시된다", async ({ page }) => {
    await visit(page, "/ko-KR/readme");

    await expect(
      page.getByRole("heading", { name: "서비스를 만들고, 팀의 고통을 줄이는 개발자" }),
    ).toBeVisible();
    await expect(page.getByText("서비스 개발자 · 팀장")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "운영 서비스 개발과 장애 대응", exact: true }),
    ).toBeVisible();
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
