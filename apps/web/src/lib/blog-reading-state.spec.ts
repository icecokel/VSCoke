import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeBlogReadingRestore,
  getBlogDocumentKey,
  readBlogReadingProgress,
  requestBlogReadingRestore,
  saveBlogReadingProgress,
} from "./blog-reading-state";

const article = "/blog/journal/user-flow-logging-429-investigation";

test("읽기 키는 locale·hash를 제외하고 문서·variant를 구분한다", () => {
  assert.equal(getBlogDocumentKey(`/ko-KR${article}?resume=pe#heading`), `${article}?resume=pe`);
  assert.equal(getBlogDocumentKey(`/en-US${article}?resume=pe`), `${article}?resume=pe`);
  assert.notEqual(getBlogDocumentKey(`${article}?resume=fe`), `${article}?resume=pe`);
  assert.notEqual(getBlogDocumentKey("/blog/dev/other"), article);
  assert.equal(getBlogDocumentKey(`${article}?utm_source=test`), article);
  assert.equal(
    getBlogDocumentKey(`${article}?utm_source=test&resume=pe&utm_campaign=reading`),
    `${article}?resume=pe`,
  );
  for (const path of ["/readme", "/blog/dashboard", "//example.com/blog/dev/other"]) {
    assert.equal(getBlogDocumentKey(path), null);
  }
});

test("복원 대상은 한 번만 소비하고 문서별 위치와 손상된 값을 구분한다", () => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  try {
    saveBlogReadingProgress(article, 0.3);
    assert.equal(readBlogReadingProgress(article), 0.3);
    assert.equal(readBlogReadingProgress(`${article}?resume=fe`), 0);
    requestBlogReadingRestore(`/ja-JP${article}`);
    assert.equal(consumeBlogReadingRestore(article), true);
    assert.equal(consumeBlogReadingRestore(article), false);
    requestBlogReadingRestore(article);
    assert.equal(consumeBlogReadingRestore("/blog/dev/other"), false);
    assert.equal(consumeBlogReadingRestore(article), false);
    for (const invalid of [NaN, Infinity, -1, 2]) {
      saveBlogReadingProgress(article, invalid);
      assert.equal(readBlogReadingProgress(article), 0);
    }
  } finally {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});

test("sessionStorage 접근이 차단되면 예외 없이 기본 위치를 사용한다", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get: () => {
      throw new Error("차단된 저장소");
    },
  });
  try {
    assert.doesNotThrow(() => requestBlogReadingRestore(article));
    assert.doesNotThrow(() => saveBlogReadingProgress(article, 0.3));
    assert.equal(consumeBlogReadingRestore(article), false);
    assert.equal(readBlogReadingProgress(article), 0);
  } finally {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
