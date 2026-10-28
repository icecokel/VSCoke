import assert from "node:assert/strict";
import { test } from "node:test";
import { startResumeFixture } from "./playwright-resume-fixture.mjs";

test("이력서 fixture는 언어와 상세 조회를 제공하고 없는 경로는 404를 반환한다", async () => {
  const { server, url } = await startResumeFixture();
  try {
    for (const locale of ["ko-KR", "en-US", "ja-JP"]) {
      const response = await fetch(`${url}/resume?locale=${locale}`);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).data.locale, locale);
    }
    const summaries = (await (await fetch(`${url}/resume/details`)).json()).data;
    assert.ok(summaries.length > 0);
    assert.equal("content" in summaries[0], false);
    const detail = await (await fetch(`${url}/resume/details/${summaries[0].slug}`)).json();
    assert.ok(detail.data.content);
    assert.equal((await fetch(`${url}/resume/details/not-found`)).status, 404);
  } finally {
    server.close();
  }
});

test("fixture는 독립 문서 선택·metadata·snapshot 묶음과 명시 key 404를 제공한다", async () => {
  const { server, url } = await startResumeFixture();
  try {
    const read = async (path: string) => (await (await fetch(`${url}${path}`)).json()).data;
    const pe = await read("/resume?locale=ko-KR");
    const fe = await read("/resume?locale=ko-KR&resume=fe");
    assert.equal(pe.key, "pe");
    assert.equal(fe.key, "fe");
    assert.notEqual(pe.documentId, fe.documentId);
    const bundle = await read("/resume/preview?locale=ko-KR&resume=fe");
    assert.deepEqual(bundle.document, fe);
    assert.ok(
      bundle.details.every((detail: { content: unknown }) => typeof detail.content === "string"),
    );
    const slug = bundle.details[0].slug;
    await fetch(
      `${url}/__test__/resume-detail-availability?${new URLSearchParams({ slug, available: "false" })}`,
      { method: "POST" },
    );
    assert.equal((await fetch(`${url}/resume/preview?resume=fe`)).status, 503);
    assert.equal((await fetch(`${url}/resume/details/${slug}`)).status, 404);
    assert.equal((await fetch(`${url}/resume?resume=fe`)).status, 200);
    await fetch(
      `${url}/__test__/resume-detail-availability?${new URLSearchParams({ slug, available: "true" })}`,
      { method: "POST" },
    );
    await fetch(`${url}/__test__/resume-version?resume=fe`, { method: "POST" });
    assert.equal((await read("/resume?resume=fe")).versionName, "v2");
    assert.equal((await read("/resume")).versionName, "v1");
    for (const query of [
      "resume=missing",
      "resume=",
      "resume=private",
      "resume=no-current",
      "resume=ko-only&locale=en-US",
    ]) {
      assert.equal((await fetch(`${url}/resume?${query}`)).status, 404);
      assert.equal((await fetch(`${url}/resume/preview?${query}`)).status, 404);
    }
  } finally {
    server.close();
  }
});
