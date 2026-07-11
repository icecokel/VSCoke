import {
  COMPETITIVE_RULESET_HASH,
  canonicalize,
  createInitialBattleState,
  createSeededRandom,
  hashCanonicalState,
  resolveTurn,
  type CanonicalBattleState,
  type CanonicalCombatantState,
  type CanonicalCompetitiveAction,
  type SeededRandom,
} from "./index";

const PLAYER_A = "player-a";
const PLAYER_B = "player-b";

function battleState(
  overrides: {
    playerAActive?: Partial<CanonicalCombatantState>;
    playerBActive?: Partial<CanonicalCombatantState>;
    playerBBench?: Partial<CanonicalCombatantState>;
    terminal?: CanonicalBattleState["terminal"];
  } = {},
): CanonicalBattleState {
  const initialState = createInitialBattleState([PLAYER_A, PLAYER_B]);
  const playerA = initialState.playersById[PLAYER_A]!;
  const playerB = initialState.playersById[PLAYER_B]!;
  const withOverrides = (
    combatant: CanonicalCombatantState,
    combatantOverrides: Partial<CanonicalCombatantState> = {},
  ): CanonicalCombatantState => ({
    ...combatant,
    moves: combatant.moves.map(move => ({ ...move })),
    ...combatantOverrides,
  });

  return {
    ...initialState,
    turn: 1,
    playersById: {
      [PLAYER_A]: {
        ...playerA,
        team: [
          withOverrides(playerA.team[0]!, overrides.playerAActive),
          withOverrides(playerA.team[1]!),
        ],
      },
      [PLAYER_B]: {
        ...playerB,
        team: [
          withOverrides(playerB.team[0]!, overrides.playerBActive),
          withOverrides(playerB.team[1]!, overrides.playerBBench),
        ],
      },
    },
    terminal: overrides.terminal ?? null,
  };
}

function actions(
  actionA: CanonicalCompetitiveAction = {
    kind: "move",
    moveId: "steady-strike",
  },
  actionB: CanonicalCompetitiveAction = {
    kind: "move",
    moveId: "steady-strike",
  },
): Readonly<Record<string, CanonicalCompetitiveAction>> {
  return { [PLAYER_A]: actionA, [PLAYER_B]: actionB };
}

function withSwappedPlayerATeam(): CanonicalBattleState {
  const state = battleState();
  const player = state.playersById[PLAYER_A]!;
  return {
    ...state,
    playersById: {
      ...state.playersById,
      [PLAYER_A]: {
        ...player,
        team: [player.team[1]!, player.team[0]!],
      },
    },
  };
}

class ScriptedRandom implements SeededRandom {
  index = 0;

  constructor(private readonly values: readonly number[]) {}

  next(): number {
    const value = this.values[this.index];
    if (value === undefined) {
      throw new Error(`Unexpected random read at index ${this.index}`);
    }
    this.index += 1;
    return value;
  }
}

describe("resolveTurn", () => {
  it("resolves initial turn zero into turn one", () => {
    const result = resolveTurn({
      state: createInitialBattleState([PLAYER_B, PLAYER_A]),
      actionsByPlayerId: actions(),
      random: createSeededRandom("initial-turn-zero"),
    });

    expect(result.turn).toBe(0);
    expect(result.state.turn).toBe(1);
  });

  it.each(["__proto__", "constructor", "prototype"])(
    "preserves prototype-sensitive participant ID %p through a terminal turn",
    protectedPlayerId => {
      const otherPlayerId = "safe-player";
      const state = createInitialBattleState([protectedPlayerId, otherPlayerId]);

      expect(Object.getPrototypeOf(state.playersById)).toBeNull();
      expect(Object.hasOwn(state.playersById, protectedPlayerId)).toBe(true);

      const otherPlayer = state.playersById[otherPlayerId]!;
      otherPlayer.team[0]!.currentHp = 1;
      otherPlayer.team[1]!.currentHp = 0;

      const protectedActions = Object.create(null) as Record<string, CanonicalCompetitiveAction>;
      protectedActions[protectedPlayerId] = {
        kind: "move",
        moveId: "steady-strike",
      };
      protectedActions[otherPlayerId] = {
        kind: "move",
        moveId: "steady-strike",
      };

      const result = resolveTurn({
        state,
        actionsByPlayerId: protectedActions,
        random: new ScriptedRandom([0, 0, 0.5, 0.5]),
      });

      expect(result.terminal?.winnerPlayerId).toBe(protectedPlayerId);
      expect(Object.getPrototypeOf(result.state.playersById)).toBeNull();
      expect(Object.hasOwn(result.state.playersById, protectedPlayerId)).toBe(true);
      expect(Object.getPrototypeOf(result.terminal?.scoreByPlayerId)).toBeNull();
      expect(Object.hasOwn(result.terminal!.scoreByPlayerId, protectedPlayerId)).toBe(true);
      expect(result.terminal?.scoreByPlayerId[protectedPlayerId]).toBe(100);
      expect(canonicalize(result)).toContain(`"${protectedPlayerId}"`);
    },
  );

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1])(
    "rejects turn outside the resolvable safe nonnegative range: %p",
    turn => {
      expect(() =>
        resolveTurn({
          state: { ...battleState(), turn },
          actionsByPlayerId: actions(),
          random: createSeededRandom("invalid-turn"),
        }),
      ).toThrow("safe nonnegative integer");
    },
  );

  it("replays a terminal turn byte-for-byte without Math.random", () => {
    const state = battleState({
      playerBActive: { currentHp: 1 },
      playerBBench: { currentHp: 0 },
    });
    const turnActions = actions();
    const mathRandom = jest.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random is forbidden");
    });

    try {
      const first = resolveTurn({
        state,
        actionsByPlayerId: turnActions,
        random: createSeededRandom("server-owned-seed"),
      });
      const second = resolveTurn({
        state,
        actionsByPlayerId: turnActions,
        random: createSeededRandom("server-owned-seed"),
      });

      expect(canonicalize(first)).toBe(canonicalize(second));
      expect(first.stateHash).toBe(hashCanonicalState(first.state));
      expect(first.stateHash).toBe(second.stateHash);
      expect(first.terminal).toEqual({
        winnerPlayerId: PLAYER_A,
        loserPlayerId: PLAYER_B,
        reason: "faint",
        scoreByPlayerId: { [PLAYER_A]: 100, [PLAYER_B]: 50 },
      });
      expect(first.terminal).toEqual(second.terminal);
      expect(first.turn).toBe(1);
      expect(first.state.turn).toBe(2);
      expect(mathRandom).not.toHaveBeenCalled();
    } finally {
      mathRandom.mockRestore();
    }
  });

  it("consumes random values in the documented branch order", () => {
    const random = new ScriptedRandom([
      0.25, // speed tie: player A first
      0.9, // player A paralysis: can act
      0.1, // player A accuracy: hit
      0.01, // player A critical hit: yes
      0, // player A damage range: 85
      0.9, // player A secondary effect: no
      0.1, // player B accuracy: hit
      0.5, // player B critical hit: no
      0.999, // player B damage range: 100
      0.9, // player B secondary effect: no
    ]);
    const state = battleState({
      playerAActive: { status: "paralyzed" },
    });

    const result = resolveTurn({
      state,
      actionsByPlayerId: actions(
        { kind: "move", moveId: "stun-spark" },
        { kind: "move", moveId: "stun-spark" },
      ),
      random,
    });

    expect(random.index).toBe(10);
    expect(result.state.playersById[PLAYER_A]?.team[0]?.currentHp).toBe(104);
    expect(result.state.playersById[PLAYER_B]?.team[0]?.currentHp).toBe(100);
    expect(result.state.playersById[PLAYER_A]?.team[0]?.moves[1]?.pp).toBe(14);
    expect(result.state.playersById[PLAYER_B]?.team[0]?.moves[1]?.pp).toBe(14);
  });

  it("applies a successful secondary status and advances the turn", () => {
    const random = new ScriptedRandom([0, 0.5, 0.5, 0.1, 0, 0.5, 0.5, 0.5, 0.5]);
    const result = resolveTurn({
      state: battleState(),
      actionsByPlayerId: actions(
        { kind: "move", moveId: "stun-spark" },
        { kind: "move", moveId: "steady-strike" },
      ),
      random,
    });

    expect(result.state.playersById[PLAYER_B]?.team[0]?.status).toBe("paralyzed");
    expect(result.state.turn).toBe(2);
    expect(result.terminal).toBeNull();
  });

  it("resolves switches before moves and attacks the switched-in slot", () => {
    const state = battleState();
    const random = new ScriptedRandom([0, 0.5, 0.5]);

    const result = resolveTurn({
      state,
      actionsByPlayerId: actions(
        { kind: "switch", slotIndex: 1 },
        { kind: "move", moveId: "steady-strike" },
      ),
      random,
    });

    expect(result.state.playersById[PLAYER_A]?.activeSlotIndex).toBe(1);
    expect(result.state.playersById[PLAYER_A]?.team[0]?.currentHp).toBe(120);
    expect(result.state.playersById[PLAYER_A]?.team[1]?.currentHp).toBeLessThan(140);
  });

  it("is independent of action record and player record insertion order", () => {
    const original = battleState();
    const reversed: CanonicalBattleState = {
      ...original,
      playersById: {
        [PLAYER_B]: original.playersById[PLAYER_B]!,
        [PLAYER_A]: original.playersById[PLAYER_A]!,
      },
    };
    const forwardActions = actions();
    const reversedActions = {
      [PLAYER_B]: forwardActions[PLAYER_B]!,
      [PLAYER_A]: forwardActions[PLAYER_A]!,
    };

    const first = resolveTurn({
      state: original,
      actionsByPlayerId: forwardActions,
      random: createSeededRandom("perspective-independent"),
    });
    const second = resolveTurn({
      state: reversed,
      actionsByPlayerId: reversedActions,
      random: createSeededRandom("perspective-independent"),
    });

    expect(canonicalize(first)).toBe(canonicalize(second));
  });

  it.each([
    ["species", battleState({ playerAActive: { speciesId: "forged-species" } })],
    ["level", battleState({ playerAActive: { level: 51 } })],
    ["max HP", battleState({ playerAActive: { maxHp: 121, currentHp: 120 } })],
    ["attack", battleState({ playerAActive: { attack: 86 } })],
    ["defense", battleState({ playerAActive: { defense: 81 } })],
    ["speed", battleState({ playerAActive: { speed: 91 } })],
    [
      "species move IDs",
      battleState({
        playerAActive: {
          moves: [
            { moveId: "steady-strike", pp: 20 },
            { moveId: "heavy-blow", pp: 10 },
          ],
        },
      }),
    ],
    ["team composition", withSwappedPlayerATeam()],
  ])("rejects forged approved-loadout %s", (_field, state) => {
    expect(() =>
      resolveTurn({
        state: state as CanonicalBattleState,
        actionsByPlayerId: actions(),
        random: createSeededRandom("forged-loadout"),
      }),
    ).toThrow("approved loadout");
  });

  it.each([
    [
      "an unknown move",
      battleState(),
      actions({ kind: "move", moveId: "not-approved" }),
      "invalid move",
    ],
    [
      "a zero-PP move",
      battleState({
        playerAActive: {
          moves: [
            { moveId: "steady-strike", pp: 0 },
            { moveId: "stun-spark", pp: 15 },
          ],
        },
      }),
      actions(),
      "zero PP",
    ],
    [
      "a move from a fainted active combatant",
      battleState({ playerAActive: { currentHp: 0 } }),
      actions(),
      "active combatant is fainted",
    ],
    [
      "a switch to the active slot",
      battleState(),
      actions({ kind: "switch", slotIndex: 0 }),
      "active slot",
    ],
    [
      "a switch to a fainted slot",
      (() => {
        const state = battleState();
        const player = state.playersById[PLAYER_A]!;
        return {
          ...state,
          playersById: {
            ...state.playersById,
            [PLAYER_A]: {
              ...player,
              team: [player.team[0]!, { ...player.team[1]!, currentHp: 0 }],
            },
          },
        };
      })(),
      actions({ kind: "switch", slotIndex: 1 }),
      "fainted slot",
    ],
    [
      "an out-of-range switch",
      battleState(),
      actions({ kind: "switch", slotIndex: 2 }),
      "out of range",
    ],
  ])("rejects %s", (_name, state, turnActions, message) => {
    expect(() =>
      resolveTurn({
        state: state as CanonicalBattleState,
        actionsByPlayerId: turnActions as Readonly<Record<string, CanonicalCompetitiveAction>>,
        random: createSeededRandom("invalid-action"),
      }),
    ).toThrow(message as string);
  });

  it("rejects missing or extra participant actions", () => {
    const state = battleState();

    expect(() =>
      resolveTurn({
        state,
        actionsByPlayerId: {
          [PLAYER_A]: { kind: "move", moveId: "steady-strike" },
        },
        random: createSeededRandom("missing-action"),
      }),
    ).toThrow("exactly one action");

    expect(() =>
      resolveTurn({
        state,
        actionsByPlayerId: {
          ...actions(),
          outsider: { kind: "move", moveId: "steady-strike" },
        },
        random: createSeededRandom("extra-action"),
      }),
    ).toThrow("exactly one action");
  });

  it("explicitly rejects an unknown runtime action kind", () => {
    const bogusAction = {
      kind: "forfeit",
    } as unknown as CanonicalCompetitiveAction;

    expect(() =>
      resolveTurn({
        state: battleState(),
        actionsByPlayerId: actions(bogusAction),
        random: createSeededRandom("unknown-action-kind"),
      }),
    ).toThrow("Unsupported competitive action kind");
  });

  it("rejects a post-terminal action", () => {
    const terminal = {
      winnerPlayerId: PLAYER_A,
      loserPlayerId: PLAYER_B,
      reason: "faint" as const,
      scoreByPlayerId: { [PLAYER_A]: 100 as const, [PLAYER_B]: 50 as const },
    };

    expect(() =>
      resolveTurn({
        state: battleState({ terminal }),
        actionsByPlayerId: actions(),
        random: createSeededRandom("terminal"),
      }),
    ).toThrow("terminal");
  });

  it("exports the ruleset hash needed by assignments", () => {
    expect(COMPETITIVE_RULESET_HASH).toMatch(/^[a-f0-9]{64}$/);
  });
});
