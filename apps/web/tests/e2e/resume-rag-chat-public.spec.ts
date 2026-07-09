import { expect, test, type Locator, type Page } from "@playwright/test";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:65535";

const typeTextareaValue = async (textarea: Locator, value: string) => {
  await textarea.click();
  await textarea.pressSequentially(value);
};

const getFailureAlert = (page: Page, title: string) =>
  page.getByRole("alert").filter({ hasText: title });

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
    await expect(page.getByText("README를 읽다가 궁금한 점이 있나요?")).toBeVisible();
    await typeTextareaValue(
      page.getByPlaceholder("README를 읽다가 궁금한 점을 질문하세요."),
      "Oprimed에서 맡은 일을 알려줘",
    );
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
    const capturedRequests: unknown[] = [];

    await page.route(`${apiBaseUrl}/resume-rag/chat`, async route => {
      capturedRequests.push(route.request().postDataJSON());

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            answer: "Oprimed에서는 의료 분석 워크스페이스를 개발했습니다.",
            grounded: true,
            sources: [],
          },
        }),
      });
    });

    await page.goto("/ko-KR/resume/question");

    const textarea = page.getByPlaceholder("이력에 대해 질문하세요.");
    const submitButton = page.getByRole("button", { name: "질문하기" });
    const topicButton = page.getByRole("button", { name: /직무 적합성/ });
    const suggestedQuestion = page.getByRole("button", {
      name: "프론트엔드 제품 개발 포지션에 적합한 이유를 설명해줘",
    });

    await expect(textarea).toBeVisible();
    await expect(page.getByText("이력서를 질문으로 빠르게 확인하세요")).toBeVisible();
    await expect(
      page.getByText(
        "직무 적합성, 핵심 프로젝트, 기술 역량, 일하는 방식을 질문으로 확인할 수 있습니다.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Google 로그인" })).toHaveCount(0);
    await expect(submitButton).toBeDisabled();
    await expect(topicButton).toBeVisible();

    await topicButton.click();

    await expect(suggestedQuestion).toBeVisible();
    await suggestedQuestion.click();

    await expect(textarea).toHaveValue("프론트엔드 제품 개발 포지션에 적합한 이유를 설명해줘");
    await expect(submitButton).toBeEnabled();
    expect(capturedRequests).toHaveLength(0);
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
    await typeTextareaValue(
      page.getByPlaceholder("이력에 대해 질문하세요."),
      "Oprimed에서 어떤 업무를 했어?",
    );
    await page.getByRole("button", { name: "질문하기" }).click();

    await expect(
      page.getByText("Oprimed에서는 의료 분석 워크스페이스를 개발했습니다."),
    ).toBeVisible();
    await expect(page.getByText("이력서 근거 기반")).toBeVisible();
    await expect(page.getByText("참고한 이력서 근거")).toBeVisible();
    await expect(page.getByText("Oprimed 공개 이력서 최종안")).toBeVisible();
    await expect(page.getByText("근거 1개")).toBeVisible();
    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0]?.headers.authorization).toBeUndefined();
    expect(capturedRequests[0]?.body).toEqual({
      question: "Oprimed에서 어떤 업무를 했어?",
      locale: "ko-KR",
    });
  });

  test("근거가 부족한 답변은 낮은 신뢰 상태와 빈 근거로 표시한다", async ({ page }) => {
    await page.route(`${apiBaseUrl}/resume-rag/chat`, async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            answer: "검색된 이력 근거가 부족해 답변할 수 없습니다.",
            grounded: false,
            sources: [],
          },
        }),
      });
    });

    await page.goto("/ko-KR/resume/question");
    await typeTextareaValue(
      page.getByPlaceholder("이력에 대해 질문하세요."),
      "날씨도 이력에 포함돼?",
    );
    await page.getByRole("button", { name: "질문하기" }).click();

    await expect(page.getByText("검색된 이력 근거가 부족해 답변할 수 없습니다.")).toBeVisible();
    await expect(page.getByText("근거 부족", { exact: true })).toHaveCount(2);
    await expect(page.getByText("참고한 이력서 근거")).toHaveCount(0);
  });

  test("origin 차단 오류는 재시도 버튼 없이 안내한다", async ({ page }) => {
    await page.route(`${apiBaseUrl}/resume-rag/chat`, async route => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ message: "blocked origin" }),
      });
    });

    await page.goto("/ko-KR/resume/question");
    await typeTextareaValue(
      page.getByPlaceholder("이력에 대해 질문하세요."),
      "Oprimed에서 어떤 업무를 했어?",
    );
    await page.getByRole("button", { name: "질문하기" }).click();

    const alert = getFailureAlert(page, "허용되지 않은 요청입니다");

    await expect(alert).toContainText("허용되지 않은 요청입니다");
    await expect(alert).toContainText("공식 VSCoke 운영 사이트에서 보낸 요청만 허용합니다.");
    await expect(alert.getByRole("button", { name: "다시 시도" })).toHaveCount(0);
  });

  test("rate limit 오류는 같은 질문으로 재시도할 수 있다", async ({ page }) => {
    const question = "Oprimed에서 어떤 업무를 했어?";
    const capturedBodies: unknown[] = [];
    let requestCount = 0;

    await page.route(`${apiBaseUrl}/resume-rag/chat`, async route => {
      requestCount += 1;
      capturedBodies.push(route.request().postDataJSON());

      if (requestCount === 1) {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ message: "rate limited" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            answer: "재시도 후 Oprimed 답변을 생성했습니다.",
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
    await typeTextareaValue(page.getByPlaceholder("이력에 대해 질문하세요."), question);
    await page.getByRole("button", { name: "질문하기" }).click();

    const alert = getFailureAlert(page, "요청 한도에 도달했습니다");

    await expect(alert).toContainText("요청 한도에 도달했습니다");
    await alert.getByRole("button", { name: "다시 시도" }).click();

    await expect(page.getByText("재시도 후 Oprimed 답변을 생성했습니다.")).toBeVisible();
    await expect(page.getByText(question, { exact: true })).toHaveCount(1);
    expect(capturedBodies).toEqual([
      { question, locale: "ko-KR" },
      { question, locale: "ko-KR" },
    ]);
  });

  test("API 계약 오류는 응답 형식 안내와 재시도를 제공한다", async ({ page }) => {
    await page.route(`${apiBaseUrl}/resume-rag/chat`, async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            grounded: true,
            sources: [],
          },
        }),
      });
    });

    await page.goto("/ko-KR/resume/question");
    await typeTextareaValue(
      page.getByPlaceholder("이력에 대해 질문하세요."),
      "Oprimed에서 어떤 업무를 했어?",
    );
    await page.getByRole("button", { name: "질문하기" }).click();

    const alert = getFailureAlert(page, "응답 형식이 예상과 다릅니다");

    await expect(alert).toContainText("응답 형식이 예상과 다릅니다");
    await expect(alert.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });

  test("저장된 chatId가 없거나 깨져 있으면 빈 질문 화면으로 fallback한다", async ({ page }) => {
    await page.goto("/ko-KR");
    await page.evaluate(() => {
      window.sessionStorage.setItem("vscoke.resumeRag.chat.broken-chat", "{not-json");
    });

    await page.goto("/ko-KR/resume/question?chatId=missing-chat");
    await expect(page.getByText("이력서를 질문으로 빠르게 확인하세요")).toBeVisible();
    await expect(page.getByRole("button", { name: /직무 적합성/ })).toBeVisible();

    await page.goto("/ko-KR/resume/question?chatId=broken-chat");
    await expect(page.getByText("이력서를 질문으로 빠르게 확인하세요")).toBeVisible();
    await expect(page.getByRole("button", { name: /직무 적합성/ })).toBeVisible();
  });

  test("질문 페이지는 API connect-src CSP를 내려준다", async ({ page }) => {
    const response = await page.goto("/ko-KR/resume/question");
    const csp = response?.headers()["content-security-policy"] ?? "";

    expect(csp).toContain("connect-src");
    expect(csp).toContain("'self'");
    expect(csp).toContain("https://api.icecoke.kr");
  });
});
