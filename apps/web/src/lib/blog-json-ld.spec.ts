import assert from "node:assert/strict";
import test from "node:test";
import { createBlogPostJsonLd, serializeJsonLd } from "@/lib/blog-json-ld";
import type { PostMeta } from "@/types/blog";

const post: PostMeta = {
  slug: "dev/json-ld",
  category: "dev",
  title: "<script>태그도 안전한 블로그 글",
  date: "2026-07-26",
  description: "BlogPosting 구조화 데이터를 검증합니다.",
  tags: ["SEO", "JSON-LD"],
  readingTime: "1 min read",
  published: true,
};

test("블로그 JSON-LD는 canonical URL과 Article 권장 속성을 제공한다", () => {
  const canonicalUrl = "https://vscoke.vercel.app/ko-KR/blog/dev/json-ld";
  const jsonLd = createBlogPostJsonLd({ canonicalUrl, locale: "ko-KR", post });

  assert.equal(jsonLd["@type"], "BlogPosting");
  assert.equal(jsonLd["@id"], `${canonicalUrl}#blog-post`);
  assert.equal(jsonLd.mainEntityOfPage["@id"], canonicalUrl);
  assert.equal(jsonLd.url, canonicalUrl);
  assert.equal(jsonLd.datePublished, post.date);
  assert.equal(jsonLd.author[0]?.url, "https://vscoke.vercel.app/ko-KR/readme");
  assert.equal(jsonLd.articleSection, post.category);
  assert.equal(jsonLd.keywords, "SEO, JSON-LD");
  assert.equal(jsonLd.inLanguage, "ko-KR");
});

test("JSON-LD 직렬화는 script 종료 문자열을 이스케이프한다", () => {
  const jsonLd = createBlogPostJsonLd({
    canonicalUrl: "https://vscoke.vercel.app/ko-KR/blog/dev/json-ld",
    locale: "ko-KR",
    post,
  });

  assert.doesNotMatch(serializeJsonLd(jsonLd), /<script>/);
  assert.match(serializeJsonLd(jsonLd), /\\u003cscript>/);
});
