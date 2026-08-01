import assert from "node:assert/strict";
import test from "node:test";
import {
  blogPostDefinitions,
  getBlogPostDefinition,
  getRegisteredPostMetas,
} from "@/posts/blog-post-registry";

test("TSX 블로그 레지스트리는 고유한 slug와 완전한 메타데이터를 제공한다", () => {
  const metas = getRegisteredPostMetas();
  const slugs = metas.map(post => post.slug);

  assert.equal(new Set(slugs).size, slugs.length);

  for (const post of metas) {
    assert.ok(post.slug.startsWith(`${post.category}/`));
    assert.ok(post.title);
    assert.ok(post.date);
    assert.ok(post.description);
    assert.ok(post.tags.length > 0);
    assert.ok(post.readingTime);
  }
});

test("TSX 블로그 레지스트리는 slug별 포스트 모듈을 로드한다", async () => {
  const definition = getBlogPostDefinition("journal/hello-world");

  assert.ok(definition);
  const postModules = await Promise.all(
    blogPostDefinitions.map(async postDefinition => postDefinition.load()),
  );

  for (const postModule of postModules) {
    assert.equal(typeof postModule.default, "function");
  }

  assert.equal(getBlogPostDefinition("journal/not-a-real-post"), null);
  assert.equal(blogPostDefinitions.length, 42);
});
