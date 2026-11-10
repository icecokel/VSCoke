import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSkyDropMuted, resolveTrappedFocus } from "./sky-drop-preferences";

test('음소거 저장값은 "1"만 켜진 것으로 읽는다', () => {
  assert.equal(parseSkyDropMuted("1"), true);
  assert.equal(parseSkyDropMuted("0"), false);
  assert.equal(parseSkyDropMuted("true"), false);
  assert.equal(parseSkyDropMuted(null), false);
});

test("일시정지 오버레이에서 Tab은 첫·마지막 버튼 사이를 순환한다", () => {
  const first = { id: "resume" } as unknown as HTMLElement;
  const last = { id: "exit" } as unknown as HTMLElement;

  assert.equal(resolveTrappedFocus({ shiftKey: false, active: last, first, last }), first);
  assert.equal(resolveTrappedFocus({ shiftKey: true, active: first, first, last }), last);
  assert.equal(resolveTrappedFocus({ shiftKey: true, active: null, first, last }), last);
  assert.equal(resolveTrappedFocus({ shiftKey: false, active: first, first, last }), null);
  assert.equal(resolveTrappedFocus({ shiftKey: false, active: last, first: null, last }), null);
});
