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

// 공개 FE 이력서가 답하는 질문이지만 현재 운영 검색에서는 근거 없음으로 끝난다.
// 키워드 관문이 영어·일본어 질문의 토큰을 만들지 못하고, locale 필터가 ko-KR 불렛 원문을 제외한다.
// 관문·절대 기준을 순위 기반 검색으로 바꾸고 locale 필터를 제거해 배포하면 이 검사가 통과하므로,
// test.fail()이 "통과했지만 실패 예상" 오류로 알린다. 그때 test.fail() 호출을 지운다.
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
    // 상태·응답 형식 오류는 실제 실패로 남기고 근거 판정만 알려진 실패로 표시한다.
    test.fail(true, "locale 필터와 키워드 관문 때문에 현재는 근거 없음 응답이 반환된다.");
    expect(data.grounded).toBe(true);
    expect(data.sources.length).toBeGreaterThan(0);
  });
}
