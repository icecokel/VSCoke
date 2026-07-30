import assert from "node:assert/strict";
import test from "node:test";
import {
  createBlogSpeechSegments,
  normalizeBlogSpeechText,
  splitBlogSpeechText,
} from "./blog-speech";

test("낭독 텍스트의 연속 공백과 줄바꿈을 정리한다", () => {
  assert.equal(normalizeBlogSpeechText("  첫 문장\n\n  다음 문장  "), "첫 문장 다음 문장");
});

test("긴 낭독 텍스트를 문장과 단어 경계에서 나눈다", () => {
  assert.deepEqual(splitBlogSpeechText("첫 번째 문장입니다. 두 번째 문장입니다.", 15), [
    "첫 번째 문장입니다.",
    "두 번째 문장입니다.",
  ]);

  assert.deepEqual(splitBlogSpeechText("abcdefghij", 4), ["abcd", "efgh", "ij"]);
});

test("제목과 설명을 본문보다 먼저 낭독하고 빈 구간은 제외한다", () => {
  assert.deepEqual(
    createBlogSpeechSegments({
      title: "블로그 제목",
      description: "글 설명",
      contentSegments: ["첫 문단", "  ", "둘째 문단"],
    }),
    ["블로그 제목", "글 설명", "첫 문단", "둘째 문단"],
  );
});
