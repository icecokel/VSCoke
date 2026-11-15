import { expect, test, type Page } from "@playwright/test";
import { chatAnswerText, gotoWithRetry } from "./test-helpers";

test.skip(
  process.env.PLAYWRIGHT_PRODUCTION_SMOKE !== "1",
  "운영 smoke 실행에서만 실제 API를 호출합니다.",
);
test.setTimeout(150_000);

type ResumeChatResponse = {
  answer: string;
  grounded: boolean;
  sources: Array<{ title: string }>;
};

const askResumeQuestion = async (page: Page, locale: string, question: string) => {
  await gotoWithRetry(page, `/${locale}/resume/question`);

  const composer = page.getByTestId("resume-rag-question-composer");
  const questionInput = composer.getByRole("textbox");
  const submitButton = composer.locator('button[type="submit"]');
  await expect(page.getByTestId("resume-rag-chat-shell")).toBeVisible();
  await expect(questionInput).toBeVisible();
  await expect(submitButton).toBeDisabled();

  const responsePromise = page.waitForResponse(
    response =>
      response.request().method() === "POST" &&
      response.url() === "https://api.icecoke.kr/resume-rag/chat",
    { timeout: 130_000 },
  );

  await questionInput.fill(question);
  await submitButton.click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const { data } = (await response.json()) as { data: ResumeChatResponse };
  expect(data.answer).toEqual(expect.any(String));

  console.info(
    `RAG-G-003 locale=${locale} status=${response.status()} grounded=${data.grounded} sources=${data.sources.length}`,
  );
  return data;
};

test("이력 질문 채팅이 운영 근거 답변과 출처를 표시한다", async ({ page }) => {
  const data = await askResumeQuestion(page, "ko-KR", "Oprimed에서 어떤 업무를 했어?");
  expect(data.grounded).toBe(true);
  expect(data.sources.length).toBeGreaterThan(0);

  const chat = page.getByTestId("resume-rag-chat-scroll-region");
  // 화면은 강조·목록을 렌더하므로 원문 대신 렌더 후 텍스트와 비교한다.
  await expect(chat).toContainText(chatAnswerText(data.answer));
  await expect(chat).toContainText(data.sources[0].title);
});

// 공개 FE 이력서가 답하는 영어·일본어 질문이다. 불렛·상세 원문은 ko-KR로만 발행되므로
// 언어와 무관한 순위 기반 검색이 한국어 근거를 찾고, 답변 모델이 사용한 근거를 출처로 돌려줘야 한다.
// 오프라인 평가(rag:eval)에서 두 질문 모두 보험 가입 상세·초기 로딩 불렛을 상위 5개 안에 검색한다.
const crossLocaleQuestions = [
  {
    locale: "en-US",
    question: "How did you improve the initial load of the insurance enrollment page?",
  },
  { locale: "ja-JP", question: "保険加入ページの初期表示をどのように改善しましたか？" },
];

for (const { locale, question } of crossLocaleQuestions) {
  test(`${locale} 이력 질문이 공개 이력서 근거와 출처를 반환한다`, async ({ page }) => {
    const data = await askResumeQuestion(page, locale, question);
    expect(data.grounded).toBe(true);
    expect(data.sources.length).toBeGreaterThan(0);
  });
}
