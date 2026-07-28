import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalFetch = globalThis.fetch;

const loadResumeRagService = async () => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

  return import("./resume-rag-service");
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("이력 질문 응답에서 남은 횟수와 다음 1회 복구 시각을 읽는다", async () => {
  const { askResumeRag } = await loadResumeRagService();

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        answer: "답변입니다.",
        grounded: true,
        sources: [],
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": "19",
          "X-RateLimit-Reset": "1700003600",
        },
      },
    );

  const result = await askResumeRag({
    question: "어떤 프로젝트를 했어?",
    locale: "ko-KR",
  });

  assert.deepEqual((result as unknown as { rateLimit?: unknown }).rateLimit, {
    limit: 20,
    remaining: 19,
    resetAt: new Date(1_700_003_600_000),
  });
});

test("이력 질문 제한 응답에서도 남은 횟수와 다음 1회 복구 시각을 읽는다", async () => {
  const { askResumeRag, readResumeRagRateLimitFromError } = await loadResumeRagService();

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "요청 횟수를 초과했습니다." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": "1700003600",
      },
    });

  let error: unknown;

  try {
    await askResumeRag({
      question: "어떤 프로젝트를 했어?",
      locale: "ko-KR",
    });
  } catch (caught) {
    error = caught;
  }

  assert.deepEqual(readResumeRagRateLimitFromError(error), {
    limit: 20,
    remaining: 0,
    resetAt: new Date(1_700_003_600_000),
  });
});

test("한도 헤더가 불완전하면 임의의 남은 횟수를 표시하지 않는다", async () => {
  const { askResumeRag } = await loadResumeRagService();

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        answer: "답변입니다.",
        grounded: true,
        sources: [],
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "20",
        },
      },
    );

  const result = await askResumeRag({
    question: "어떤 프로젝트를 했어?",
    locale: "ko-KR",
  });

  assert.equal((result as unknown as { rateLimit?: unknown }).rateLimit, undefined);
});
