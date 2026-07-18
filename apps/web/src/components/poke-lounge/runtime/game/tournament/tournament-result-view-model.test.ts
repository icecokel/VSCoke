import assert from "node:assert/strict";
import test from "node:test";
import {
  createTournamentResultPanelViewModel,
  formatTournamentResultRow,
} from "./tournamentResultViewModel";

const standings = [
  {
    playerId: "player-1",
    displayName: "Player 1",
    seed: 1,
    rank: 1,
    champion: true,
    eliminatedRoundNumber: null,
  },
  {
    playerId: "player-2",
    displayName: "Player 2",
    seed: 2,
    rank: 2,
    champion: false,
    eliminatedRoundNumber: 1,
  },
];

test("최종 결과는 한국어 순위와 방 점수 및 공개 랭킹 반영 여부를 표시한다", () => {
  const panel = createTournamentResultPanelViewModel({
    roundIndex: 1,
    totalRounds: 1,
    final: true,
    standings,
    roundScores: { "player-1": 100, "player-2": 50 },
    cumulativeScores: { "player-1": 100, "player-2": 50 },
    publicRankingIncluded: true,
  });

  assert.equal(panel.title, "최종 결과");
  assert.equal(panel.nextActionLabel, "토너먼트 종료");
  assert.equal(panel.rankingLabel, "공개 랭킹 반영");
  assert.equal(formatTournamentResultRow(panel.rows[0]!), "1위 Player 1 · 이번 +100 · 방 점수 100");
  assert.equal(formatTournamentResultRow(panel.rows[1]!), "2위 Player 2 · 이번 +50 · 방 점수 50");
});

test("일반 토너먼트 결과는 공개 랭킹 미반영으로 안내한다", () => {
  const panel = createTournamentResultPanelViewModel({
    roundIndex: 2,
    totalRounds: 3,
    final: false,
    standings,
  });

  assert.equal(panel.title, "라운드 2/3 결과");
  assert.equal(panel.nextActionLabel, "다음 라운드 시작");
  assert.equal(panel.rankingLabel, "공개 랭킹 미반영");
});
