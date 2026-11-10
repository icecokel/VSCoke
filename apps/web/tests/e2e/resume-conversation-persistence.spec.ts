import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import en from "../../messages/en-US.json";
import ja from "../../messages/ja-JP.json";
import type { ResumeRagSource } from "@/features/resume-rag/types";
import { gotoWithRetry, mockResumeConversationStorage } from "./test-helpers";

type ChatRequest = {
  question: string;
  locale: string;
  conversationId: string;
  requestId: string;
  history?: unknown;
  resumeKey?: string;
};

for (const channel of ["main", "resume"] as const) {
  test(`${channel} 출처는 원번호로 그룹화하고 저장된 원배열로 복원한다`, async ({
    page,
  }, testInfo) => {
    const locale = channel === "main" ? "ja-JP" : "en-US";
    const messages = channel === "main" ? ja : en;
    const storage = await mockResumeConversationStorage(page);
    const base: ResumeRagSource = {
      title: "Shared source title",
      sourcePath: "fixture/source.md",
      sourceKey: "resume-detail/oprimed-medical-frontend-productization",
      version: "v1",
      excerpt: "Fixture excerpt",
      similarity: 0.8,
    };
    const publicUrl = "/ko-KR/readme?resume=pe#career_1";
    const sources: ResumeRagSource[] = [
      base,
      { ...base, title: "Unknown source", sourceKey: "private/unknown" },
      { ...base, excerpt: "Second excerpt" },
      { ...base, sourceKey: "resume-detail/commerce-backoffice-product" },
      { ...base, excerpt: "Third excerpt" },
      { ...base, title: "Unsafe source", sourceKey: "unsafe", publicUrl: "javascript:alert(1)" },
      { ...base, title: "Legacy source", sourceKey: "legacy", publicUrl },
    ];
    const raw = JSON.stringify(sources);
    const answer = "Answer cites [1], [3], [5] and a different document [4].";
    let requests = 0;
    await page.route(channel === "main" ? "**/main-chat" : "**/resume-rag/chat", async route => {
      requests += 1;
      const body = route.request().postDataJSON() as ChatRequest;
      expect(body.resumeKey).toBe(channel === "resume" ? "fe" : undefined);
      storage.conversations.get(body.conversationId)!.turns.push({
        id: randomUUID(),
        requestId: body.requestId,
        question: body.question,
        answer,
        grounded: true,
        sources,
        createdAt: new Date().toISOString(),
      });
      await route.fulfill({
        json: {
          success: true,
          data: {
            conversationId: body.conversationId,
            requestId: body.requestId,
            answer,
            grounded: true,
            sources,
          },
        },
      });
    });
    await gotoWithRetry(
      page,
      channel === "main" ? `/${locale}` : `/${locale}/resume/question?resume=fe`,
    );
    await page
      .getByRole("textbox", {
        name:
          channel === "main"
            ? messages.home.mainChat.placeholder
            : messages.resumeRag.composerLabel,
      })
      .fill("Fixture source question");
    await page
      .getByRole("button", {
        name: channel === "main" ? messages.home.mainChat.send : messages.resumeRag.submit,
        exact: true,
      })
      .click();
    const count = (
      channel === "main" ? messages.home.mainChat.sources : messages.resumeRag.sources
    ).replace("{count}", "5");
    await expect(page.getByText(count, { exact: true })).toBeVisible();
    if (channel === "main") {
      await expect(page.getByText(count, { exact: true }).locator("..")).not.toContainText(
        messages.resumeRag.similarity.replace("{score}", "80"),
      );
    }
    await expect(page.getByText("[1] [3] [5]", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Shared source title", exact: true })).toHaveCount(
      2,
    );
    await expect(page.getByRole("link", { name: "Unknown source", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Unsafe source", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Legacy source", exact: true })).toHaveAttribute(
      "href",
      publicUrl,
    );
    await expect(page.getByText(answer, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(count, { exact: true })).toBeVisible();
    await expect(page.getByText("[1] [3] [5]", { exact: true })).toBeVisible();
    expect(requests).toBe(1);
    expect(JSON.stringify(storage.conversations.values().next().value!.turns[0].sources)).toBe(raw);
    await page.getByText(count, { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`${channel}-sources.png`),
      animations: "disabled",
    });
    const sourceLink = page.getByRole("link", { name: "Shared source title", exact: true }).first();
    const path = `/${locale}/resume/oprimed-medical-frontend-productization${channel === "resume" ? "?resume=fe" : ""}`;
    await expect(sourceLink).toHaveAttribute("href", path);
    await sourceLink.click();
    await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(path);
    if (channel === "resume")
      await expect(
        page.getByRole("link", { name: messages.resume.backToResume, exact: true }),
      ).toHaveAttribute("href", `/${locale}/readme?resume=fe`);
    expect(requests).toBe(1);
  });
}

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

test("문서를 전환하면 대화 key와 복원 이력이 섞이지 않는다", async ({ page }) => {
  const storage = await mockResumeConversationStorage(page);
  const requests: ChatRequest[] = [];
  await page.route("**/resume-rag/chat", async route => {
    const body = route.request().postDataJSON() as ChatRequest;
    requests.push(body);
    const conversation = storage.conversations.get(body.conversationId)!;
    expect(body.resumeKey).toBe(conversation.resumeKey);
    const turn = {
      id: randomUUID(),
      requestId: body.requestId,
      question: body.question,
      answer: `Fixture ${body.resumeKey} answer`,
      grounded: true,
      sources: [] as [],
      createdAt: new Date().toISOString(),
    };
    conversation.turns.push(turn);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { ...turn, conversationId: body.conversationId },
      }),
    });
  });
  const ask = async (key: string) => {
    await gotoWithRetry(page, `/ko-KR/resume/question?resume=${key}`);
    const input = page.getByRole("textbox", { name: ko.resumeRag.composerLabel });
    await input.fill("프로젝트를 설명해줘");
    const submit = page.getByRole("button", { name: ko.resumeRag.submit, exact: true });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText(`Fixture ${key} answer`, { exact: true })).toBeVisible();
  };
  await ask("pe");
  await ask("fe");
  await expect(page.getByText("Fixture pe answer", { exact: true })).toHaveCount(0);
  expect(requests[0].conversationId).not.toBe(requests[1].conversationId);
  await gotoWithRetry(page, "/ko-KR/resume/question?resume=pe");
  await expect(page.getByText("Fixture pe answer", { exact: true })).toBeVisible();
  await expect(page.getByText("Fixture fe answer", { exact: true })).toHaveCount(0);
  expect(storage.restored).toContain(requests[0].conversationId);
});
