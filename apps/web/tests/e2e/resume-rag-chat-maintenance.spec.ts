import { expect, test, type Locator } from "@playwright/test";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:65535";

const typeTextareaValue = async (textarea: Locator, value: string) => {
  await textarea.click();
  await textarea.pressSequentially(value);
};

test.describe("Resume RAG chat maintenance", () => {
  test("README 채팅 요청을 막고 패치 중 안내를 표시한다", async ({ page }) => {
    const capturedRequests: unknown[] = [];

    await page.route(`${apiBaseUrl}/resume-rag/chat`, async route => {
      capturedRequests.push(route.request().postDataJSON());
      await route.abort();
    });

    await page.goto("/ko-KR/readme");
    await typeTextareaValue(
      page.getByPlaceholder("README를 읽다가 궁금한 점을 질문하세요."),
      "Oprimed에서 맡은 일을 알려줘",
    );

    const patchButton = page.getByRole("button", { name: "패치 중" });

    await expect(patchButton).toHaveAttribute("data-disabled", "true");
    await patchButton.click();

    await expect(
      page.getByText("이력서 채팅 기능을 패치 중입니다. 잠시 후 다시 이용해 주세요."),
    ).toBeVisible();
    expect(capturedRequests).toHaveLength(0);
  });

  test("질문 페이지 채팅 요청을 막고 패치 중 안내를 표시한다", async ({ page }) => {
    const capturedRequests: unknown[] = [];

    await page.route(`${apiBaseUrl}/resume-rag/chat`, async route => {
      capturedRequests.push(route.request().postDataJSON());
      await route.abort();
    });

    await page.goto("/ko-KR/resume/question");
    await typeTextareaValue(
      page.getByPlaceholder("이력에 대해 질문하세요."),
      "Oprimed에서 어떤 업무를 했어?",
    );

    const patchButton = page.getByRole("button", { name: "패치 중" });

    await expect(patchButton).toHaveAttribute("data-disabled", "true");
    await patchButton.click();

    await expect(
      page.getByText("이력서 채팅 기능을 패치 중입니다. 잠시 후 다시 이용해 주세요."),
    ).toBeVisible();
    expect(capturedRequests).toHaveLength(0);
  });
});
