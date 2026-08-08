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
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;

    return new Response(
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
  };

  const result = await askResumeRag({
    question: "어떤 프로젝트를 했어?",
    locale: "ko-KR",
  });

  assert.deepEqual((result as unknown as { rateLimit?: unknown }).rateLimit, {
    limit: 20,
    remaining: 19,
    resetAt: new Date(1_700_003_600_000),
  });
  assert.equal(requestedUrl, "https://api.example.com/resume-rag/chat");
  assert.equal(requestedInit?.method, "POST");
  assert.equal(new Headers(requestedInit?.headers).has("Authorization"), false);
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), {
    question: "어떤 프로젝트를 했어?",
    locale: "ko-KR",
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

test("유효하지 않은 이력 질문 제한 헤더 조합을 모두 거부한다", async () => {
  const { readResumeRagRateLimit } = await loadResumeRagService();
  const invalidHeaders = [
    { limit: "0", remaining: "0", reset: "1700003600" },
    { limit: "20", remaining: "21", reset: "1700003600" },
    { limit: "20", remaining: "-1", reset: "1700003600" },
    { limit: "20.5", remaining: "19", reset: "1700003600" },
    { limit: "20", remaining: "19", reset: "0" },
    { limit: "20", remaining: "19", reset: "not-a-number" },
  ];

  for (const headers of invalidHeaders) {
    assert.equal(
      readResumeRagRateLimit(
        new Headers({
          "X-RateLimit-Limit": headers.limit,
          "X-RateLimit-Remaining": headers.remaining,
          "X-RateLimit-Reset": headers.reset,
        }),
      ),
      undefined,
    );
  }
});

test("이력 질문 응답의 필수 필드가 잘못되면 계약 오류를 던진다", async () => {
  const { askResumeRag, ResumeRagContractError } = await loadResumeRagService();
  const invalidResponses = [
    { answer: 1, grounded: true, sources: [] },
    { answer: "답변", grounded: "true", sources: [] },
    { answer: "답변", grounded: true, sources: null },
  ];

  for (const invalidResponse of invalidResponses) {
    globalThis.fetch = async () =>
      new Response(JSON.stringify(invalidResponse), {
        headers: { "Content-Type": "application/json" },
      });

    await assert.rejects(
      askResumeRag({ question: "프로젝트를 알려줘", locale: "ko-KR" }),
      ResumeRagContractError,
    );
  }
});

test("이력 질문 네트워크 오류를 임의 답변으로 대체하지 않는다", async () => {
  const { askResumeRag } = await loadResumeRagService();
  const networkError = new TypeError("network unavailable");

  globalThis.fetch = async () => {
    throw networkError;
  };

  await assert.rejects(
    askResumeRag({ question: "기술 경험을 알려줘", locale: "ko-KR" }),
    error => error === networkError,
  );
});
