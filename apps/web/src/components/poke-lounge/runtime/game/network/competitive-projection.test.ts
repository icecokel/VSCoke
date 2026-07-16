import assert from "node:assert/strict";
import test from "node:test";
import {
  APPROVED_COMPETITIVE_LOADOUT,
  CompetitiveProjectionSchemaError,
  parseCompetitiveProjection,
  parseCompetitiveProjectionContract,
  parseCompetitiveRoomSnapshotContract,
} from "./competitive-projection";

function createProjection() {
  const playerIds = ["player-4", "player-5"] as const;
  const playersById = Object.fromEntries(
    playerIds.map(playerId => [
      playerId,
      {
        playerId,
        activeSlotIndex: 0,
        team: APPROVED_COMPETITIVE_LOADOUT.map(pokemon => ({
          speciesId: pokemon.speciesId,
          maxHp: pokemon.maxHp,
          currentHp: pokemon.maxHp,
          status: "none",
          moves: pokemon.moves.map(move => ({ moveId: move.moveId, pp: move.maxPp })),
        })),
      },
    ]),
  );

  return {
    matchId: "123e4567-e89b-42d3-a456-426614174000",
    bracketMatchId: "game-round-1-bracket-1-match-1",
    kind: "tournament-unranked",
    assignmentRevision: 1,
    rulesetVersion: 1,
    rulesetHash: "a".repeat(64),
    currentTurn: 0,
    status: "active",
    playerIds,
    stateHash: "b".repeat(64),
    currentState: {
      rulesetVersion: 1,
      turn: 0,
      participantIds: playerIds,
      playersById,
      terminal: null,
    },
    submittedPlayerIds: [],
    terminal: null,
  };
}

function createCompletedProjection() {
  const projection = createProjection();
  const terminal = {
    winnerPlayerId: projection.playerIds[0],
    loserPlayerId: projection.playerIds[1],
    reason: "faint" as const,
    scoreByPlayerId: {
      [projection.playerIds[0]]: 100 as const,
      [projection.playerIds[1]]: 50 as const,
    },
  };

  return {
    ...projection,
    status: "completed" as const,
    currentState: { ...projection.currentState, terminal },
    terminal,
  };
}

function createStableCompletedProjection(
  terminalEventId = "terminal-event-room01-revision-50",
  terminalRoomRevision = 50,
) {
  return {
    ...createCompletedProjection(),
    terminalEventId,
    terminalRoomRevision,
  };
}

test("authority projection은 UUID와 stable bracket match ID를 구분해 적용한다", () => {
  const projection = parseCompetitiveProjection(createProjection());

  assert.equal(projection.matchId, "123e4567-e89b-42d3-a456-426614174000");
  assert.equal(projection.bracketMatchId, "game-round-1-bracket-1-match-1");
  assert.equal(projection.kind, "tournament-unranked");
});

test("bracket match ID가 빠진 authority projection은 거부한다", () => {
  const projection: Record<string, unknown> = { ...createProjection() };
  delete projection.bracketMatchId;

  assert.throws(() => parseCompetitiveProjection(projection), CompetitiveProjectionSchemaError);
});

test("terminal projection은 stable event metadata를 보존한다", () => {
  const parsed = parseCompetitiveProjectionContract(createStableCompletedProjection());

  assert.equal(parsed.projection.terminalEventId, "terminal-event-room01-revision-50");
  assert.equal(parsed.projection.terminalRoomRevision, 50);
  assert.equal(parsed.terminalMetadataState, "stable");
});

test("legacy completed projection의 누락 metadata는 recovery 신호와 null로 복구한다", () => {
  const parsed = parseCompetitiveProjectionContract(createCompletedProjection());

  assert.equal(parsed.projection.terminalEventId, null);
  assert.equal(parsed.projection.terminalRoomRevision, null);
  assert.equal(parsed.terminalMetadataState, "legacy-recovery-required");
});

test("legacy completed projection의 null metadata도 recovery 신호로 읽는다", () => {
  const parsed = parseCompetitiveProjectionContract({
    ...createCompletedProjection(),
    terminalEventId: null,
    terminalRoomRevision: null,
  });

  assert.equal(parsed.projection.terminalEventId, null);
  assert.equal(parsed.projection.terminalRoomRevision, null);
  assert.equal(parsed.terminalMetadataState, "legacy-recovery-required");
});

test("terminal event metadata가 한쪽만 있으면 거부한다", () => {
  assert.throws(
    () =>
      parseCompetitiveProjection({
        ...createCompletedProjection(),
        terminalEventId: "terminal-event-room01-revision-50",
      }),
    CompetitiveProjectionSchemaError,
  );
});

test("non-terminal projection은 metadata가 없어도 null과 not-terminal 상태로 정규화한다", () => {
  const parsed = parseCompetitiveProjectionContract(createProjection());

  assert.equal(parsed.projection.terminalEventId, null);
  assert.equal(parsed.projection.terminalRoomRevision, null);
  assert.equal(parsed.terminalMetadataState, "not-terminal");
});

test("room snapshot의 누락 transitions는 빈 배열로, competitive 누락은 omitted로 읽는다", () => {
  const parsed = parseCompetitiveRoomSnapshotContract({ revision: 50 });

  assert.deepEqual(parsed.competitiveTransitions, []);
  assert.equal("competitive" in parsed, false);
});

test("room snapshot의 competitive null은 거부한다", () => {
  assert.throws(
    () => parseCompetitiveRoomSnapshotContract({ revision: 50, competitive: null }),
    CompetitiveProjectionSchemaError,
  );
});

test("room snapshot은 stable completed transition과 optional current assignment를 함께 읽는다", () => {
  const projection = createStableCompletedProjection();
  const parsed = parseCompetitiveRoomSnapshotContract({
    revision: 50,
    competitiveTransitions: [
      {
        terminalEventId: projection.terminalEventId,
        terminalRoomRevision: projection.terminalRoomRevision,
        projection,
      },
    ],
    competitive: createProjection(),
  });

  assert.equal(parsed.competitiveTransitions.length, 1);
  assert.equal(parsed.competitiveTransitions[0]?.projection.status, "completed");
  assert.equal(parsed.competitive?.status, "active");
  assert.equal(parsed.competitive?.terminalEventId, null);
});

test("transition wrapper와 projection의 terminal metadata가 다르면 거부한다", () => {
  const projection = createStableCompletedProjection();

  assert.throws(
    () =>
      parseCompetitiveRoomSnapshotContract({
        revision: 50,
        competitiveTransitions: [
          {
            terminalEventId: "different-terminal-event",
            terminalRoomRevision: projection.terminalRoomRevision,
            projection,
          },
        ],
      }),
    CompetitiveProjectionSchemaError,
  );
});

test("legacy completed projection은 transition cache 입력으로 허용하지 않는다", () => {
  assert.throws(
    () =>
      parseCompetitiveRoomSnapshotContract({
        revision: 50,
        competitiveTransitions: [
          {
            terminalEventId: "terminal-event-room01-revision-50",
            terminalRoomRevision: 50,
            projection: createCompletedProjection(),
          },
        ],
      }),
    CompetitiveProjectionSchemaError,
  );
});

test("competitiveTransitions는 최대 8개까지만 허용한다", () => {
  const projection = createStableCompletedProjection();
  const transition = {
    terminalEventId: projection.terminalEventId,
    terminalRoomRevision: projection.terminalRoomRevision,
    projection,
  };

  assert.throws(
    () =>
      parseCompetitiveRoomSnapshotContract({
        revision: 50,
        competitiveTransitions: Array.from({ length: 9 }, () => transition),
      }),
    CompetitiveProjectionSchemaError,
  );
});

test("competitiveTransitions가 revision과 event ID 순서를 어기면 거부한다", () => {
  const later = createStableCompletedProjection("terminal-event-b", 50);
  const earlier = {
    ...createStableCompletedProjection("terminal-event-a", 49),
    matchId: "123e4567-e89b-42d3-a456-426614174001",
    bracketMatchId: "game-round-1-bracket-1-match-2",
  };

  assert.throws(
    () =>
      parseCompetitiveRoomSnapshotContract({
        revision: 50,
        competitiveTransitions: [
          {
            terminalEventId: later.terminalEventId,
            terminalRoomRevision: later.terminalRoomRevision,
            projection: later,
          },
          {
            terminalEventId: earlier.terminalEventId,
            terminalRoomRevision: earlier.terminalRoomRevision,
            projection: earlier,
          },
        ],
      }),
    CompetitiveProjectionSchemaError,
  );
});
