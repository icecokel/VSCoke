import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalFetch = globalThis.fetch;
process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("레시피 조회 성공의 빈 목록과 복구 가능한 조회 실패를 구분한다", async () => {
  const { getRecipes } = await import("./recipe-service");
  for (const status of [404, 530, "network"]) {
    globalThis.fetch = async input => {
      if (String(input).endsWith("/client-errors")) return new Response(null, { status: 202 });
      if (typeof status === "string") throw new TypeError("fetch failed");
      return Response.json({ message: "Unavailable" }, { status });
    };
    assert.equal(await getRecipes(), null);
  }

  globalThis.fetch = async () => Response.json({ success: true, data: [] });
  assert.deepEqual(await getRecipes(), []);
});

test("복구 대상이 아닌 레시피 API 오류는 그대로 전달한다", async () => {
  const { getRecipes } = await import("./recipe-service");
  const { ApiError } = await import("@/lib/api-client");
  globalThis.fetch = async input => {
    if (String(input).endsWith("/client-errors")) return new Response(null, { status: 202 });
    return Response.json({ message: "Unavailable" }, { status: 503 });
  };
  await assert.rejects(getRecipes(), error => error instanceof ApiError && error.status === 503);
});
