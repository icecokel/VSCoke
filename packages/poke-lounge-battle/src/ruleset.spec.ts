import { createHash } from "node:crypto";

import {
  APPROVED_COMPETITIVE_RULESET_V1,
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
  canonicalize,
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
});
