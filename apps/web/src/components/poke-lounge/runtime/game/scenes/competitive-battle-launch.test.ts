import assert from "node:assert/strict";
import test from "node:test";
import { toAuthoritativeBattleState } from "../battle/authoritative-battle-adapter";
import { APPROVED_COMPETITIVE_LOADOUT } from "../network/competitive-projection";
import type {
  CompetitiveProjection,
  CompetitiveRoomProjectionEvent,
} from "../network/localPreviewRoom";
import { createCompetitiveBattleLaunchCache } from "./competitive-battle-launch";

function createProjection(
  matchId: string,
  bracketMatchId: string,
  playerIds: [string, string],
): CompetitiveProjection {
  return {
    matchId,
    bracketMatchId,
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
      playersById: Object.fromEntries(
        playerIds.map(playerId => [
          playerId,
          {
            playerId,
            activeSlotIndex: 0,
            team: APPROVED_COMPETITIVE_LOADOUT.map(pokemon => ({
              speciesId: pokemon.speciesId,
              maxHp: pokemon.maxHp,
              currentHp: pokemon.maxHp,
              status: "none" as const,
              moves: pokemon.moves.map(move => ({ moveId: move.moveId, pp: move.maxPp })),
            })),
          },
        ]),
      ),
      terminal: null,
    },
    submittedPlayerIds: [],
    terminal: null,
  };
}

test("authoritative terminal state는 기존 WorldScene 복귀 위치를 보존한다", () => {
  const projection = createProjection(
    "11111111-1111-4111-8111-111111111111",
    "game-round-1-bracket-1-match-1",
    ["seed-4", "seed-5"],
  );
  const terminal = {
    winnerPlayerId: "seed-5",
    loserPlayerId: "seed-4",
    reason: "faint" as const,
    scoreByPlayerId: { "seed-4": 50 as const, "seed-5": 100 as const },
  };
  const returnToWorld = {
    mapKey: "new-bark-town",
    x: 656,
    y: 1150,
    facing: "front" as const,
  };
  const state = toAuthoritativeBattleState(
    {
      ...projection,
      status: "completed",
      terminal,
      currentState: { ...projection.currentState, terminal },
    },
    "seed-5",
    returnToWorld,
  );

  assert.equal(state.phase, "ended");
  assert.deepEqual(state.returnToWorld, returnToWorld);
});

test("WorldScene은 handed-off old key만 완료하고 next assignment를 한 번만 launch한다", () => {
  const cache = createCompetitiveBattleLaunchCache();
  const oldEvent: CompetitiveRoomProjectionEvent = {
    projection: createProjection(
      "11111111-1111-4111-8111-111111111111",
      "game-round-1-bracket-1-match-1",
      ["seed-4", "seed-5"],
    ),
    ownPlayerId: "seed-5",
  };
  const nextEvent: CompetitiveRoomProjectionEvent = {
    projection: createProjection(
      "22222222-2222-4222-8222-222222222222",
      "game-round-1-bracket-2-match-1",
      ["seed-1", "seed-5"],
    ),
    ownPlayerId: "seed-5",
  };
  assert.equal(cache.begin(oldEvent), true);
  cache.update(nextEvent);

  cache.complete(oldEvent.projection.matchId, oldEvent.projection.assignmentRevision);
  cache.update(oldEvent);

  assert.equal(
    cache.get(oldEvent.projection.matchId, oldEvent.projection.assignmentRevision),
    null,
  );
  assert.equal(cache.begin(oldEvent), false);
  assert.equal(
    cache.get(nextEvent.projection.matchId, nextEvent.projection.assignmentRevision)?.projection
      .matchId,
    nextEvent.projection.matchId,
  );
  assert.equal(cache.begin(nextEvent), true);
  assert.equal(cache.begin(nextEvent), false);
});
