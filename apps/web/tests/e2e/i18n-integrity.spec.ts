import { expect, test } from "@playwright/test";
import {
  escapeRegExp,
  expectPath,
  loadMessages,
  Locale,
  resolveLocaleAndMessages,
  type AppMessages,
  visit,
} from "./test-helpers";

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
  test("Wanted 베이스 이력서 핵심 문구가 양쪽 locale에 반영되어 있다", () => {
    const koMessages = loadMessages("ko-KR") as AppMessages & ResumeCopyMessages;
    const enMessages = loadMessages("en-US") as AppMessages & ResumeCopyMessages;

    expect(koMessages.resume.introduction).toEqual([
      "서비스 개발을 중심으로, 제품과 운영에 필요한 도구를 함께 만들어 왔습니다.",
      "AI 트렌드에 맞춰 LLM Wiki를 설정하고, 프로젝트별 AI 워크플로우를 업무에 맞게 세팅하고 있습니다.",
    ]);
    expect(enMessages.resume.introduction).toEqual([
      "I have focused on service development while building tools needed for products and operations.",
      "I set up LLM Wiki and configure project-specific AI workflows to fit each team's work.",
    ]);

    expect(
      koMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual(["의료·임상 분석 제품 화면과 분석 데이터", "개발 환경과 검증 시스템"]);
    expect(
      enMessages.resume.careers.oprimed.projects.medicalFrontendProductization.descriptions.map(
        description => description.subtitle,
      ),
    ).toEqual([
      "Medical and Clinical Analysis Product Screens and Analysis Data",
      "Development Environment and Verification System",
    ]);

    expect(koMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "커머스·백오피스 개발",
    );
    expect(koMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "자막 번역 관리 도구로 콘텐츠 운영 자동화",
    );
    expect(koMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "모바일 웹뷰 Playground 기획·구축",
    );
    expect(koMessages.resume.careers.codecrayon.projects.freebootingFinder.title).toBe(
      "무단 도용 콘텐츠 검색 도구",
    );
    expect(enMessages.resume.careers.codecrayon.projects.commerceBackoffice.title).toBe(
      "Commerce and Back-office Development",
    );
    expect(enMessages.resume.careers.codecrayon.projects.subtitleSystem.title).toBe(
      "Content Operations Automation with a Subtitle Translation Management Tool",
    );
    expect(enMessages.resume.careers.codecrayon.projects.shortimePlayground.title).toBe(
      "Mobile WebView Playground Planning and Implementation",
    );
    expect(enMessages.resume.careers.codecrayon.projects.freebootingFinder.title).toBe(
      "Unauthorized Content Search Tool",
    );

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
  });

  test("언어 전환 후 URL/쿠키/새로고침/루트 리다이렉트가 일치한다", async ({ page }) => {
    const { locale: currentLocale, messages: currentMessages } =
      await resolveLocaleAndMessages(page);
    const targetLocale: Locale = currentLocale === "ko-KR" ? "en-US" : "ko-KR";
    const targetMessages = loadMessages(targetLocale);
    const targetLabel =
      targetLocale === "en-US" ? currentMessages.common.english : currentMessages.common.korean;

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
