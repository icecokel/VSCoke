import assert from "node:assert/strict";
import { test } from "node:test";
import { isIgnoredWordleKey } from "./wordle-key-guard";

const base = { isComposing: false, keyCode: 0, ctrlKey: false, altKey: false, metaKey: false };

test("IME 조합 중인 Enter와 글자는 무시한다", () => {
  assert.equal(isIgnoredWordleKey({ ...base, key: "Enter", isComposing: true }), true);
  assert.equal(isIgnoredWordleKey({ ...base, key: "Process", keyCode: 229 }), true);
  assert.equal(isIgnoredWordleKey({ ...base, key: "a", isComposing: true }), true);
});

test("조합이 아닌 Enter·Backspace·영문자는 게임 입력으로 받는다", () => {
  assert.equal(isIgnoredWordleKey({ ...base, key: "Enter" }), false);
  assert.equal(isIgnoredWordleKey({ ...base, key: "Backspace" }), false);
  assert.equal(isIgnoredWordleKey({ ...base, key: "q" }), false);
});

test("조합키 동반 입력과 그 밖의 키는 무시한다", () => {
  assert.equal(isIgnoredWordleKey({ ...base, key: "a", ctrlKey: true }), true);
  assert.equal(isIgnoredWordleKey({ ...base, key: "1" }), true);
  assert.equal(isIgnoredWordleKey({ ...base, key: "ㅁ" }), true);
});
