import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalFetch = globalThis.fetch;
process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("API 5xx와 웹 오류 보고가 같은 요청 ID를 공유한다", async () => {
  const { ApiError, apiClient } = await import("./api-client");
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    if (String(input).endsWith("/client-errors")) {
      return new Response(null, { status: 202 });
    }

    return new Response(JSON.stringify({ message: "Server failed" }), {
      status: 503,
      headers: { "X-Request-Id": "a5fa93a9-5f91-44f0-9f6e-02e4360a1594" },
    });
  };

  await assert.rejects(apiClient.get("/wordle/word"), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.requestId, "a5fa93a9-5f91-44f0-9f6e-02e4360a1594");
    return true;
  });

  assert.equal(requests[0]?.url, "https://api.example.com/wordle/word");
  assert.match(
    String(new Headers(requests[0]?.init?.headers).get("X-Request-Id")),
    /^[0-9a-f-]{36}$/,
  );
  assert.equal(requests[1]?.url, "https://api.example.com/client-errors");
  const report = JSON.parse(String(requests[1]?.init?.body)) as {
    relatedRequestId: string;
    eventId: string;
  };
  assert.equal(report.relatedRequestId, "a5fa93a9-5f91-44f0-9f6e-02e4360a1594");
  assert.match(report.eventId, /^[0-9a-f-]{36}$/);
});
