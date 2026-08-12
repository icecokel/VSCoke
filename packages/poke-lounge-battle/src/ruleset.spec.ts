import { createHash } from "node:crypto";

import {
  APPROVED_COMPETITIVE_RULESET_V1,
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_STRUGGLE_MOVE_ID,
  COMPETITIVE_RULESET_VERSION,
  canonicalize,
  createInitialBattleState,
} from "./index";
import {
  APPROVED_COMPETITIVE_RULESET_V1 as BROWSER_COMPETITIVE_RULESET,
  COMPETITIVE_RULESET_HASH as BROWSER_COMPETITIVE_RULESET_HASH,
} from "./browser";

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
    expect(APPROVED_COMPETITIVE_RULESET_V1.struggle).toMatchObject({
      moveId: COMPETITIVE_STRUGGLE_MOVE_ID,
      power: 50,
      maxPp: 0,
      recoilMaxHpDivisor: 4,
    });
    expect(APPROVED_COMPETITIVE_RULESET_V1.loadout).toHaveLength(2);
  });

  it("publishes the SHA-256 hash of the complete ruleset", () => {
    const expected = createHash("sha256")
      .update(canonicalize(APPROVED_COMPETITIVE_RULESET_V1), "utf8")
      .digest("hex");

    expect(COMPETITIVE_RULESET_HASH).toBe(expected);
    expect(COMPETITIVE_RULESET_HASH).toBe(
      "06f455303f46369d1a31315db5fdfffa666164fde44f8ac20ac507a6fc9f9de7",
    );
    expect(BROWSER_COMPETITIVE_RULESET).toBe(APPROVED_COMPETITIVE_RULESET_V1);
    expect(BROWSER_COMPETITIVE_RULESET_HASH).toBe(COMPETITIVE_RULESET_HASH);
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
