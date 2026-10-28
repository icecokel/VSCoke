import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { seedSyntheticResumes } from "./playwright-synthetic-resume.mjs";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("통합 fixture는 loopback 실제 관리 API로 합성 원본·문서·상세만 등록한다", async () => {
  const requests: { path: string; method: string; payload: Record<string, unknown> | null }[] = [];
  const writeKey = "synthetic-".padEnd(64, "a");
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "http://127.0.0.1:46000");
    assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${writeKey}`);
    assert.equal(url.href.includes(writeKey), false);
    const payload = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    if (url.pathname === "/career-data" && init?.method === "PUT") {
      const core = payload as {
        facts: { evidence: { kind: string; locator: string; as_of: string }[] }[];
      };
      for (const fact of core.facts) {
        assert.ok(fact.evidence.length > 0);
        for (const evidence of fact.evidence) {
          assert.ok(
            ["code", "git", "document", "user_statement", "external_report", "inference"].includes(
              evidence.kind,
            ),
          );
          assert.equal(evidence.kind, "document");
          assert.match(evidence.locator, /^synthetic-/);
          assert.match(evidence.as_of, /^\d{4}-\d{2}-\d{2}$/);
          assert.equal(new Date(evidence.as_of).toISOString().slice(0, 10), evidence.as_of);
        }
      }
    }
    requests.push({ path: url.pathname, method: init?.method ?? "GET", payload });
    return Response.json({
      success: true,
      data: url.pathname === "/resume-management/resumes" ? [] : {},
    });
  };
  await seedSyntheticResumes(
    "http://127.0.0.1:46000",
    writeKey,
    "postgresql://fixture@localhost/fixture_test",
  );
  assert.equal(requests[0].method, "PUT");
  assert.equal(requests[0].path, "/career-data");
  const core = requests[0].payload as {
    experiences: { company: string }[];
    facts: { content: string }[];
  };
  assert.equal(core.experiences[0].company, "Synthetic Example Co");
  assert.match(core.facts[0].content, /^Synthetic/);
  const versions = requests.filter(request => request.path === "/resume-management/versions");
  assert.equal(versions.length, 11);
  for (const key of ["pe", "fe", "nexon"]) {
    assert.deepEqual(
      versions
        .filter(request => request.payload?.key === key)
        .map(request => request.payload?.locale),
      ["ko-KR", "en-US", "ja-JP"],
    );
  }
  assert.equal(
    versions.find(request => request.payload?.key === "private")?.payload?.visibility,
    "private",
  );
  assert.equal(
    requests.filter(request => request.path.startsWith("/resume-management/details/")).length,
    2,
  );
  assert.ok(requests.some(request => /\/career-data\/facts\/[^/]+\/publish$/.test(request.path)));
});

test("운영 URL·DB와 관리 API 실패를 fixture 성공으로 대체하지 않는다", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(null, { status: 409 });
  };
  for (const [api, database] of [
    ["https://api.example.com", "postgresql://fixture@localhost/fixture_test"],
    ["http://127.0.0.1:46000", "postgresql://fixture@localhost/production"],
  ]) {
    await assert.rejects(seedSyntheticResumes(api, "a".repeat(64), database), /disposable _test/);
  }
  assert.equal(calls, 0);
  await assert.rejects(
    seedSyntheticResumes(
      "http://127.0.0.1:46000",
      "a".repeat(64),
      "postgresql://fixture@localhost/fixture_test",
    ),
    /PUT \/career-data \(409\)/,
  );
  assert.equal(calls, 1);
});
