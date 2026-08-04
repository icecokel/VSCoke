import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBattleConclusion,
  resolveBattleEndPresentationFrame,
} from "./battle-end-presentation";

test("승패와 이탈 결과에 맞는 독자적인 전투 종료 결론을 선택한다", () => {
  assert.equal(
    resolveBattleConclusion({ reason: "faint", winnerPlayerId: "player" }, "player"),
    "victory",
  );
  assert.equal(
    resolveBattleConclusion({ reason: "faint", winnerPlayerId: "opponent" }, "player"),
    "defeat",
  );
  assert.equal(
    resolveBattleConclusion({ reason: "capture", winnerPlayerId: "player" }, "player"),
    "capture",
  );
  assert.equal(
    resolveBattleConclusion({ reason: "run", winnerPlayerId: "player" }, "player"),
    "escape",
  );
});

test("전투 종료 연출은 충격, 정리, 결과 배너 순으로 진행한다", () => {
  const impact = resolveBattleEndPresentationFrame(0.08, "victory");
  const resolve = resolveBattleEndPresentationFrame(0.42, "victory");
  const banner = resolveBattleEndPresentationFrame(0.9, "victory");

  assert.equal(impact.stage, "impact");
  assert.equal(resolve.stage, "resolve");
  assert.equal(banner.stage, "banner");
  assert.equal(banner.bannerText, "BATTLE CLEAR");
  assert.ok(resolve.loserAlpha < 1);
  assert.ok(banner.bannerAlpha > 0);
});

test("포획과 이탈 결론은 패배 연출처럼 대상의 알파를 낮추지 않는다", () => {
  const capture = resolveBattleEndPresentationFrame(0.54, "capture");
  const escape = resolveBattleEndPresentationFrame(0.54, "escape");

  assert.equal(capture.loserAlpha, 1);
  assert.equal(escape.loserAlpha, 1);
  assert.equal(capture.bannerText, "SIGNAL SEALED");
  assert.equal(escape.bannerText, "SAFE EXIT");
});
