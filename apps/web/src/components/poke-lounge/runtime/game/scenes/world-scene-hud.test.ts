import assert from "node:assert/strict";
import test from "node:test";
import { getExperienceForLevel } from "../battle/experience";
import {
  formatRankScoreHud,
  getPokemonExperienceProgress,
  getPokemonHpRatio,
} from "./world-scene-hud";

test("포켓몬 HP와 현재 레벨 경험치 진행률을 상태 패널용 값으로 변환한다", () => {
  const levelStart = getExperienceForLevel(10, 0);
  const nextLevel = getExperienceForLevel(11, 0);
  const required = nextLevel - levelStart;
  const progress = getPokemonExperienceProgress({
    speciesId: 152,
    name: "치코리타",
    level: 10,
    currentHp: 15,
    maxHp: 30,
    growthRate: 0,
    experience: levelStart + Math.floor(required / 2),
  });

  assert.equal(getPokemonHpRatio({ speciesId: 152, name: "치코리타", level: 10 }), 0);
  assert.equal(
    getPokemonHpRatio({
      speciesId: 152,
      name: "치코리타",
      level: 10,
      currentHp: 15,
      maxHp: 30,
    }),
    0.5,
  );
  assert.equal(progress.required, required);
  assert.equal(progress.current, Math.floor(required / 2));
  assert.equal(progress.ratio, progress.current / required);
});

test("랭크와 점수 HUD는 솔로와 계정 기록을 구분한다", () => {
  assert.equal(formatRankScoreHud({ rank: 12, score: 345 }, "solo"), "솔로 모드\n랭킹 미반영");
  assert.equal(
    formatRankScoreHud({ rank: 12, score: 345 }, "competitive"),
    "계정 기록\n랭크 12 · 점수 345",
  );
});
