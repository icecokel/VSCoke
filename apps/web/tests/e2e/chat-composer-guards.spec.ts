import { randomUUID } from "node:crypto";
import { expect, test, type Page, type Route } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import { gotoWithRetry, mockResumeConversationStorage } from "./test-helpers";

type MockStorage = Awaited<ReturnType<typeof mockResumeConversationStorage>>;

const channels = {
  main: {
    path: "/ko-KR",
    route: "**/main-chat",
    textbox: ko.home.mainChat.placeholder,
    submit: ko.home.mainChat.send,
    limit: 30,
  },
  resume: {
    path: "/ko-KR/resume/question",
    route: "**/resume-rag/chat",
    textbox: ko.resumeRag.composerLabel,
    submit: ko.resumeRag.submit,
    limit: 20,
  },
} as const;

const rateLimitHeaders = (route: Route, limit: number, remaining: number) => ({
  "Access-Control-Allow-Origin": route.request().headers().origin ?? "http://127.0.0.1",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
  "X-RateLimit-Limit": String(limit),
  "X-RateLimit-Remaining": String(remaining),
  "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 3600),
});

const answerWithTurn = async (
  route: Route,
  storage: MockStorage,
  { limit, remaining }: { limit: number; remaining: number },
) => {
  const body = route.request().postDataJSON() as {
    conversationId: string;
    requestId: string;
    question: string;
  };
  const turn = {
    id: randomUUID(),
    requestId: body.requestId,
    question: body.question,
    answer: "질문 횟수 확인용 답변",
    grounded: true,
    sources: [],
    createdAt: new Date().toISOString(),
  };
  storage.conversations.get(body.conversationId)?.turns.push(turn);
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: rateLimitHeaders(route, limit, remaining),
    body: JSON.stringify({ success: true, data: { ...turn, conversationId: body.conversationId } }),
  });
};

const getComposer = (page: Page, channel: keyof typeof channels) =>
  page.getByRole("textbox", { name: channels[channel].textbox });

for (const channel of ["main", "resume"] as const) {
  const config = channels[channel];

  test(`${channel} 채팅은 1,000자를 넘는 질문을 보내지 않는다`, async ({ page }) => {
    await mockResumeConversationStorage(page);
    let requests = 0;
    await page.route(config.route, async route => {
      requests += 1;
      await route.abort();
    });

    await gotoWithRetry(page, config.path);
    const composer = getComposer(page, channel);
    await composer.fill("가".repeat(1001));

    await expect(composer).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText("질문은 1,000자까지 보낼 수 있습니다. 지금 1,001자입니다."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: config.submit, exact: true })).toBeDisabled();

    await composer.press("Enter");
    await expect(composer).toHaveValue("가".repeat(1001));
    expect(requests).toBe(0);

    await composer.fill("가".repeat(1000));
    await expect(composer).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("1,000 / 1,000자")).toBeVisible();
    await expect(page.getByRole("button", { name: config.submit, exact: true })).toBeEnabled();
  });

  test(`${channel} 채팅은 Enter로 보내고 Shift+Enter로 줄을 바꾼다`, async ({ page }) => {
    const storage = await mockResumeConversationStorage(page);
    const questions: string[] = [];
    await page.route(config.route, async route => {
      questions.push((route.request().postDataJSON() as { question: string }).question);
      await answerWithTurn(route, storage, { limit: config.limit, remaining: config.limit - 3 });
    });

    await gotoWithRetry(page, config.path);
    await expect(page.getByText(ko.chatComposer.keyHint)).toBeVisible();

    const composer = getComposer(page, channel);
    await composer.fill("첫 줄");
    await composer.press("Shift+Enter");
    await composer.pressSequentially("둘째 줄");
    await expect(composer).toHaveValue("첫 줄\n둘째 줄");
    expect(questions).toHaveLength(0);

    await composer.press("Enter");
    await expect(page.getByText("질문 횟수 확인용 답변")).toBeVisible();
    expect(questions).toEqual(["첫 줄\n둘째 줄"]);
    await expect(composer).toHaveValue("");

    // 남은 횟수가 있으면 복구 시각 없이 남은 횟수만 보여주고, 새로고침 뒤에도 유지한다.
    const remainingText = `남은 질문 ${config.limit - 3}회`;
    await expect(page.getByText(remainingText, { exact: true })).toBeVisible();
    await expect(page.getByText(/다음 1회 복구/)).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("질문 횟수 확인용 답변")).toBeVisible();
    await expect(page.getByText(remainingText, { exact: true })).toBeVisible();
  });
}

test("resume 채팅은 질문 형식 오류에 다시 시도 없이 안내하고 질문을 되돌린다", async ({ page }) => {
  await mockResumeConversationStorage(page);
  await page.route(channels.resume.route, async route => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        message: ["question must be shorter than or equal to 1000 characters"],
      }),
    });
  });

  await gotoWithRetry(page, channels.resume.path);
  const composer = getComposer(page, "resume");
  await composer.fill("형식 오류를 확인할 질문");
  await composer.press("Enter");

  const alert = page.getByRole("alert").filter({ hasText: "질문을 보낼 수 없습니다" });
  await expect(alert).toContainText("질문 횟수는 차감되지 않았습니다.");
  await expect(alert.getByRole("button", { name: "다시 시도" })).toHaveCount(0);
  await expect(composer).toHaveValue("형식 오류를 확인할 질문");
});

test("main 채팅은 실패한 질문을 입력창에 되돌린다", async ({ page }) => {
  await mockResumeConversationStorage(page);
  await page.route(channels.main.route, async route => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: ["invalid"] }),
    });
  });

  await gotoWithRetry(page, channels.main.path);
  const composer = getComposer(page, "main");
  await composer.fill("형식 오류를 확인할 질문");
  await composer.press("Enter");

  const alert = page.getByRole("alert").filter({ hasText: "질문 횟수는 차감되지 않았습니다." });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "다시 시도" })).toHaveCount(0);
  await expect(composer).toHaveValue("형식 오류를 확인할 질문");
});

test("README 질문창도 Enter로 답변을 준비한다", async ({ page }) => {
  const storage = await mockResumeConversationStorage(page);
  let requests = 0;
  await page.route(channels.resume.route, async route => {
    requests += 1;
    await answerWithTurn(route, storage, { limit: 20, remaining: 19 });
  });

  await gotoWithRetry(page, "/ko-KR/readme");
  const composer = page.getByRole("textbox", { name: ko.resumeRag.readmeEntry.placeholder });
  await composer.fill("README에서 Enter로 보낸 질문");
  await composer.press("Enter");

  await expect(page.getByRole("button", { name: ko.resumeRag.readmeEntry.ready })).toBeVisible();
  await expect(page.getByText("남은 질문 19회", { exact: true })).toBeVisible();

  // 답변이 준비된 상태에서 다시 Enter를 눌러도 같은 질문을 또 보내지 않는다.
  await composer.press("Enter");
  expect(requests).toBe(1);
});
