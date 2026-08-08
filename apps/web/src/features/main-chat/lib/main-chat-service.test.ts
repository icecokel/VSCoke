import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalFetch = globalThis.fetch;

const loadMainChatService = async () => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

  return import("./main-chat-service");
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("인증 헤더 없이 메인 채팅 질문과 생성 타입 응답을 전달한다", async () => {
  const { askMainChat } = await loadMainChatService();
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;

    return new Response(
      JSON.stringify({
        answer: "VSCoke Hub의 메인 화면을 채팅 중심으로 개편했습니다.",
        grounded: true,
        sources: [
          {
            title: "VSCoke 프로젝트",
            sourcePath: "resume/projects.md",
            sourceKey: "vscoke-main-chat",
            sectionPath: "프로젝트/VSCoke",
            caveats: ["공개 범위만 포함"],
            excerpt: "프로젝트와 이력서를 함께 질문할 수 있습니다.",
            similarity: 0.92,
          },
        ],
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": "29",
          "X-RateLimit-Reset": "1700003600",
        },
      },
    );
  };

  const result = await askMainChat({
    question: "메인 화면 개편 프로젝트를 설명해줘",
    locale: "ko-KR",
  });

  assert.equal(requestedUrl, "https://api.example.com/main-chat");
  assert.equal(requestedInit?.method, "POST");
  assert.equal(new Headers(requestedInit?.headers).has("Authorization"), false);
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), {
    question: "메인 화면 개편 프로젝트를 설명해줘",
    locale: "ko-KR",
  });
  assert.equal(result.grounded, true);
  assert.equal(result.sources[0]?.sourceKey, "vscoke-main-chat");
  assert.deepEqual(result.rateLimit, {
    limit: 30,
    remaining: 29,
    resetAt: new Date(1_700_003_600_000),
  });
});

test("429 오류 응답의 메인 채팅 전용 제한 정보를 읽는다", async () => {
  const { askMainChat, readMainChatRateLimitFromError } = await loadMainChatService();

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "요청 횟수를 초과했습니다." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "30",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": "1700003600",
      },
    });

  let error: unknown;

  try {
    await askMainChat({ question: "경력을 알려줘", locale: "ko-KR" });
  } catch (caught) {
    error = caught;
  }

  assert.deepEqual(readMainChatRateLimitFromError(error), {
    limit: 30,
    remaining: 0,
    resetAt: new Date(1_700_003_600_000),
  });
});

test("불완전한 제한 헤더는 화면 상태에 임의 값으로 전달하지 않는다", async () => {
  const { askMainChat } = await loadMainChatService();

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        answer: "답변입니다.",
        grounded: false,
        sources: [],
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": "29",
        },
      },
    );

  const result = await askMainChat({ question: "무엇을 물어볼 수 있어?", locale: "ko-KR" });

  assert.equal(result.rateLimit, undefined);
});

test("유효하지 않은 제한 헤더 조합을 모두 거부한다", async () => {
  const { readMainChatRateLimit } = await loadMainChatService();
  const invalidHeaders = [
    { limit: "0", remaining: "0", reset: "1700003600" },
    { limit: "30", remaining: "31", reset: "1700003600" },
    { limit: "30", remaining: "-1", reset: "1700003600" },
    { limit: "30.5", remaining: "29", reset: "1700003600" },
    { limit: "30", remaining: "29", reset: "0" },
    { limit: "30", remaining: "29", reset: "not-a-number" },
  ];

  for (const headers of invalidHeaders) {
    assert.equal(
      readMainChatRateLimit(
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

test("출처 구조가 계약과 다르면 mock 답변 없이 계약 오류를 던진다", async () => {
  const { askMainChat, MainChatContractError } = await loadMainChatService();

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        answer: "임의 답변",
        grounded: true,
        sources: [{ title: "필수 필드가 부족한 출처" }],
      }),
      { headers: { "Content-Type": "application/json" } },
    );

  await assert.rejects(
    askMainChat({ question: "프로젝트를 알려줘", locale: "ko-KR" }),
    MainChatContractError,
  );
});

test("응답 최상위 필드가 계약과 다르면 모두 계약 오류를 던진다", async () => {
  const { askMainChat, MainChatContractError } = await loadMainChatService();
  const invalidResponses = [
    { answer: 1, grounded: true, sources: [] },
    { answer: "답변", grounded: "true", sources: [] },
    { answer: "답변", grounded: true, sources: null },
    {
      answer: "답변",
      grounded: true,
      sources: [
        {
          title: "출처",
          sourcePath: "resume.md",
          sourceKey: "resume",
          excerpt: "근거",
          similarity: Number.NaN,
        },
      ],
    },
  ];

  for (const invalidResponse of invalidResponses) {
    globalThis.fetch = async () =>
      new Response(JSON.stringify(invalidResponse), {
        headers: { "Content-Type": "application/json" },
      });

    await assert.rejects(
      askMainChat({ question: "프로젝트를 알려줘", locale: "ko-KR" }),
      MainChatContractError,
    );
  }
});

test("JSON이 아닌 성공 응답은 계약 오류로 좁힌다", async () => {
  const { askMainChat, MainChatContractError } = await loadMainChatService();

  globalThis.fetch = async () =>
    new Response("not-json", { headers: { "Content-Type": "text/plain" } });

  await assert.rejects(
    askMainChat({ question: "이력서를 요약해줘", locale: "ko-KR" }),
    MainChatContractError,
  );
});

test("네트워크 오류를 fixture 응답으로 대체하지 않고 그대로 전달한다", async () => {
  const { askMainChat } = await loadMainChatService();
  const networkError = new TypeError("network unavailable");

  globalThis.fetch = async () => {
    throw networkError;
  };

  await assert.rejects(
    askMainChat({ question: "기술 경험을 알려줘", locale: "ko-KR" }),
    error => error === networkError,
  );
});
