import assert from "node:assert/strict";
import test from "node:test";
import { createBlogOutline } from "./blog-outline";

test("목차는 한국어·중첩 제목의 텍스트와 계층을 유지한다", () => {
  const outline = createBlogOutline([
    { text: "  1. 개발\n 과정  ", level: 2 },
    { text: "React & TypeScript", level: 3 },
  ]);
  assert.deepEqual(outline, [
    { id: "blog-section-1-개발-과정", text: "1. 개발 과정", level: 2 },
    { id: "blog-section-react-typescript", text: "React & TypeScript", level: 3 },
  ]);
});

test("반복·구두점 제목에도 고유하고 새로고침 시 동일한 앵커를 만든다", () => {
  const headings = ["코드 예시", "코드 예시", "코드 예시-2", "!!!", "???"].map(text => ({
    text,
    level: 3,
  }));
  const outline = createBlogOutline(headings);
  assert.equal(new Set(outline.map(item => item.id)).size, headings.length);
  assert.equal(outline[1].id, "blog-section-코드-예시-2");
  assert.deepEqual(createBlogOutline(headings), outline);
});

test("빈 글은 빈 목차를 반환하고 긴 제목의 앵커 길이를 제한한다", () => {
  assert.deepEqual(createBlogOutline([]), []);
  const [item] = createBlogOutline([{ text: "긴제목".repeat(80), level: 2 }]);
  assert.ok(item.id.length < 90);
  assert.equal(item.text, "긴제목".repeat(80));
});
