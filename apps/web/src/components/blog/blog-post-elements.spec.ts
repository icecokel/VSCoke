import assert from "node:assert/strict";
import test from "node:test";
import { isLegacyBlogImageUrl } from "./blog-post-elements";

test("만료된 Kakao 블로그 이미지는 로컬 안내 카드 대상으로 판별한다", () => {
  assert.equal(isLegacyBlogImageUrl("https://blog.kakaocdn.net/dna/example/image.png"), true);
  assert.equal(isLegacyBlogImageUrl("/images/blog/og-fail.png"), false);
  assert.equal(isLegacyBlogImageUrl("https://example.com/image.png"), false);
});
