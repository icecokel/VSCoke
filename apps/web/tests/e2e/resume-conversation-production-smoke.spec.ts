import { expect, test, type Page, type Response } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import { gotoWithRetry } from "./test-helpers";

test.skip(
  process.env.PLAYWRIGHT_PRODUCTION_SMOKE !== "1",
  "운영 smoke 실행에서만 실제 대화 API와 모델을 호출합니다.",
);
// 네트워크 기록에 익명 대화 접근키가 남지 않도록 운영 테스트에서는 trace/video를 끈다.
test.use({ trace: "off", video: "off" });
test.setTimeout(300_000);

const apiUrl = "https://api.icecoke.kr";
const origin = "https://vscoke.icecoke.kr";

type Answer = {
  answer: string;
  grounded: boolean;
  sources: Array<{ title: string }>;
  conversationId: string;
  requestId: string;
};

const readAnswer = async (response: Response): Promise<Answer> => {
  expect(response.status()).toBe(200);
  const { data } = (await response.json()) as { data: Answer };
  expect(data.conversationId).toEqual(expect.any(String));
  expect(data.requestId).toEqual(expect.any(String));
  expect(data.grounded).toBe(true);
  expect(data.sources.length).toBeGreaterThan(0);
  expect(data.answer).toMatch(/Oprimed|오프리메드/i);
  return data;
};

const cleanUpConversation = async (page: Page, key: string): Promise<void> => {
  if (page.isClosed()) return;
  const raw = await page.evaluate(storageKey => localStorage.getItem(storageKey), key);
  if (!raw) return;
  const access = JSON.parse(raw) as { id: string; token: string };
  const response = await page.request.delete(`${apiUrl}/resume-rag/conversations/${access.id}`, {
    headers: { Origin: origin, "X-Resume-Conversation-Token": access.token },
  });
  expect([200, 404]).toContain(response.status());
};

for (const channel of ["main", "resume"] as const) {
  test(`${channel} 운영 채팅은 후속 질문·새로고침 복원·삭제까지 처리한다`, async ({ page }) => {
    const endpoint = channel === "main" ? "/main-chat" : "/resume-rag/chat";
    const storageKey = `vscoke.conversation.v1.${channel}.ko-KR`;
    await gotoWithRetry(page, channel === "main" ? "/ko-KR" : "/ko-KR/resume/question");

    try {
      const input = page.getByRole("textbox", {
        name: channel === "main" ? ko.home.mainChat.placeholder : ko.resumeRag.composerLabel,
      });
      const submit = page.getByRole("button", {
        name: channel === "main" ? ko.home.mainChat.send : ko.resumeRag.submit,
        exact: true,
      });
      const waitForAnswer = () =>
        page.waitForResponse(
          response =>
            response.request().method() === "POST" && response.url() === `${apiUrl}${endpoint}`,
          { timeout: 130_000 },
        );

      await input.fill("Oprimed 프로젝트를 두 문장으로 설명해줘");
      await expect(submit).toBeEnabled();
      const firstResponse = waitForAnswer();
      await submit.click();
      const first = await readAnswer(await firstResponse);
      await expect(page.getByText(first.answer, { exact: true })).toBeVisible();

      await input.fill("그 프로젝트 이름을 다시 적고, 내가 맡은 역할을 두 문장으로 정리해줘");
      const secondResponse = waitForAnswer();
      await submit.click();
      const second = await readAnswer(await secondResponse);
      expect(second.conversationId).toBe(first.conversationId);
      expect(second.requestId).not.toBe(first.requestId);
      await expect(page.getByText(second.answer, { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByText(first.answer, { exact: true })).toBeVisible();
      await expect(page.getByText(second.answer, { exact: true })).toBeVisible();
      const deletion = page.waitForResponse(
        response =>
          response.request().method() === "DELETE" &&
          response.url() === `${apiUrl}/resume-rag/conversations/${first.conversationId}`,
      );
      page.once("dialog", dialog => void dialog.accept());
      await page
        .getByRole("button", { name: ko.resumeRag.conversation.newConversation, exact: true })
        .click();
      expect((await deletion).status()).toBe(200);
      await expect(page.getByText(first.answer, { exact: true })).toHaveCount(0);
      await expect(page.getByText(second.answer, { exact: true })).toHaveCount(0);
      console.info(`${channel}: real model answers=2, persisted=true, restored=true, deleted=true`);
    } finally {
      await cleanUpConversation(page, storageKey);
    }
  });
}
