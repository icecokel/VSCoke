import assert from "node:assert/strict";
import test from "node:test";
import { getChatSourceLink, groupChatSources } from "./chat-sources";

const source = {
  title: "Same title",
  sourceKey: "resume-detail/first-project",
  version: "v1",
  sectionPath: "Overview",
  excerpt: "Original excerpt",
  similarity: 0.8,
};

test("출처는 문서·버전·절로 묶고 원순서와 원참조 번호를 보존한다", () => {
  const sources = Object.freeze([
    Object.freeze(source),
    Object.freeze({ ...source, sourceKey: "resume-detail/second-project" }),
    Object.freeze({ ...source, excerpt: "Another excerpt", similarity: 0.6 }),
  ]);
  const raw = JSON.stringify(sources);
  const groups = groupChatSources(sources);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map(group => group.referenceNumbers),
    [[1, 3], [2]],
  );
  assert.equal(groups[0].source, sources[0]);
  assert.equal(groups[1].source, sources[1]);
  assert.equal(JSON.stringify(sources), raw);
});

test("같은 제목이라도 다른 절·버전과 명시된 빈 값은 합치지 않는다", () => {
  const groups = groupChatSources([
    source,
    { ...source, version: "v2" },
    { ...source, sectionPath: "Details" },
    { ...source, version: undefined, sectionPath: undefined },
    { ...source, version: "", sectionPath: "" },
  ]);
  assert.equal(groups.length, 5);
  assert.deepEqual(
    groups.map(group => group.referenceNumbers),
    [[1], [2], [3], [4], [5]],
  );
  assert.deepEqual(groupChatSources([]), []);
});

test("알려진 경력 출처만 공개 경로로 만들고 전달된 문서 선택을 유지한다", () => {
  assert.deepEqual(getChatSourceLink(source), { kind: "inferred", href: "/resume/first-project" });
  assert.deepEqual(getChatSourceLink(source, "fe"), {
    kind: "inferred",
    href: "/resume/first-project?resume=fe",
  });
  assert.deepEqual(getChatSourceLink(source, ""), {
    kind: "inferred",
    href: "/resume/first-project?resume=",
  });
  assert.deepEqual(getChatSourceLink(source, "nexon"), {
    kind: "inferred",
    href: "/resume/first-project?resume=nexon",
  });
});

test("모르는 출처와 잘못된 slug는 경로를 추측하지 않는다", () => {
  for (const sourceKey of [
    "private/file",
    "resume-workspace:docs/resume.md",
    "resume-detail/",
    "resume-detail/UPPER",
    "resume-detail/a_b",
    "resume-detail/a--b",
    "resume-detail/a/extra",
    "resume-detail/../a",
    "resume-detail/a?x=1",
    "resume-detail/a#section",
  ]) {
    assert.equal(getChatSourceLink({ sourceKey }), undefined);
  }
});

test("명시된 안전한 publicUrl은 locale·문서 선택·query·hash를 재작성하지 않는다", () => {
  for (const publicUrl of [
    "https://example.test/resume?resume=pe&value=%20#Section",
    "HTTP://example.test/source",
    "/ja-JP/readme?resume=pe#career_1",
    "/resume/project?resume=nexon&x=1#part",
  ]) {
    assert.deepEqual(getChatSourceLink({ ...source, publicUrl }, "fe"), {
      kind: "public",
      href: publicUrl,
    });
  }
});

test("unsafe publicUrl은 알려진 sourceKey라도 링크로 노출하지 않는다", () => {
  for (const publicUrl of [
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "ftp://example.test",
    "//example.test/path",
    "/\\example.test",
    "https://example.test/\npath",
    "../relative",
    "",
    null,
    1,
  ]) {
    assert.equal(getChatSourceLink({ ...source, publicUrl }, "fe"), undefined);
  }
});
