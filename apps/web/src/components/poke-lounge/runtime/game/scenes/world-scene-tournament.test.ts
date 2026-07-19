import assert from "node:assert/strict";
import test from "node:test";
import {
  createTournamentBracketState,
  getReadyTournamentMatches,
  recordTournamentMatchResult,
} from "@vscoke/poke-lounge-battle";
import type { TournamentStateRoomPayload } from "../network/tournament-projection";
import { createServerTournamentAnnouncementText } from "./world-scene-tournament";

function createFivePlayerProjection(): TournamentStateRoomPayload {
  const bracket = createTournamentBracketState(
    Array.from({ length: 5 }, (_, index) => ({
      playerId: `player-${index + 1}`,
      displayName: `Player ${index + 1}`,
    })),
    1,
  );

  return {
    revision: 5,
    roomCode: "ROOM01",
    roundIndex: 1,
    roomStatus: "tournament",
    roomRound: {
      index: 1,
      phase: "tournament",
      durationMs: 300_000,
      startedAtMs: 1_000,
      endsAtMs: 301_000,
    },
    participants: bracket.participants.map(participant => ({
      ...participant,
      role: "participant",
      ready: true,
      connected: true,
    })),
    tournament: {
      version: 2,
      bracket,
      activeMatchId: bracket.currentRound?.matches[0]?.matchId ?? null,
      activeMatchAuthority: "server",
      cumulativeScores: {},
    },
    ownPlayerId: "player-4",
    activeMatchTransport: "authority",
    competitionKind: "tournament-unranked",
    finalStandings: [],
    resultSync: { matchId: null, status: "idle" },
  };
}

test("5인 서버 대진 안내는 canonical bye와 현재 상대를 7줄 이내로 표시한다", () => {
  const projection = createFivePlayerProjection();
  const text = createServerTournamentAnnouncementText({
    projection,
    nowMs: 2_000,
    casualBattleAvailable: null,
  });

  assert.match(text, /서버 토너먼트 · 방 ROOM01/);
  assert.match(text, /참가 5\/6 · 준비 5\/5 · 접속 5\/5 · 관전 0/);
  assert.match(text, /현재 경기 · #4 Player 4 vs #5 Player 5/);
  assert.match(text, /내 상태 · #4 Player 4 · 상대 #5 Player 5/);
  assert.match(text, /서버 권위전 · 공개 랭킹 미반영/);
  assert.match(text, /전투 규칙 · 고정 Lv\.50 · 2마리/);
  assert.ok(text.split("\n").length <= 7);

  projection.ownPlayerId = "player-1";
  const byeText = createServerTournamentAnnouncementText({
    projection,
    nowMs: 2_000,
    casualBattleAvailable: null,
  });
  assert.match(byeText, /내 상태 · #1 Player 1 · 부전승 진출 · 다음 대진 대기/);
  assert.ok(byeText.split("\n").length <= 7);
});

test("terminal 이후에는 승자의 진출·다음 상대와 패자의 탈락 대기를 표시한다", () => {
  const winnerProjection = createFivePlayerProjection();
  const firstMatch = getReadyTournamentMatches(winnerProjection.tournament.bracket!)[0]!;
  const nextBracket = recordTournamentMatchResult(
    winnerProjection.tournament.bracket!,
    firstMatch.matchId,
    "player-5",
    { reason: "faint", completedAtMs: 3_000 },
  );
  winnerProjection.tournament.bracket = nextBracket;
  winnerProjection.tournament.activeMatchId = getReadyTournamentMatches(nextBracket)[0]!.matchId;
  winnerProjection.ownPlayerId = "player-5";

  const winnerText = createServerTournamentAnnouncementText({
    projection: winnerProjection,
    nowMs: 4_000,
    casualBattleAvailable: null,
  });
  assert.match(winnerText, /내 상태 · #5 Player 5 · 진출 · 상대 #1 Player 1/);

  winnerProjection.ownPlayerId = "player-4";
  const loserText = createServerTournamentAnnouncementText({
    projection: winnerProjection,
    nowMs: 4_000,
    casualBattleAvailable: null,
  });
  assert.match(loserText, /내 상태 · #4 Player 4 · 탈락 · 최종 순위 확정 대기/);
});

test("원격 party가 없는 casual active match는 미지원과 로그인·나가기 안내를 표시한다", () => {
  const projection = createFivePlayerProjection();
  projection.tournament.activeMatchAuthority = "casual";
  projection.activeMatchTransport = "casual";
  projection.competitionKind = "casual-unranked";

  const text = createServerTournamentAnnouncementText({
    projection,
    nowMs: 2_000,
    casualBattleAvailable: false,
  });

  assert.match(text, /원격 캐주얼전 미지원/);
  assert.match(text, /로그인 후 재참가 또는 방 나가기/);
  assert.match(text, /캐주얼전 · 공개 랭킹 미반영/);
  assert.doesNotMatch(text, /고정 Lv\.50/);
  assert.ok(text.split("\n").length <= 7);
});

test("서버 준비 단계는 서버 endsAt 기준 남은 시간을 표시한다", () => {
  const projection = createFivePlayerProjection();
  projection.roomStatus = "round-started";
  projection.roomRound.phase = "round-started";
  projection.roomRound.endsAtMs = 32_000;
  projection.tournament.bracket = null;
  projection.tournament.activeMatchId = null;
  projection.tournament.activeMatchAuthority = null;
  projection.activeMatchTransport = "awaiting-authority";
  projection.competitionKind = null;

  const text = createServerTournamentAnnouncementText({
    projection,
    nowMs: 2_000,
    casualBattleAvailable: null,
  });

  assert.match(text, /준비 중 · 00:30/);
  assert.ok(text.split("\n").length <= 7);
});
