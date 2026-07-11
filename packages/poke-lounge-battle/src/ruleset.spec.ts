import { createHash } from "node:crypto";

import {
  APPROVED_COMPETITIVE_RULESET_V1,
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  canonicalize,
  createInitialBattleState,
} from "./index";

describe("approved competitive ruleset", () => {
  it("publishes one versioned server-owned minimal ruleset", () => {
    expect(COMPETITIVE_RULESET_VERSION).toBe(1);
    expect(APPROVED_COMPETITIVE_RULESET_V1).toMatchObject({
      version: 1,
      participantCount: 2,
      teamSize: 2,
      scores: { win: 100, loss: 50 },
      randomConsumptionOrder: [
        "speed-tie",
        "paralysis",
        "accuracy",
        "critical-hit",
        "damage-range",
        "secondary-effect",
      ],
    });
    expect(Object.keys(APPROVED_COMPETITIVE_RULESET_V1.moves).sort()).toEqual([
      "heavy-blow",
      "steady-strike",
      "stun-spark",
    ]);
    expect(APPROVED_COMPETITIVE_RULESET_V1.loadout).toHaveLength(2);
  });

  it("publishes the SHA-256 hash of the complete ruleset", () => {
    const expected = createHash("sha256")
      .update(canonicalize(APPROVED_COMPETITIVE_RULESET_V1), "utf8")
      .digest("hex");

    expect(COMPETITIVE_RULESET_HASH).toBe(expected);
    expect(COMPETITIVE_RULESET_HASH).toBe(
      "f063fa4b9fc1df896c72e04d13eee02905c40f8c90c3663d87f24f5ed17ee7fd",
    );
  });

  it("creates a canonical initial state from the approved loadout", () => {
    const state = createInitialBattleState(["player-b", "player-a"]);

    expect(state.participantIds).toEqual(["player-a", "player-b"]);
    expect(state.turn).toBe(0);
    expect(state.terminal).toBeNull();
    for (const playerId of state.participantIds) {
      expect(state.playersById[playerId]).toEqual({
        playerId,
        activeSlotIndex: 0,
        team: APPROVED_COMPETITIVE_RULESET_V1.loadout.map(template => ({
          speciesId: template.speciesId,
          level: template.level,
          maxHp: template.maxHp,
          currentHp: template.maxHp,
          attack: template.attack,
          defense: template.defense,
          speed: template.speed,
          status: "none",
          moves: template.moveIds.map(moveId => ({
            moveId,
            pp: APPROVED_COMPETITIVE_RULESET_V1.moves[moveId].maxPp,
          })),
        })),
      });
    }
  });

  it.each<[readonly [string, string], string]>([
    [["player-a", "player-a"], "distinct"],
    [["", "player-b"], "non-empty"],
  ])("rejects invalid initial-state participants %p", (participantIds, message) => {
    expect(() => createInitialBattleState(participantIds)).toThrow(message as string);
  });
});
