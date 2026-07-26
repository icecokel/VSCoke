import assert from "node:assert/strict";
import test from "node:test";
import { getAllPosts, getAllTags, getPostBySlug, getPostsGroupedByCategory } from "@/lib/blog";

test("블로그 포스트 메타데이터 기준선을 유지한다", () => {
  const posts = getAllPosts();
  const slugs = posts.map(post => post.slug);

  assert.equal(posts.length, 41);
  assert.equal(new Set(slugs).size, posts.length);

  for (const post of posts) {
    assert.ok(post.slug.startsWith(`${post.category}/`));
    assert.ok(post.title);
    assert.ok(post.date);
    assert.ok(post.description);
    assert.ok(post.tags.length > 0);
    assert.ok(post.readingTime);
    assert.equal(post.published, true);
  }

  for (let index = 1; index < posts.length; index += 1) {
    assert.ok(new Date(posts[index - 1].date).getTime() >= new Date(posts[index].date).getTime());
  }
});

test("블로그 카테고리와 대표 태그 집계를 유지한다", () => {
  const groups = getPostsGroupedByCategory();
  const groupCounts = Object.fromEntries(groups.map(group => [group.category, group.posts.length]));
  const tagCounts = Object.fromEntries(getAllTags().map(tag => [tag.label, tag.count]));

  assert.deepEqual(groupCounts, {
    journal: 9,
    dev: 32,
  });
  assert.equal(tagCounts.JavaScript, 8);
  assert.equal(tagCounts["Next.js"], 6);
  assert.equal(tagCounts.React, 5);
  assert.equal(tagCounts.TypeScript, 5);
});

test("대표 블로그 포스트의 메타데이터와 TSX 모듈을 읽는다", async () => {
  const post = getPostBySlug("journal/hello-world");

  assert.ok(post);
  assert.equal(post.title, "블로그를 시작하며");
  assert.equal(post.category, "journal");
  assert.equal(post.readingTime, "1 min read");
  const postModule = await post.load();
  assert.equal(typeof postModule.default, "function");
});

test("존재하지 않는 블로그 slug는 null을 반환한다", () => {
  assert.equal(getPostBySlug("journal/not-a-real-post"), null);
});
