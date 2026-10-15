import { expect, test } from "@playwright/test";
import ko from "../../messages/ko-KR.json";
import { gotoWithRetry, loadMessages, mockResumeConversationStorage } from "./test-helpers";

type UsageEvent = {
  eventName: string;
  feature?: string;
  visitorId: string;
  sessionId: string;
  path: string;
};

test("화면 이동과 게임 시작을 같은 익명 방문자로 집계한다", async ({ page }) => {
  const events: UsageEvent[] = [];
  await page.route("**/usage/events", async route => {
    events.push(route.request().postDataJSON() as UsageEvent);
    await route.fulfill({ status: 202, contentType: "application/json", body: "{}" });
  });
  await gotoWithRetry(page, "/ko-KR?token=must-not-collect");
  await expect.poll(() => events.filter(event => event.eventName === "page_view").length).toBe(1);
  const first = events[0];
  expect(first.path).toBe("/ko-KR");
  expect(JSON.stringify(events)).not.toContain("must-not-collect");

  await gotoWithRetry(page, "/ko-KR/game/sky-drop");
  await expect.poll(() => events.some(event => event.path === "/ko-KR/game/sky-drop")).toBe(true);
  const messages = loadMessages("ko-KR");
  await page.getByRole("button", { name: messages.Game.start, exact: true }).click();
  await expect.poll(() => events.some(event => event.eventName === "game_started")).toBe(true);
  const start = events.find(event => event.eventName === "game_started")!;
  expect(start.feature).toBe("sky_drop");
  expect(start.visitorId).toBe(first.visitorId);
  expect(start.sessionId).toBe(first.sessionId);
});

test("집계 API 실패 중에도 페이지와 게임을 사용할 수 있다", async ({ page }) => {
  await page.route("**/usage/events", route => route.abort("failed"));
  await gotoWithRetry(page, "/ko-KR/game/sky-drop");
  await page.getByRole("button", { name: loadMessages("ko-KR").Game.start, exact: true }).click();
  await expect(page.getByTestId("sky-drop-game")).toHaveAttribute("data-state", "playing");
});

test("채팅 응답을 기다리는 동안 경로가 바뀌어도 시작 화면에 결과를 집계한다", async ({ page }) => {
  const events: UsageEvent[] = [];
  await mockResumeConversationStorage(page);
  await page.route("**/usage/events", async route => {
    events.push(route.request().postDataJSON() as UsageEvent);
    await route.fulfill({ status: 202, body: "{}" });
  });
  let release = () => {};
  const released = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route("**/main-chat", async route => {
    const body = route.request().postDataJSON() as { conversationId: string; requestId: string };
    await released;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { answer: "검증용 답변", grounded: false, sources: [], ...body },
      }),
    });
  });
  try {
    await gotoWithRetry(page, "/ko-KR");
    await page.getByRole("textbox", { name: ko.home.mainChat.placeholder }).fill("프로젝트 소개");
    const pendingRequest = page.waitForRequest(request => request.url().endsWith("/main-chat"));
    await page.getByRole("button", { name: ko.home.mainChat.send, exact: true }).click();
    await pendingRequest;
    await page.evaluate(() => window.history.pushState(null, "", "/ko-KR/game"));
    await expect.poll(() => events.some(event => event.path === "/ko-KR/game")).toBe(true);
    release();
    await expect
      .poll(
        () =>
          events.filter(event => ["chat_completed", "chat_failed"].includes(event.eventName))
            .length,
      )
      .toBe(1);
    expect(events.filter(event => event.feature === "main_chat").map(event => event.path)).toEqual([
      "/ko-KR",
      "/ko-KR",
    ]);
  } finally {
    release();
  }
});
