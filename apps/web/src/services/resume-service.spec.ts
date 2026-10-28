import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalFetch = globalThis.fetch;
process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("이력서와 상세 목록은 응답 wrapper를 풀고 캐시 없이 요청한다", async () => {
  const { getResumeDocument, getResumeDetails, getResumeDetailBySlug } =
    await import("./resume-service");
  const requests: Array<{ url: string; cache?: RequestCache }> = [];
  const payloads = [
    { locale: "ja-JP", name: "DB name" },
    [{ slug: "project" }],
    { slug: "project", content: "DB content" },
  ];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), cache: init?.cache });
    return Response.json({ success: true, data: payloads[requests.length - 1] });
  };

  assert.deepEqual(await getResumeDocument("ja-JP"), payloads[0]);
  assert.deepEqual(await getResumeDetails(), payloads[1]);
  assert.deepEqual(await getResumeDetailBySlug("project"), payloads[2]);
  assert.deepEqual(requests, [
    { url: "https://api.example.com/resume?locale=ja-JP&resume=pe", cache: "no-store" },
    { url: "https://api.example.com/resume/details", cache: "no-store" },
    { url: "https://api.example.com/resume/details/project", cache: "no-store" },
  ]);
});

test("없는 상세만 null로 변환하고 문서 부재와 API 장애는 호출자에게 전달한다", async () => {
  const { getResumeDocument, getResumeDetails, getResumeDetailBySlug } =
    await import("./resume-service");
  const { ApiError } = await import("@/lib/api-client");
  let status = 404;
  globalThis.fetch = async input => {
    if (String(input).endsWith("/client-errors")) return new Response(null, { status: 202 });
    return Response.json({ message: "Unavailable" }, { status });
  };

  assert.equal(await getResumeDetailBySlug("missing"), null);
  await assert.rejects(
    getResumeDocument("ko-KR"),
    (error: unknown) => error instanceof ApiError && error.status === 404,
  );
  status = 400;
  await assert.rejects(
    getResumeDetailBySlug("invalid/slug"),
    (error: unknown) => error instanceof ApiError && error.status === 400,
  );
  status = 503;
  await assert.rejects(
    getResumeDetails(),
    (error: unknown) => error instanceof ApiError && error.status === 503,
  );
  await assert.rejects(
    getResumeDetailBySlug("project"),
    (error: unknown) => error instanceof ApiError && error.status === 503,
  );
});

test("선택 문서와 미리보기 묶음을 같은 key·locale로 캐시 없이 요청한다", async () => {
  const { getResumeDocument, getResumePreview } = await import("./resume-service");
  const requests: string[] = [];
  const document = { key: "fe", locale: "en-US", versionId: "version-2" };
  globalThis.fetch = async (input, init) => {
    requests.push(String(input));
    assert.equal(init?.cache, "no-store");
    return Response.json({
      success: true,
      data: requests.length === 1 ? document : { document, details: [] },
    });
  };
  assert.deepEqual(await getResumeDocument("en-US", "fe"), document);
  assert.deepEqual(await getResumePreview("en-US", "fe"), { document, details: [] });
  assert.deepEqual(requests, [
    "https://api.example.com/resume?locale=en-US&resume=fe",
    "https://api.example.com/resume/preview?locale=en-US&resume=fe",
  ]);
});

test("잘못된 명시 key는 요청하지 않고 누락 상세 bundle503은 재시도 오류로 전달한다", async () => {
  const { getResumeDocument, getResumePreview } = await import("./resume-service");
  const { ApiError } = await import("@/lib/api-client");
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return Response.json({ message: "Linked detail unavailable" }, { status: 503 });
  };
  for (const key of ["", "PE", "with space", "x".repeat(81)]) {
    await assert.rejects(
      getResumeDocument("ko-KR", key),
      error => error instanceof ApiError && error.status === 404,
    );
    await assert.rejects(
      getResumePreview("ko-KR", key),
      error => error instanceof ApiError && error.status === 404,
    );
  }
  assert.equal(requests, 0);
  await assert.rejects(
    getResumePreview("ko-KR", "fe"),
    error => error instanceof ApiError && error.status === 503,
  );
});
