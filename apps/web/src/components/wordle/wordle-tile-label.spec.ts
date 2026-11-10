import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWordleTileLabel } from "./wordle-tile-label";

const t = (key: string, values?: { letter: string }): string =>
  values ? `${key}:${values.letter}` : key;

test("빈 타일은 빈 칸 라벨을 돌려준다", () => {
  assert.equal(resolveWordleTileLabel(undefined, undefined, t), "wordleTileEmpty");
  assert.equal(resolveWordleTileLabel("", undefined, t), "wordleTileEmpty");
});

test("입력 중인 글자는 대문자 글자와 입력 중 라벨을 돌려준다", () => {
  assert.equal(resolveWordleTileLabel("a", undefined, t), "wordleTileTyping:A");
});

test("판정된 타일은 글자와 상태 라벨을 돌려준다", () => {
  assert.equal(resolveWordleTileLabel("c", "correct", t), "wordleTileCorrect:C");
  assert.equal(resolveWordleTileLabel("r", "present", t), "wordleTilePresent:R");
  assert.equal(resolveWordleTileLabel("x", "absent", t), "wordleTileAbsent:X");
});
