import { expect, test } from "@playwright/test";
import { gotoWithRetry } from "./test-helpers";

test.skip(
  process.env.PLAYWRIGHT_PRODUCTION_SMOKE !== "1",
  "운영 smoke 실행에서만 실제 API를 호출합니다.",
);
test.setTimeout(150_000);

test("이력 질문 채팅이 운영 근거 답변과 출처를 표시한다", async ({ page }) => {
  await gotoWithRetry(page, "/ko-KR/resume/question");

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

  await questionInput.fill("Oprimed에서 어떤 업무를 했어?");
  await submitButton.click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);

  const { data } = (await response.json()) as {
    data: {
      answer: string;
      grounded: boolean;
      sources: Array<{ title: string }>;
    };
  };
  expect(data.answer).toEqual(expect.any(String));
  expect(data.grounded).toBe(true);
  expect(data.sources.length).toBeGreaterThan(0);

  const chat = page.getByTestId("resume-rag-chat-scroll-region");
  await expect(chat).toContainText(data.answer);
  await expect(chat).toContainText(data.sources[0].title);

  console.info(
    "RAG-G-003 locale=ko-KR status=" +
      response.status() +
      " grounded=" +
      data.grounded +
      " sources=" +
      data.sources.length,
  );
});
