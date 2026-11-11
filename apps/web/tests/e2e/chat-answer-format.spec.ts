import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import { gotoWithRetry, mockResumeConversationStorage } from "./test-helpers";

for (const channel of ["main", "resume"] as const) {
  test(`${channel} 답변의 강조와 목록은 안전하게 표시되고 원문으로 복원된다`, async ({ page }) => {
    const storage = await mockResumeConversationStorage(page);
    const question = "**평문 질문** [1]";
    const htmlText =
      '<script>window.chatAnswerExecuted=true</script><img src=x onerror="window.chatAnswerExecuted=true">';
    const linkText = "[unsafe](javascript:alert(1)) https://example.test";
    const literalText =
      "`**literal**` https://example.test/**literal** [**literal**](https://example.test)";
    const fencedText = "```text\n- literal\n\n1. literal\n**literal**\n```";
    const headingText = "# **제목 원문**";
    const answer = `**핵심 답변** [1]\n줄바꿈 유지\n\n- **첫 항목**\n* 둘째 항목\n• 셋째 항목\n\n3. 번호 셋\n4. 번호 넷\n\n${htmlText}\n${linkText}\n${literalText}\n\n${fencedText}\n\n${headingText}\n비용 < 5 이면 **저렴**\n\n**작성 중`;
    let requests = 0;
    await page.route(channel === "main" ? "**/main-chat" : "**/resume-rag/chat", async route => {
      requests += 1;
      const body = route.request().postDataJSON() as {
        conversationId: string;
        requestId: string;
        question: string;
      };
      const turn = {
        id: randomUUID(),
        requestId: body.requestId,
        question: body.question,
        answer,
        grounded: true,
        sources: [],
        createdAt: new Date().toISOString(),
      };
      storage.conversations.get(body.conversationId)!.turns.push(turn);
      await route.fulfill({
        json: { success: true, data: { ...turn, conversationId: body.conversationId } },
      });
    });

    await gotoWithRetry(page, channel === "main" ? "/ko-KR" : "/ko-KR/resume/question");
    await page
      .getByRole("textbox", {
        name: channel === "main" ? ko.home.mainChat.placeholder : ko.resumeRag.composerLabel,
      })
      .fill(question);
    await page
      .getByRole("button", {
        name: channel === "main" ? ko.home.mainChat.send : ko.resumeRag.submit,
        exact: true,
      })
      .click();

    const verifyAnswer = async () => {
      const heading = page.locator("strong").filter({ hasText: "핵심 답변" });
      await expect(heading).toBeVisible();
      const content = heading.locator("../..");
      await expect(content.locator("strong")).toHaveText(["핵심 답변", "첫 항목", "저렴"]);
      await expect(content.locator("ul > li")).toHaveText(["첫 항목", "둘째 항목", "셋째 항목"]);
      await expect(content.locator("ol")).toHaveAttribute("start", "3");
      await expect(content.locator("ol > li")).toHaveText(["번호 셋", "번호 넷"]);
      await expect(content).toContainText("[1]\n줄바꿈 유지");
      await expect(content).toContainText(htmlText);
      await expect(content).toContainText(linkText);
      await expect(content).toContainText(literalText);
      await expect(content).toContainText(fencedText);
      await expect(content).toContainText(headingText);
      await expect(content).toContainText("비용 < 5 이면 저렴");
      await expect(content).toContainText("**작성 중");
      await expect(content.locator("script, img, a")).toHaveCount(0);
      expect(await page.evaluate(() => Reflect.get(window, "chatAnswerExecuted"))).toBeUndefined();
      await expect(page.getByText(question, { exact: true })).toBeVisible();
      await expect(page.getByText(question, { exact: true }).locator("strong")).toHaveCount(0);
    };
    await verifyAnswer();
    await page.reload();
    await verifyAnswer();
    expect(requests).toBe(1);
    const conversation = storage.conversations.values().next().value!;
    expect(storage.restored).toContain(conversation.id);
    expect(conversation.turns[0].answer).toBe(answer);
    expect(conversation.turns[0].question).toBe(question);
  });
}
