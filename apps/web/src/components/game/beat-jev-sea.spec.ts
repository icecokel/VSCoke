import assert from "node:assert/strict";
import { test } from "node:test";
import { getSeaShotLabelKey, getSeaShotSymbol } from "./beat-jev-sea";

test("격침은 명중보다 우선해 ◆와 sunk 라벨로 표시한다", () => {
  assert.equal(getSeaShotSymbol({ hit: true, sunk: true }), "◆");
  assert.equal(getSeaShotLabelKey({ hit: true, sunk: true }), "sunk");
});

test("명중과 빗나감은 ✕·· 기호와 hit·miss 라벨로 표시한다", () => {
  assert.equal(getSeaShotSymbol({ hit: true, sunk: false }), "✕");
  assert.equal(getSeaShotLabelKey({ hit: true, sunk: false }), "hit");
  assert.equal(getSeaShotSymbol({ hit: false, sunk: false }), "·");
  assert.equal(getSeaShotLabelKey({ hit: false, sunk: false }), "miss");
});
