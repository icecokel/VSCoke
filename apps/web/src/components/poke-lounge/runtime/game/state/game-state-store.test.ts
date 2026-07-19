import assert from "node:assert/strict";
import test from "node:test";
import { createTournamentBracketState } from "@vscoke/poke-lounge-battle";
import type { TournamentStateRoomPayload } from "../network/tournament-projection";
import {
  createDefaultLocalPlayer,
  createGameStateStore,
  type GameStateStorage,
  type LocalPlayersSaveState,
} from "./gameStateStore";

test("storage scope 전환은 저장 데이터를 지우지 않고 대상 scope 상태를 다시 읽는다", () => {
  let persistedLocalPlayers: LocalPlayersSaveState | null = null;
  let clearCount = 0;
  const storage: GameStateStorage = {
    loadLocalPlayers: () => persistedLocalPlayers,
    saveLocalPlayers: localPlayers => {
      persistedLocalPlayers = localPlayers;
    },
    clear: () => {
      clearCount += 1;
      persistedLocalPlayers = null;
    },
  };
  const store = createGameStateStore({ storage });
  const accountPlayer = {
    ...createDefaultLocalPlayer("account-player"),
    wallet: { pokeDollars: 4321 },
  };
  persistedLocalPlayers = {
    currentPlayerId: accountPlayer.playerId,
    playersById: { [accountPlayer.playerId]: accountPlayer },
  };

  assert.equal(store.reloadLocalPlayersFromStorage(), true);

  assert.equal(store.getState().currentPlayerId, accountPlayer.playerId);
  assert.equal(store.getCurrentLocalPlayer().wallet.pokeDollars, 4321);
  assert.equal(store.getState().session.connectionStatus, "offline");
  assert.equal(clearCount, 0);

  persistedLocalPlayers = null;
  assert.equal(store.reloadLocalPlayersFromStorage(), false);

  assert.equal(store.getState().currentPlayerId, "player-1");
  assert.equal(clearCount, 0);
});

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
    roomCode: "ROOM01",
    roundIndex: 1,
    roomStatus: "tournament",
    roomRound: {
      index: 1,
      phase: "tournament",
      durationMs: 300_000,
      startedAtMs: 500,
      endsAtMs: 800,
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
      activeMatchAuthority: "casual",
      cumulativeScores: {},
    },
    ownPlayerId: "player-4",
    activeMatchTransport: "casual",
    competitionKind: "casual-unranked",
    finalStandings: [],
    resultSync: { matchId: null, status: "idle" },
  };
}

function createPreparationProjection(revision: number): TournamentStateRoomPayload {
  return {
    revision,
    roomCode: "ROOM01",
    roundIndex: 1,
    roomStatus: "round-started",
    roomRound: {
      index: 1,
      phase: "round-started",
      durationMs: 300_000,
      startedAtMs: 1_000,
      endsAtMs: 301_000,
    },
    participants: [
      {
        playerId: "player-1",
        displayName: "Player 1",
        role: "participant",
        ready: true,
        connected: true,
        seed: null,
      },
      {
        playerId: "player-2",
        displayName: "Player 2",
        role: "participant",
        ready: true,
        connected: true,
        seed: null,
      },
    ],
    tournament: {
      version: 2,
      bracket: null,
      activeMatchId: null,
      activeMatchAuthority: null,
      cumulativeScores: {},
    },
    ownPlayerId: "player-1",
    activeMatchTransport: "awaiting-authority",
    competitionKind: null,
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
  assert.equal(store.getState().round.totalRounds, 1);
  assert.equal(store.getState().round.preparationDurationMs, 300_000);
  assert.equal(store.getState().round.phaseStartedAtMs, 1_000);
  assert.equal(store.getState().round.preparationEndsAtMs, 301_000);
  assert.equal(store.getState().tournament.session, null);
  assert.equal(store.getCurrentTournamentMatch(), null);
});

test("server preparation은 로컬 round clock으로 tournament 단계에 진입하지 않는다", () => {
  const store = createGameStateStore();
  store.applyTournamentSnapshotFromRoom(createPreparationProjection(3), 1_000);

  store.advanceRoundClock(400_000);

  assert.equal(store.getState().round.phase, "preparation");
  assert.equal(store.getState().round.preparationEndsAtMs, 301_000);
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
    { playerId: "player-5", displayName: "Player 5", rank: 1, score: 300 },
    { playerId: "player-1", displayName: "Player 1", rank: 2, score: 250 },
    { playerId: "player-4", displayName: "Player 4", rank: 3, score: 200 },
    { playerId: "player-2", displayName: "Player 2", rank: 4, score: 150 },
    { playerId: "player-3", displayName: "Player 3", rank: 5, score: 100 },
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
