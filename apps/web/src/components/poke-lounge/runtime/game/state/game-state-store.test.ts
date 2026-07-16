import assert from "node:assert/strict";
import test from "node:test";
import { createTournamentBracketState } from "@vscoke/poke-lounge-battle";
import type { TournamentStateRoomPayload } from "../network/tournament-projection";
import { createGameStateStore } from "./gameStateStore";

function createProjection(revision: number): TournamentStateRoomPayload {
  const bracket = createTournamentBracketState(
    Array.from({ length: 5 }, (_, index) => ({
      playerId: `player-${index + 1}`,
      displayName: `Player ${index + 1}`,
    })),
    1,
  );

  return {
    revision,
    roundIndex: 1,
    roomStatus: "tournament",
    tournament: {
      version: 2,
      bracket,
      activeMatchId: bracket.currentRound?.matches[0]?.matchId ?? null,
      activeMatchAuthority: "casual",
      cumulativeScores: {},
    },
    ownPlayerId: "player-4",
    activeMatchTransport: "casual",
    finalStandings: [],
    resultSync: { matchId: null, status: "idle" },
  };
}

function createPreparationProjection(revision: number): TournamentStateRoomPayload {
  return {
    revision,
    roundIndex: 1,
    roomStatus: "round-started",
    tournament: {
      version: 2,
      bracket: null,
      activeMatchId: null,
      activeMatchAuthority: null,
      cumulativeScores: {},
    },
    ownPlayerId: "player-1",
    activeMatchTransport: "awaiting-authority",
    finalStandings: [],
    resultSync: { matchId: null, status: "idle" },
  };
}

test("preparation snapshot은 bracket과 current match를 조기에 만들지 않는다", () => {
  const store = createGameStateStore();

  assert.deepEqual(store.applyTournamentSnapshotFromRoom(createPreparationProjection(3), 1000), {
    ok: true,
  });
  assert.equal(store.getState().round.phase, "preparation");
  assert.equal(store.getState().tournament.session, null);
  assert.equal(store.getCurrentTournamentMatch(), null);
});

test("server projection은 한 번의 notify로 session과 active match에 원자 적용된다", () => {
  const store = createGameStateStore();
  let notifyCount = 0;
  store.subscribe(() => {
    notifyCount += 1;
  });

  assert.deepEqual(store.applyTournamentSnapshotFromRoom(createProjection(7), 1000), {
    ok: true,
  });
  assert.equal(notifyCount, 1);
  assert.equal(store.getState().tournament.serverProjection?.revision, 7);
  assert.deepEqual(store.getCurrentTournamentMatch()?.participantIds, ["player-4", "player-5"]);
});

test("낮은 revision projection은 현재 bracket을 덮지 않는다", () => {
  const store = createGameStateStore();
  store.applyTournamentSnapshotFromRoom(createProjection(7), 1000);

  assert.deepEqual(store.applyTournamentSnapshotFromRoom(createProjection(6), 1100), {
    ok: false,
    reason: "stale-revision",
  });
  assert.equal(store.getState().tournament.serverProjection?.revision, 7);
});

test("같은 revision의 다른 bracket은 현재 canonical state를 덮지 않는다", () => {
  const store = createGameStateStore();
  const projection = createProjection(7);
  store.applyTournamentSnapshotFromRoom(projection, 1000);
  const divergent = structuredClone(projection);
  divergent.tournament.activeMatchId = null;
  divergent.tournament.activeMatchAuthority = null;

  assert.deepEqual(store.applyTournamentSnapshotFromRoom(divergent, 1100), {
    ok: false,
    reason: "invalid-projection",
  });
  assert.equal(
    store.getState().tournament.serverProjection?.tournament.activeMatchId,
    projection.tournament.activeMatchId,
  );
});

test("server projection이 적용된 동안 client result로 bracket을 전진시키지 않는다", () => {
  const store = createGameStateStore();
  const projection = createProjection(7);
  store.applyTournamentSnapshotFromRoom(projection, 1000);

  assert.deepEqual(
    store.recordTournamentMatchResult(
      projection.tournament.activeMatchId ?? "missing",
      "player-4",
      1200,
    ),
    {
      ok: false,
      reason: "invalid-result",
      message: "Server projection is canonical.",
    },
  );
  assert.equal(store.getState().tournament.serverProjection?.revision, 7);
});

test("완료 순위는 재접속 첫 snapshot에서도 canonical seed를 보존한다", () => {
  const store = createGameStateStore();
  const projection = createProjection(8);
  projection.finalStandings = [
    { playerId: "player-5", rank: 1, score: 300 },
    { playerId: "player-1", rank: 2, score: 250 },
    { playerId: "player-4", rank: 3, score: 200 },
    { playerId: "player-2", rank: 4, score: 150 },
    { playerId: "player-3", rank: 5, score: 100 },
  ];

  assert.deepEqual(store.applyTournamentSnapshotFromRoom(projection, 1000), { ok: true });
  assert.deepEqual(
    store.getState().tournament.standings.map(row => [row.playerId, row.seed]),
    [
      ["player-5", 5],
      ["player-1", 1],
      ["player-4", 4],
      ["player-2", 2],
      ["player-3", 3],
    ],
  );
});
