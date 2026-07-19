import assert from "node:assert/strict";
import test from "node:test";
import { createTournamentBracketState } from "@vscoke/poke-lounge-battle";
import {
  mapServerTournamentPlayerIds,
  parseServerTournamentState,
  TournamentProjectionSchemaError,
} from "./tournament-projection";

function createFivePlayerServerTournament() {
  const bracket = createTournamentBracketState(
    Array.from({ length: 5 }, (_, index) => ({
      playerId: `player-${index + 1}`,
      displayName: `Player ${index + 1}`,
    })),
    1,
  );

  return {
    version: 2,
    bracket,
    activeMatchId: bracket.currentRound?.matches[0]?.matchId ?? null,
    activeMatchAuthority: "casual",
    cumulativeScores: {},
  };
}

test("preparation의 null bracket과 null authority는 정상 lobby projection이다", () => {
  assert.deepEqual(
    parseServerTournamentState(
      {
        version: 2,
        bracket: null,
        activeMatchId: null,
        activeMatchAuthority: null,
        cumulativeScores: {},
      },
      1,
    ),
    {
      version: 2,
      bracket: null,
      activeMatchId: null,
      activeMatchAuthority: null,
      cumulativeScores: {},
    },
  );
});

test("5인 canonical projection은 seed 4/5 match와 seed 1/3/2 bye를 보존한다", () => {
  const tournament = parseServerTournamentState(createFivePlayerServerTournament(), 1);

  assert.deepEqual(tournament.bracket?.currentRound?.matches[0]?.participantIds, [
    "player-4",
    "player-5",
  ]);
  assert.deepEqual(
    tournament.bracket?.currentRound?.byes.map(bye => bye.entrant.playerId),
    ["player-1", "player-3", "player-2"],
  );
});

test("slot이 match를 참조하지 않는 projection은 거부한다", () => {
  const tournament = structuredClone(createFivePlayerServerTournament());
  const firstSlot = tournament.bracket.currentRound?.slots[0];

  if (firstSlot?.kind === "bye") {
    firstSlot.byeId = "unknown-bye";
  }

  assert.throws(() => parseServerTournamentState(tournament, 1), TournamentProjectionSchemaError);
});

test("active match가 current round에 없는 projection은 거부한다", () => {
  const tournament = createFivePlayerServerTournament();

  assert.throws(
    () =>
      parseServerTournamentState(
        { ...tournament, activeMatchId: "game-round-1-bracket-1-match-999" },
        1,
      ),
    TournamentProjectionSchemaError,
  );
});

test("local player ID mapping은 bracket의 모든 참가자 참조에 동일하게 적용된다", () => {
  const parsed = parseServerTournamentState(createFivePlayerServerTournament(), 1);
  const mapped = mapServerTournamentPlayerIds(parsed, playerId =>
    playerId === "player-4" ? "local-player" : playerId,
  );

  assert.equal(mapped.bracket?.participants[3]?.playerId, "local-player");
  assert.deepEqual(mapped.bracket?.currentRound?.matches[0]?.participantIds, [
    "local-player",
    "player-5",
  ]);
  assert.equal(mapped.bracket?.currentRound?.matches[0]?.participantA.playerId, "local-player");
});
