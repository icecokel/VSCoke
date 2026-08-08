import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@/lib/api-client";
import { MainChatContractError } from "./main-chat-service";
import { canSubmitMainChat, createInitialMainChatState, mainChatReducer } from "./main-chat-state";

const submitQuestion = (question: string, messageId = "user-1") => ({
  type: "submit" as const,
  messageId,
  question,
  submittedAt: new Date("2026-08-08T01:00:00.000Z"),
});

test("프로젝트 질문을 제출하고 근거가 있는 답변 상태로 전이한다", () => {
  const initialState = createInitialMainChatState();
  const submittingState = mainChatReducer(
    initialState,
    submitQuestion("VSCoke 프로젝트에서 맡은 역할은?"),
  );
  const answeredState = mainChatReducer(submittingState, {
    type: "resolve",
    messageId: "assistant-1",
    result: {
      answer: "메인 화면과 채팅 경험을 설계했습니다.",
      grounded: true,
      sources: [
        {
          title: "VSCoke 프로젝트",
          sourcePath: "resume/projects.md",
          sourceKey: "vscoke",
          excerpt: "메인 채팅 설계",
          similarity: 0.91,
        },
      ],
      rateLimit: {
        limit: 20,
        remaining: 19,
        resetAt: new Date("2026-08-08T02:00:00.000Z"),
      },
    },
  });

  assert.equal(initialState.status, "empty");
  assert.equal(submittingState.status, "submitting");
  assert.deepEqual(submittingState.messages[0], {
    id: "user-1",
    role: "user",
    content: "VSCoke 프로젝트에서 맡은 역할은?",
  });
  assert.equal(answeredState.status, "answered");
  assert.equal(answeredState.messages[1]?.role, "assistant");
  assert.equal(answeredState.messages[1]?.content, "메인 화면과 채팅 경험을 설계했습니다.");
  assert.equal(answeredState.rateLimit?.remaining, 19);
});

test("이력서 질문도 별도 모드 없이 같은 답변 상태로 전이한다", () => {
  const submittingState = mainChatReducer(
    createInitialMainChatState(),
    submitQuestion("프론트엔드 경력을 요약해줘"),
  );
  const answeredState = mainChatReducer(submittingState, {
    type: "resolve",
    messageId: "assistant-1",
    result: {
      answer: "프론트엔드 개발 경력이 있습니다.",
      grounded: true,
      sources: [
        {
          title: "이력서",
          sourcePath: "resume/resume.md",
          sourceKey: "resume",
          excerpt: "프론트엔드 개발자",
          similarity: 0.89,
        },
      ],
    },
  });

  assert.equal(answeredState.status, "answered");
  assert.equal(answeredState.messages.length, 2);
  assert.equal(answeredState.messages[1]?.role, "assistant");
});

test("전송 중에는 중복 사용자 메시지 제출을 차단한다", () => {
  const submittingState = mainChatReducer(
    createInitialMainChatState(),
    submitQuestion("첫 번째 질문"),
  );
  const duplicateState = mainChatReducer(submittingState, submitQuestion("두 번째 질문", "user-2"));

  assert.equal(duplicateState, submittingState);
  assert.equal(duplicateState.messages.length, 1);
  assert.equal(canSubmitMainChat(duplicateState), false);
});

test("403, 503, 계약 오류, 네트워크 오류를 사용자 실패 상태로 분류한다", () => {
  const cases = [
    { error: new ApiError(403, "forbidden"), kind: "origin-blocked", retryable: false },
    {
      error: new ApiError(503, "unavailable"),
      kind: "service-unavailable",
      retryable: true,
    },
    { error: new MainChatContractError(), kind: "contract", retryable: true },
    { error: new TypeError("network unavailable"), kind: "request", retryable: true },
  ] as const;

  for (const current of cases) {
    const submittingState = mainChatReducer(
      createInitialMainChatState(),
      submitQuestion("실패 상태를 확인할 질문"),
    );
    const failedState = mainChatReducer(submittingState, {
      type: "reject",
      error: current.error,
    });

    assert.equal(failedState.status, "failed");
    assert.equal(failedState.failure?.kind, current.kind);
    assert.equal(failedState.failure?.retryable, current.retryable);
    assert.equal(failedState.failure?.question, "실패 상태를 확인할 질문");
    assert.equal(failedState.messages.length, 1);
  }
});

test("429는 제한 상태와 복구 시각을 보존하고 복구 전 제출을 차단한다", () => {
  const submittingState = mainChatReducer(
    createInitialMainChatState(),
    submitQuestion("요청 제한을 확인할 질문"),
  );
  const rateLimitedState = mainChatReducer(submittingState, {
    type: "reject",
    error: new ApiError(429, "too many requests"),
    rateLimit: {
      limit: 20,
      remaining: 0,
      resetAt: new Date("2026-08-08T02:00:00.000Z"),
    },
  });

  assert.equal(rateLimitedState.status, "rate-limited");
  assert.equal(rateLimitedState.failure?.kind, "rate-limited");
  assert.equal(rateLimitedState.failure?.retryable, false);
  assert.equal(canSubmitMainChat(rateLimitedState, new Date("2026-08-08T01:59:59.000Z")), false);
  assert.equal(canSubmitMainChat(rateLimitedState, new Date("2026-08-08T02:00:00.000Z")), true);

  const resumedState = mainChatReducer(
    rateLimitedState,
    submitQuestion("제한 복구 후 질문", "user-2"),
  );

  assert.equal(resumedState, rateLimitedState);

  const resumedAfterResetState = mainChatReducer(rateLimitedState, {
    ...submitQuestion("제한 복구 후 질문", "user-2"),
    submittedAt: new Date("2026-08-08T02:00:00.000Z"),
  });

  assert.equal(resumedAfterResetState.status, "submitting");
  assert.equal(resumedAfterResetState.messages.length, 2);
});

test("초기 상태는 호출마다 빈 메모리 상태를 새로 만든다", () => {
  const firstState = createInitialMainChatState();
  const answeredState = mainChatReducer(
    mainChatReducer(firstState, submitQuestion("현재 페이지의 질문")),
    {
      type: "resolve",
      messageId: "assistant-1",
      result: {
        answer: "현재 페이지의 답변",
        grounded: false,
        sources: [],
      },
    },
  );
  const refreshedState = createInitialMainChatState();

  assert.equal(answeredState.messages.length, 2);
  assert.notEqual(refreshedState, firstState);
  assert.deepEqual(refreshedState, {
    status: "empty",
    messages: [],
  });
});
