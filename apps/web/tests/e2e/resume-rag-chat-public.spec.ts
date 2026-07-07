import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:65535";

test.describe("Resume RAG public chat", () => {
  test("README에서 질문한 답변을 준비한 뒤 질문 페이지에서 바로 볼 수 있다", async ({ page }) => {
    await page.route(`${apiBaseUrl}/resume-rag/chat`, async route => {
      const request = route.request();

      expect(request.postDataJSON()).toEqual({
        question: "Oprimed에서 맡은 일을 알려줘",
        locale: "ko-KR",
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            answer: "Oprimed에서는 의료 분석 워크스페이스를 개발했습니다.",
            grounded: true,
            sources: [
              {
                title: "Oprimed 공개 이력서 최종안",
                sourcePath: "docs/oprimed-public-resume-final.md",
                sourceKey: "resume-workspace:docs/oprimed-public-resume-final.md#oprimed",
                excerpt: "의료 분석 워크스페이스 개발",
                similarity: 0.76,
              },
            ],
          },
        }),
      });
    });

    await page.goto("/ko-KR/readme");
    await page
      .getByPlaceholder("README를 보며 궁금한 점을 질문하세요.")
      .fill("Oprimed에서 맡은 일을 알려줘");
    await page.getByRole("button", { name: "답변 준비하기" }).click();

    const viewAnswerButton = page.getByRole("button", { name: "답변 보러가기" });

    await expect(viewAnswerButton).toBeVisible();

    await viewAnswerButton.click();

    await expect(page).toHaveURL(/\/ko-KR\/resume\/question\?chatId=/);
    await expect(page.getByText("Oprimed에서 맡은 일을 알려줘")).toBeVisible();
    await expect(
      page.getByText("Oprimed에서는 의료 분석 워크스페이스를 개발했습니다."),
    ).toBeVisible();
    await expect(page.getByText("Oprimed 공개 이력서 최종안")).toBeVisible();
  });

  test("비로그인 방문자도 질문 입력과 전송 버튼을 볼 수 있다", async ({ page }) => {
    await page.goto("/ko-KR/resume/question");

    const textarea = page.getByPlaceholder("이력에 대해 질문하세요.");
    const submitButton = page.getByRole("button", { name: "질문하기" });
    const suggestedQuestion = page.getByRole("button", {
      name: "Oprimed에서 어떤 업무를 했어?",
    });

    await expect(textarea).toBeVisible();
    await expect(page.getByRole("button", { name: "Google 로그인" })).toHaveCount(0);
    await expect(submitButton).toBeDisabled();
    await expect(suggestedQuestion).toBeVisible();

    await suggestedQuestion.click();

    await expect(textarea).toHaveValue("Oprimed에서 어떤 업무를 했어?");
    await expect(submitButton).toBeEnabled();
  });

  test("질문 전송은 로그인 토큰 없이 공개 API로 요청한다", async ({ page }) => {
    const capturedRequests: Array<{
      headers: Record<string, string>;
      body: unknown;
    }> = [];

    await page.route(`${apiBaseUrl}/resume-rag/chat`, async route => {
      const request = route.request();
      capturedRequests.push({
        headers: request.headers(),
        body: request.postDataJSON(),
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            answer: "Oprimed에서는 의료 분석 워크스페이스를 개발했습니다.",
            grounded: true,
            sources: [
              {
                title: "Oprimed 공개 이력서 최종안",
                sourcePath: "docs/oprimed-public-resume-final.md",
                sourceKey: "resume-workspace:docs/oprimed-public-resume-final.md#oprimed",
                excerpt: "의료 분석 워크스페이스 개발",
                similarity: 0.76,
              },
            ],
          },
        }),
      });
    });

    await page.goto("/ko-KR/resume/question");
    await page.getByPlaceholder("이력에 대해 질문하세요.").fill("Oprimed에서 어떤 업무를 했어?");
    await page.getByRole("button", { name: "질문하기" }).click();

    await expect(
      page.getByText("Oprimed에서는 의료 분석 워크스페이스를 개발했습니다."),
    ).toBeVisible();
    await expect(page.getByText("Oprimed 공개 이력서 최종안")).toBeVisible();
    await expect(page.getByText("근거 1개")).toBeVisible();
    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0]?.headers.authorization).toBeUndefined();
    expect(capturedRequests[0]?.body).toEqual({
      question: "Oprimed에서 어떤 업무를 했어?",
      locale: "ko-KR",
    });
  });

  test("질문 페이지는 API connect-src CSP를 내려준다", async ({ page }) => {
    const response = await page.goto("/ko-KR/resume/question");
    const csp = response?.headers()["content-security-policy"] ?? "";

    expect(csp).toContain("connect-src");
    expect(csp).toContain("'self'");
    expect(csp).toContain("https://api.icecoke.kr");
  });
});
