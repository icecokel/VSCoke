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
