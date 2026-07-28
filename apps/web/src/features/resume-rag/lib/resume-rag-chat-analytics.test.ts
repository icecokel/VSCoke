import assert from "node:assert/strict";
import test from "node:test";
import {
  createResumeRagChatSubmittedEvent,
  getResumeRagChatKeyword,
  trackResumeRagChatCompleted,
  trackResumeRagPageViewed,
  trackResumeRagChatSubmitted,
} from "./resume-rag-chat-analytics";

test("이력 질문은 원문 대신 허용된 분석 키워드로 변환한다", () => {
  const question = "GA4 행동 이벤트를 어떻게 적용했어?";

  assert.equal(getResumeRagChatKeyword(question), "analytics");
  assert.deepEqual(
    createResumeRagChatSubmittedEvent({
      entryPoint: "resume_question",
      locale: "ko-KR",
      question,
    }),
    {
      event: "resume_rag_chat_submitted",
      chat_entry_point: "resume_question",
      chat_locale: "ko-KR",
      chat_keyword: "analytics",
      chat_question_length: "short",
    },
  );
});

test("GTM dataLayer에는 질문 원문을 저장하지 않는다", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const dataLayer: unknown[] = [];

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dataLayer },
  });

  try {
    trackResumeRagChatSubmitted({
      entryPoint: "readme",
      locale: "en-US",
      question: "my-email@example.com can you explain the frontend work?",
    });

    assert.deepEqual(dataLayer, [
      {
        event: "resume_rag_chat_submitted",
        chat_entry_point: "readme",
        chat_locale: "en-US",
        chat_keyword: "frontend",
        chat_question_length: "medium",
      },
    ]);
  } finally {
    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("GTM이 없으면 직접 연결된 GA에도 이력서와 채팅 이벤트를 전송한다", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const gtag = (
    command: "event",
    eventName: string,
    eventParameters: Record<string, string | number>,
  ) => {
    calls.push({ command, eventName, eventParameters });
  };
  const calls: Array<{
    command: "event";
    eventName: string;
    eventParameters: Record<string, string | number>;
  }> = [];

  delete process.env.NEXT_PUBLIC_GTM_ID;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { dataLayer: [], gtag },
  });

  try {
    trackResumeRagPageViewed({ locale: "ko-KR", surface: "readme" });
    trackResumeRagChatCompleted({
      entryPoint: "resume_question",
      locale: "ko-KR",
      question: "React와 Next.js를 어떤 업무에서 활용했어?",
      grounded: true,
      sourceCount: 2,
    });

    assert.deepEqual(calls, [
      {
        command: "event",
        eventName: "resume_readme_viewed",
        eventParameters: { resume_locale: "ko-KR" },
      },
      {
        command: "event",
        eventName: "resume_rag_chat_completed",
        eventParameters: {
          chat_entry_point: "resume_question",
          chat_locale: "ko-KR",
          chat_keyword: "react_nextjs",
          chat_question_length: "short",
          chat_evidence: "grounded",
          chat_source_count: 2,
        },
      },
    ]);
  } finally {
    if (gtmId === undefined) {
      delete process.env.NEXT_PUBLIC_GTM_ID;
    } else {
      process.env.NEXT_PUBLIC_GTM_ID = gtmId;
    }

    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
