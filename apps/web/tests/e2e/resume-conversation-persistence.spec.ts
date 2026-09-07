import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import { gotoWithRetry, mockResumeConversationStorage } from "./test-helpers";

type ChatRequest = {
  question: string;
  locale: string;
  conversationId: string;
  requestId: string;
  history?: unknown;
};

for (const channel of ["main", "resume"] as const) {
  test(`${channel} 채팅은 hydration 전에 입력과 전송을 허용하지 않는다`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(channel === "main" ? "/ko-KR" : "/ko-KR/resume/question");
      await expect(
        page.getByRole("textbox", {
          name: channel === "main" ? ko.home.mainChat.placeholder : ko.resumeRag.composerLabel,
        }),
      ).toBeDisabled();
      await expect(
        page.getByRole("button", {
          name: channel === "main" ? ko.home.mainChat.send : ko.resumeRag.submit,
          exact: true,
        }),
      ).toBeDisabled();
    } finally {
      await context.close();
    }
  });

  test(`${channel} 채팅은 맥락 식별자를 유지하고 새로고침 후 복원·삭제한다`, async ({ page }) => {
    const storage = await mockResumeConversationStorage(page);
    const requests: ChatRequest[] = [];
    const endpoint = channel === "main" ? "**/main-chat" : "**/resume-rag/chat";
    await page.route(endpoint, async route => {
      const body = route.request().postDataJSON() as ChatRequest;
      requests.push(body);
      const conversation = storage.conversations.get(body.conversationId);
      expect(conversation).toBeDefined();
      expect(route.request().headers()["x-resume-conversation-token"]).toBe(conversation!.token);
      expect(body.history).toBeUndefined();
      expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
      const answer =
        conversation!.turns.length === 0
          ? "Oprimed 프로젝트 공개 역할 설명"
          : "Oprimed 맥락을 이어받은 후속 설명";
      conversation!.turns.push({
        id: randomUUID(),
        requestId: body.requestId,
        question: body.question,
        answer,
        grounded: true,
        sources: [],
        createdAt: new Date().toISOString(),
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            answer,
            grounded: true,
            sources: [],
            conversationId: body.conversationId,
            requestId: body.requestId,
          },
        }),
      });
    });

    await gotoWithRetry(page, channel === "main" ? "/ko-KR" : "/ko-KR/resume/question");
    const input = page.getByRole("textbox", {
      name: channel === "main" ? ko.home.mainChat.placeholder : ko.resumeRag.composerLabel,
    });
    const submit = page.getByRole("button", {
      name: channel === "main" ? ko.home.mainChat.send : ko.resumeRag.submit,
      exact: true,
    });
    await input.fill("Oprimed 프로젝트를 설명해줘");
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText("Oprimed 프로젝트 공개 역할 설명", { exact: true })).toBeVisible();
    await input.fill("그 프로젝트에서 가장 어려웠던 점은?");
    await submit.click();
    await expect(
      page.getByText("Oprimed 맥락을 이어받은 후속 설명", { exact: true }),
    ).toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1].conversationId).toBe(requests[0].conversationId);
    expect(requests[1].requestId).not.toBe(requests[0].requestId);

    await page.reload();
    await expect(page.getByText("Oprimed 프로젝트 공개 역할 설명", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Oprimed 맥락을 이어받은 후속 설명", { exact: true }),
    ).toBeVisible();
    expect(storage.restored).toContain(requests[0].conversationId);
    const localValue = await page.evaluate(
      key => localStorage.getItem(key),
      `vscoke.conversation.v1.${channel}.ko-KR`,
    );
    expect(localValue).not.toContain("Oprimed");
    expect(page.url()).not.toContain("token");

    page.once("dialog", dialog => void dialog.accept());
    await page
      .getByRole("button", { name: ko.resumeRag.conversation.newConversation, exact: true })
      .click();
    await expect(page.getByText("Oprimed 프로젝트 공개 역할 설명", { exact: true })).toHaveCount(0);
    expect(storage.deleted).toEqual([requests[0].conversationId]);
    await input.fill("새 프로젝트를 설명해줘");
    await submit.click();
    await expect(page.getByText("Oprimed 프로젝트 공개 역할 설명", { exact: true })).toBeVisible();
    expect(requests[2].conversationId).not.toBe(requests[0].conversationId);
  });
}

test("저장된 대화 복원이 실패하면 맥락 없는 질문을 보내지 않는다", async ({ page }) => {
  const storage = await mockResumeConversationStorage(page);
  const id = randomUUID();
  const access = {
    id,
    token: "a".repeat(64),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
  storage.conversations.set(id, { ...access, channel: "resume", locale: "ko-KR", turns: [] });
  await page.addInitScript(
    value => localStorage.setItem("vscoke.conversation.v1.resume.ko-KR", JSON.stringify(value)),
    access,
  );
  await page.route("**/resume-rag/conversations/*", route =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Temporarily unavailable" }),
    }),
  );
  await gotoWithRetry(page, "/ko-KR/resume/question");
  await expect(page.getByText(ko.resumeRag.conversation.restoreError)).toBeVisible();
  await page.getByRole("textbox", { name: ko.resumeRag.composerLabel }).fill("그 프로젝트 성과는?");
  await expect(page.getByRole("button", { name: ko.resumeRag.submit, exact: true })).toBeDisabled();
});
