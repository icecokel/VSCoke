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

    expect(koMessages.resume.title).toBe(
      "제품 문제를 발견하고 기술 선택과 검증으로 해결하는 개발자",
    );
    expect(enMessages.resume.title).toBe(
      "A developer who identifies product problems and solves them through technology choices and validation",
    );
    expect(jaMessages.resume.title).toBe("製品課題を見つけ、技術選定と検証で解決する開発者");

    expect(koMessages.resume.introduction).toEqual([
      "사용자가 겪는 불편과 팀원의 반복 업무를 제품과 도구로 해결해 왔습니다.",
      "최근에는 개발 과정에 AI 워크플로우를 적용하고, 수동 배포를 CI/CD로 전환했습니다.",
    ]);
    expect(enMessages.resume.introduction).toEqual([
      "I have solved user pain points and teammates' repetitive work through products and tools.",
      "Recently, I have applied AI workflows to development and moved manual deployments to CI/CD.",
    ]);
    expect(jaMessages.resume.introduction).toEqual([
      "ユーザーの不便とチームメンバーの反復作業を、プロダクトとツールで解決してきました。",
      "最近は開発プロセスにAIワークフローを取り入れ、手動デプロイをCI/CDへ移行しました。",
    ]);

    expect(
      koMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual(["의료·임상 분석 제품의 연속성과 실행 제어", "마이그레이션과 팀의 실행·검증 기준"]);
    expect(
      enMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual([
      "Continuity and Execution Control for Medical and Clinical Analysis Products",
      "Migration and Team Execution/Validation Standards",
    ]);
    expect(
      jaMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual([
      "医療・臨床分析プロダクトの継続性と実行制御",
      "マイグレーションとチームの実行・検証基準",
    ]);

    expect(
      koMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[1]
        ?.detail,
    ).toContain("약 6주간 공식 팀장");
    expect(
      enMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[1]
        ?.detail,
    ).toContain("formal lead of a three-person frontend team for about six weeks");
    expect(
      jaMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[1]
        ?.detail,
    ).toContain("約6週間、正式なチームリーダー");
    expect(koMessages.resume.careers.oprimed.role).toBe("서비스 개발자");
    expect(enMessages.resume.careers.oprimed.role).toBe("Service Developer");
    expect(jaMessages.resume.careers.oprimed.role).toBe("サービス開発者");
    expect(
      koMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions[1]?.tasks?.at(
        -1,
      ),
    ).toContain("의료·임상 용어와 화면 동작");

    expect(koMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "셀렉터스 커머스와 관리자 프론트엔드",
    );
    expect(koMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "반복 콘텐츠 운영을 운영자 도구로 전환",
    );
    expect(koMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "앱 배포 주기와 분리한 모바일 WebView Playground",
    );
    expect(enMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "Sellectors Commerce and Admin Frontend",
    );
    expect(enMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "Moved Repetitive Content Operations into Operator Tools",
    );
    expect(enMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "Mobile WebView Playground Decoupled from App Release Cycles",
    );
    expect(jaMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "Sellectorsコマースと管理者向けフロントエンド",
    );
    expect(jaMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "反復的なコンテンツ運用を運用者ツールへ移行",
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
      koMessages.resume.careers.codecrayon.projects.commerceBackoffice.descriptions[0]?.tasks?.[2],
    ).toContain("프론트엔드 구현을 단독으로 맡았습니다");
    expect(
      koMessages.resume.careers.codecrayon.projects.shortimePlayground.descriptions[0]?.tasks?.[1],
    ).toContain("2,000~3,000명");

    expect(koMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "공통 가입 진입과 성능 개선",
    );
    expect(koMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "가입·운영 시스템",
    );
    expect(enMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "Shared Subscription Entry and Performance Improvement",
    );
    expect(enMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "Subscription and Operations Systems",
    );
    expect(jaMessages.resume.careers.allofthem.projects.insuranceSubscription.title).toBe(
      "共通加入導線と性能改善",
    );
    expect(jaMessages.resume.careers.allofthem.projects.insuranceResponsive.title).toBe(
      "加入・運用システム",
    );

    expect(koMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "외교부 영사콜센터 유지보수",
    );
    expect(koMessages.resume.careers.datalogics.projects.smartDis.title).toBe(
      "Smart-DIS 데이터 마이그레이션과 실행 환경 전환",
    );
    expect(enMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "Ministry of Foreign Affairs Consular Call Center Maintenance",
    );
    expect(enMessages.resume.careers.datalogics.projects.smartDis.title).toBe(
      "Smart-DIS Data Migration and Runtime Environment Transition",
    );
    expect(jaMessages.resume.careers.datalogics.projects.consularCallCenter.title).toBe(
      "外交部領事コールセンター保守",
    );
    expect(jaMessages.resume.careers.datalogics.projects.smartDis.title).toBe(
      "Smart-DISデータ移行と実行環境の切り替え",
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
      page.getByRole("heading", {
        name: "제품 문제를 발견하고 기술 선택과 검증으로 해결하는 개발자",
      }),
    ).toBeVisible();
    await expect(page.getByText("서비스 개발자")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "외교부 영사콜센터 유지보수", exact: true }),
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
