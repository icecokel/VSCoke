import assert from "node:assert/strict";
import test from "node:test";
import {
  createTournamentBracketState,
  getReadyTournamentMatches,
  recordTournamentMatchResult,
} from "@vscoke/poke-lounge-battle";
import { createGameStateStore } from "../state/gameStateStore";
import { APPROVED_COMPETITIVE_LOADOUT } from "./competitive-projection";
import type { CompetitiveProjection, RoomEvent } from "./localPreviewRoom";

interface FixtureSocket {
  readonly connected: boolean;
  on(eventName: string, listener: (event?: unknown) => void): FixtureSocket;
  off(eventName: string, listener: (event?: unknown) => void): FixtureSocket;
  emit(eventName: string, payload: unknown): FixtureSocket;
  disconnect(): FixtureSocket;
  pushSnapshot(room: unknown): void;
  disconnectFromServer(): void;
  failConnection(error?: unknown): void;
  pushSubscriptionError(): void;
  reconnectFromServer(): void;
  subscriptions(): Array<{ afterRevision: number }>;
}

function createSocket(initiallyConnected = true): FixtureSocket {
  const listeners = new Map<string, Set<(event?: unknown) => void>>();
  const recordedSubscriptions: Array<{ afterRevision: number }> = [];
  let connected = initiallyConnected;

  const dispatch = (eventName: string, event?: unknown) => {
    for (const listener of listeners.get(eventName) ?? []) {
      listener(event);
    }
  };

  return {
    get connected() {
      return connected;
    },
    on(eventName, listener) {
      const eventListeners = listeners.get(eventName) ?? new Set();
      eventListeners.add(listener);
      listeners.set(eventName, eventListeners);
      return this;
    },
    off(eventName, listener) {
      listeners.get(eventName)?.delete(listener);
      return this;
    },
    emit(eventName, payload) {
      if (eventName === "room.subscribe" && payload && typeof payload === "object") {
        const afterRevision = (payload as { afterRevision?: unknown }).afterRevision;
        if (typeof afterRevision === "number") {
          recordedSubscriptions.push({ afterRevision });
        }
      }
      return this;
    },
    disconnect() {
      connected = false;
      return this;
    },
    pushSnapshot(room) {
      dispatch("room.snapshot", { room });
    },
    disconnectFromServer() {
      if (connected) {
        connected = false;
        dispatch("disconnect");
      }
    },
    failConnection(error) {
      connected = false;
      dispatch("connect_error", error);
    },
    pushSubscriptionError() {
      dispatch("room.subscription-error");
    },
    reconnectFromServer() {
      if (!connected) {
        connected = true;
        dispatch("connect");
      }
    },
    subscriptions() {
      return [...recordedSubscriptions];
    },
  };
}

function createManualRecoveryTimers(search = "") {
  let nextTimerId = 1;
  const pending = new Map<number, { callback: () => void; delayMs: number }>();

  return {
    window: {
      location: { href: `http://web.test/game${search}`, search },
      setTimeout(callback: () => void, delayMs = 0) {
        const timerId = nextTimerId;
        nextTimerId += 1;
        pending.set(timerId, { callback, delayMs });
        return timerId;
      },
      clearTimeout(timerId: number) {
        pending.delete(timerId);
      },
    },
    nextDelay(): number | null {
      return [...pending.values()][0]?.delayMs ?? null;
    },
    captureNextCallback(): () => void {
      const next = pending.entries().next().value as
        | [number, { callback: () => void; delayMs: number }]
        | undefined;
      if (!next) {
        throw new Error("Expected a pending recovery timer");
      }

      pending.delete(next[0]);
      return next[1].callback;
    },
    async runNext(): Promise<void> {
      const next = pending.entries().next().value as
        | [number, { callback: () => void; delayMs: number }]
        | undefined;
      if (!next) {
        throw new Error("Expected a pending recovery timer");
      }

      pending.delete(next[0]);
      next[1].callback();
      await flushAsyncWork();
    },
  };
}

function createRoomSnapshots() {
  const participants = Array.from({ length: 5 }, (_, index) => ({
    playerId: `player-${index + 1}`,
    displayName: `Player ${index + 1}`,
    role: "participant",
    ready: true,
    connected: true,
    joinedAtMs: index + 1,
  }));
  const firstBracket = createTournamentBracketState(
    participants.map(({ playerId, displayName }) => ({ playerId, displayName })),
    1,
  );
  const firstMatch = getReadyTournamentMatches(firstBracket)[0];

  if (!firstMatch) {
    throw new Error("Expected the first tournament match");
  }

  const nextBracket = recordTournamentMatchResult(
    firstBracket,
    firstMatch.matchId,
    firstMatch.participantIds[0],
    { reason: "faint", completedAtMs: 2_000 },
  );
  const room = (
    revision: number,
    bracket: typeof firstBracket,
    competitive?: CompetitiveProjection,
  ) => {
    const activeMatchId = getReadyTournamentMatches(bracket)[0]?.matchId ?? null;

    return {
      roomCode: "ROOM01",
      revision,
      expiresAtMs: 253_402_300_799_999,
      status: "tournament",
      participants,
      partySnapshots: {},
      round: {
        index: 1,
        phase: "tournament",
        durationMs: 300_000,
        startedAtMs: 1_000,
        endsAtMs: 301_000,
      },
      tournament: {
        version: 2,
        bracket,
        activeMatchId,
        activeMatchAuthority: competitive ? "server" : "casual",
        cumulativeScores: {},
      },
      finalStandings: [],
      ...(competitive ? { competitive } : {}),
    };
  };
  const nextMatch = getReadyTournamentMatches(nextBracket)[0];

  if (!nextMatch) {
    throw new Error("Expected the next tournament match");
  }

  const activeCompetitive = createCompetitiveProjection(
    nextMatch.matchId,
    nextMatch.participantIds,
  );
  const oldCompetitive = createCompetitiveProjection(
    firstMatch.matchId,
    firstMatch.participantIds,
    "11111111-1111-4111-8111-111111111111",
  );
  const oldTerminal = createTerminal(oldCompetitive.playerIds);
  const completedOldCompetitive = {
    ...oldCompetitive,
    currentTurn: 1,
    status: "completed" as const,
    currentState: { ...oldCompetitive.currentState, turn: 1, terminal: oldTerminal },
    terminal: oldTerminal,
    terminalEventId: "terminal-event-room01-revision-50",
    terminalRoomRevision: 50,
  };
  const latest = room(50, nextBracket, activeCompetitive);

  return {
    initial: room(15, firstBracket),
    activeOld: room(16, firstBracket, oldCompetitive),
    latest,
    terminalTransition: {
      terminalEventId: completedOldCompetitive.terminalEventId,
      terminalRoomRevision: completedOldCompetitive.terminalRoomRevision,
      projection: completedOldCompetitive,
    },
    transitionLatest: {
      ...latest,
      competitiveTransitions: [
        {
          terminalEventId: completedOldCompetitive.terminalEventId,
          terminalRoomRevision: completedOldCompetitive.terminalRoomRevision,
          projection: completedOldCompetitive,
        },
      ],
    },
    completedOldCompetitive,
    legacyCompletedOldCompetitive: {
      ...completedOldCompetitive,
      terminalEventId: undefined,
      terminalRoomRevision: undefined,
    },
    completedLatest: room(50, nextBracket, {
      ...activeCompetitive,
      status: "completed",
      terminal: createTerminal(activeCompetitive.playerIds),
      currentState: {
        ...activeCompetitive.currentState,
        terminal: createTerminal(activeCompetitive.playerIds),
      },
    }),
  };
}

function createRoundStartedRoomSnapshot(
  base: ReturnType<typeof createRoomSnapshots>["initial"],
  revision: number,
  endsAtMs: number,
) {
  return {
    ...base,
    revision,
    status: "round-started" as const,
    round: {
      ...base.round,
      phase: "round-started" as const,
      startedAtMs: Math.max(0, endsAtMs - base.round.durationMs),
      endsAtMs,
    },
  };
}

function createCompletedRoomSnapshot(
  base: ReturnType<typeof createRoundStartedRoomSnapshot>,
  revision: number,
) {
  return {
    ...base,
    revision,
    status: "completed" as const,
    round: {
      ...base.round,
      phase: "completed" as const,
    },
  };
}

function reverseNestedObjectKeyOrder<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(reverseNestedObjectKeyOrder) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, nestedValue]) => [key, reverseNestedObjectKeyOrder(nestedValue)]),
    ) as T;
  }

  return value;
}

function createEightTerminalTransitionPage() {
  const participants = Array.from({ length: 6 }, (_, index) => ({
    playerId: `player-${index + 1}`,
    displayName: `Player ${index + 1}`,
    role: "participant",
    ready: true,
    connected: true,
    joinedAtMs: index + 1,
  }));
  let bracket = createTournamentBracketState(
    participants.map(({ playerId, displayName }) => ({ playerId, displayName })),
    1,
  );

  while (bracket.status !== "completed") {
    const match = getReadyTournamentMatches(bracket)[0];
    if (!match) {
      throw new Error("Expected a ready tournament match");
    }
    bracket = recordTournamentMatchResult(bracket, match.matchId, match.participantIds[0], {
      reason: "faint",
      completedAtMs: 2_000,
    });
  }

  const [firstRound, secondRound, thirdRound] = bracket.completedRounds;
  const firstRoundMatch = firstRound?.matches[0];
  const secondRoundMatches = secondRound?.matches;
  const thirdRoundMatch = thirdRound?.matches[0];
  if (
    !firstRoundMatch ||
    !secondRoundMatches ||
    secondRoundMatches.length !== 2 ||
    !thirdRoundMatch
  ) {
    throw new Error("Expected a completed six-player tournament bracket");
  }

  const copyCompletedMatch = (
    source: typeof firstRoundMatch,
    roundNumber: number,
    matchNumber: number,
  ) => ({
    ...source,
    matchId: `game-round-1-bracket-${roundNumber}-match-${matchNumber}`,
    roundNumber,
    matchNumber,
    participantIds: [...source.participantIds] as [string, string],
  });
  const thirdRoundSecondMatch = copyCompletedMatch(firstRoundMatch, 3, 2);
  const fourthRoundMatches = [
    copyCompletedMatch(secondRoundMatches[0], 4, 1),
    copyCompletedMatch(secondRoundMatches[1], 4, 2),
  ];
  const pagedBracket = {
    ...bracket,
    completedRounds: [
      firstRound,
      secondRound,
      {
        ...thirdRound,
        matches: [thirdRoundMatch, thirdRoundSecondMatch],
        slots: [
          { kind: "match" as const, matchId: thirdRoundMatch.matchId },
          { kind: "match" as const, matchId: thirdRoundSecondMatch.matchId },
        ],
      },
      {
        roundNumber: 4,
        matches: fourthRoundMatches,
        byes: [],
        slots: fourthRoundMatches.map(match => ({
          kind: "match" as const,
          matchId: match.matchId,
        })),
      },
    ],
  };
  const competitiveTransitions = pagedBracket.completedRounds
    .flatMap(round => round.matches)
    .map((match, index) => {
      const terminal = createTerminal(match.participantIds);
      const terminalRoomRevision = 16 + index;
      const projection = {
        ...createCompetitiveProjection(
          match.matchId,
          match.participantIds,
          `123e4567-e89b-42d3-a456-${String(index + 1).padStart(12, "0")}`,
        ),
        currentTurn: 1,
        status: "completed" as const,
        currentState: {
          ...createCompetitiveProjection(match.matchId, match.participantIds).currentState,
          turn: 1,
          terminal,
        },
        terminal,
        terminalEventId: `terminal-page-${terminalRoomRevision}`,
        terminalRoomRevision,
      };

      return {
        terminalEventId: projection.terminalEventId,
        terminalRoomRevision,
        projection,
      };
    });

  if (competitiveTransitions.length !== 8) {
    throw new Error("Expected exactly eight terminal transitions");
  }

  return {
    roomCode: "ROOM01",
    revision: 100,
    expiresAtMs: 253_402_300_799_999,
    status: "tournament",
    participants,
    partySnapshots: {},
    round: {
      index: 1,
      phase: "tournament",
      durationMs: 300_000,
      startedAtMs: 1_000,
      endsAtMs: 301_000,
    },
    tournament: {
      version: 2,
      bracket: pagedBracket,
      activeMatchId: null,
      activeMatchAuthority: null,
      cumulativeScores: {},
    },
    finalStandings: [],
    competitiveTransitions,
  };
}

function createCompetitiveProjection(
  bracketMatchId: string,
  playerIds: [string, string],
  matchId = "123e4567-e89b-42d3-a456-426614174000",
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
              status: "none",
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

function createTerminal(playerIds: ReadonlyArray<string>) {
  const winnerPlayerId = playerIds[0];
  const loserPlayerId = playerIds[1];

  if (!winnerPlayerId || !loserPlayerId) {
    throw new Error("Expected two competitive players");
  }

  return {
    winnerPlayerId,
    loserPlayerId,
    reason: "faint" as const,
    scoreByPlayerId: {
      [winnerPlayerId]: 100 as const,
      [loserPlayerId]: 50 as const,
    },
  };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;

  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for server room state");
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>(resolve => setImmediate(resolve));
}

test("서버 방 신원은 기존 값을 현재 계정으로 이전하고 계정별로 격리한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>([
    [
      "poke-lounge:server-room-identity",
      JSON.stringify({ sessionId: "legacy-session", playerId: "legacy-player" }),
    ],
  ]);

  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: { href: "http://web.test/game", search: "" },
        sessionStorage: {
          getItem(key: string) {
            return values.get(key) ?? null;
          },
          setItem(key: string, value: string) {
            values.set(key, value);
          },
          removeItem(key: string) {
            values.delete(key);
          },
        },
      },
    });
    const { createServerRoom } = await import("./serverRoom");
    const accountARoom = createServerRoom({ roomId: "ROOM01", accountId: "account-a" });
    const accountASessionId = accountARoom.sessionId;
    accountARoom.dispose();

    const accountBRoom = createServerRoom({ roomId: "ROOM01", accountId: "account-b" });
    assert.notEqual(accountBRoom.sessionId, accountASessionId);
    accountBRoom.dispose();

    const restoredAccountARoom = createServerRoom({ roomId: "ROOM01", accountId: "account-a" });
    assert.equal(accountASessionId, "legacy-session");
    assert.equal(restoredAccountARoom.sessionId, accountASessionId);
    assert.equal(values.has("poke-lounge:server-room-identity"), false);
    restoredAccountARoom.dispose();
  } finally {
    restoreWindow(originalWindow);
  }
});

test("E2E socket transport diagnostics는 query guard와 sanitized state transition을 유지한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom, getServerRoomTransportDiagnosticsForE2e } =
      await import("./serverRoom");
    const nonE2eTimers = createManualRecoveryTimers();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: nonE2eTimers.window,
    });
    const nonE2eRoom = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      socketFactory: () => createSocket(),
    });

    assert.equal(getServerRoomTransportDiagnosticsForE2e(nonE2eRoom), null);
    assert.equal(
      "getRoomTransportDiagnosticsForE2e" in (nonE2eRoom as unknown as Record<string, unknown>),
      false,
    );
    nonE2eRoom.dispose();

    const timers = createManualRecoveryTimers("?e2e=1");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: timers.window,
    });
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    let configuredTransports: string[] | null = null;
    let ready = false;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: (_url, socketOptions) => {
        configuredTransports = [...socketOptions.transports];
        return socket;
      },
    });
    const connectionStore = createGameStateStore();
    connectionStore.setSession({
      sessionId: room.sessionId,
      roomId: room.roomId,
      connectionStatus: "connecting",
    });
    const connectionStatuses: RoomEvent["CONNECTION_STATUS"]["connectionStatus"][] = [];
    room.on("CONNECTION_STATUS", ({ connectionStatus }) => {
      connectionStatuses.push(connectionStatus);
      connectionStore.setSession({
        sessionId: room?.sessionId ?? null,
        roomId: room?.roomId ?? null,
        connectionStatus,
      });
    });
    assert.equal(getServerRoomTransportDiagnosticsForE2e(room)?.lastAppliedTerminalRevision, null);
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && socket.subscriptions().length > 0);
    assert.deepEqual(configuredTransports, ["polling", "websocket"]);
    await waitFor(() => {
      const diagnostics = getServerRoomTransportDiagnosticsForE2e(room ?? undefined);
      return diagnostics?.socketConnected === true && diagnostics.recoveryInFlight === false;
    });

    assert.deepEqual(getServerRoomTransportDiagnosticsForE2e(room), {
      socketConnected: true,
      transportState: "connected",
      recoveryAttempt: 0,
      recoveryInFlight: false,
      recoveryTimerScheduled: false,
      subscriptionFailed: false,
      lastAppliedTerminalRevision: snapshots.initial.revision,
      lastSocketErrorKind: null,
      lastSocketConnectErrorClass: null,
      lastRecoveryFailureKind: null,
    });
    assert.deepEqual(connectionStatuses, ["connecting", "online"]);
    assert.equal(connectionStore.getState().session.connectionStatus, "online");

    socket.pushSnapshot(snapshots.transitionLatest);
    assert.equal(
      getServerRoomTransportDiagnosticsForE2e(room)?.lastAppliedTerminalRevision,
      snapshots.terminalTransition.terminalRoomRevision,
    );

    socket.failConnection({
      name: "SocketTransportError",
      message: "WebSocket failed for ws://api.test:4567/socket.io?token=opaque-token",
      description: "session-1",
    });
    assert.deepEqual(getServerRoomTransportDiagnosticsForE2e(room), {
      socketConnected: false,
      transportState: "disconnected",
      recoveryAttempt: 1,
      recoveryInFlight: false,
      recoveryTimerScheduled: true,
      subscriptionFailed: true,
      lastAppliedTerminalRevision: snapshots.terminalTransition.terminalRoomRevision,
      lastSocketErrorKind: "connect_error",
      lastSocketConnectErrorClass: "websocket_error",
      lastRecoveryFailureKind: null,
    });
    assert.equal(connectionStatuses.at(-1), "offline");
    assert.equal(connectionStore.getState().session.connectionStatus, "offline");

    socket.reconnectFromServer();
    await waitFor(() => {
      const diagnostics = getServerRoomTransportDiagnosticsForE2e(room ?? undefined);
      return diagnostics?.socketConnected === true && diagnostics.recoveryInFlight === false;
    });
    assert.deepEqual(getServerRoomTransportDiagnosticsForE2e(room), {
      socketConnected: true,
      transportState: "connected",
      recoveryAttempt: 0,
      recoveryInFlight: false,
      recoveryTimerScheduled: false,
      subscriptionFailed: false,
      lastAppliedTerminalRevision: snapshots.terminalTransition.terminalRoomRevision,
      lastSocketErrorKind: "connect_error",
      lastSocketConnectErrorClass: "websocket_error",
      lastRecoveryFailureKind: null,
    });
    assert.equal(connectionStatuses.at(-1), "online");
    assert.equal(connectionStore.getState().session.connectionStatus, "online");

    const additionalConnectErrorClasses: Array<
      [error: unknown, expected: "timeout" | "server_reject" | "cors" | "unknown"]
    > = [
      [{ description: "connection timed out" }, "timeout"],
      [{ message: "unauthorized room subscription" }, "server_reject"],
      [{ name: "CorsError" }, "cors"],
      [{ name: "opaque transport failure" }, "unknown"],
    ];
    for (const [error, expected] of additionalConnectErrorClasses) {
      socket.failConnection(error);
      assert.equal(
        getServerRoomTransportDiagnosticsForE2e(room)?.lastSocketConnectErrorClass,
        expected,
      );
      socket.reconnectFromServer();
      await waitFor(() => {
        const diagnostics = getServerRoomTransportDiagnosticsForE2e(room ?? undefined);
        return diagnostics?.socketConnected === true && diagnostics.recoveryInFlight === false;
      });
      assert.equal(
        getServerRoomTransportDiagnosticsForE2e(room)?.lastSocketConnectErrorClass,
        expected,
      );
    }

    socket.disconnectFromServer();
    assert.equal(connectionStatuses.at(-1), "offline");
    assert.equal(connectionStore.getState().session.connectionStatus, "offline");
    assert.deepEqual(getServerRoomTransportDiagnosticsForE2e(room), {
      socketConnected: false,
      transportState: "disconnected",
      recoveryAttempt: 1,
      recoveryInFlight: false,
      recoveryTimerScheduled: true,
      subscriptionFailed: false,
      lastAppliedTerminalRevision: snapshots.terminalTransition.terminalRoomRevision,
      lastSocketErrorKind: "disconnect",
      lastSocketConnectErrorClass: "unknown",
      lastRecoveryFailureKind: null,
    });
    socket.pushSubscriptionError();
    assert.equal(
      getServerRoomTransportDiagnosticsForE2e(room)?.lastSocketErrorKind,
      "subscription_error",
    );
    assert.equal(getServerRoomTransportDiagnosticsForE2e(room)?.subscriptionFailed, true);

    socket.pushSnapshot({ malformed: true });
    const invalidSnapshotDiagnostics = getServerRoomTransportDiagnosticsForE2e(room);
    assert.deepEqual(Object.keys(invalidSnapshotDiagnostics ?? {}).sort(), [
      "lastAppliedTerminalRevision",
      "lastRecoveryFailureKind",
      "lastSocketConnectErrorClass",
      "lastSocketErrorKind",
      "recoveryAttempt",
      "recoveryInFlight",
      "recoveryTimerScheduled",
      "socketConnected",
      "subscriptionFailed",
      "transportState",
    ]);
    assert.equal(invalidSnapshotDiagnostics?.lastSocketErrorKind, "invalid_snapshot");
    assert.equal(invalidSnapshotDiagnostics?.lastSocketConnectErrorClass, "unknown");
    const serializedDiagnostics = JSON.stringify(invalidSnapshotDiagnostics);
    for (const rawValue of [
      "ROOM01",
      "player-1",
      "session-1",
      "api.test",
      "opaque-token",
      "SocketTransportError",
    ]) {
      assert.equal(serializedDiagnostics.includes(rawValue), false);
    }
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("round 종료 시각이 되면 authoritative GET으로 완료 상태를 반영한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const deadline = Date.now() + 10_000;
    const roundStarted = createRoundStartedRoomSnapshot(snapshots.initial, 16, deadline);
    const completed = createCompletedRoomSnapshot(roundStarted, 17);
    let ready = false;
    let clockArmed = false;
    let clockRefreshes = 0;
    let latestRoundPhase: RoomEvent["TOURNAMENT_STATE"]["roomRound"]["phase"] | null = null;
    const fetchFixture: typeof fetch = async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      const isClockRefresh =
        clockArmed && (init?.method ?? "GET") === "GET" && !url.searchParams.has("afterRevision");

      if (isClockRefresh) {
        clockRefreshes += 1;
        return jsonResponse(completed);
      }

      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.on("TOURNAMENT_STATE", ({ roomRound }) => {
      latestRoundPhase = roomRound.phase;
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && socket.subscriptions().length > 0);
    await flushAsyncWork();

    clockArmed = true;
    socket.pushSnapshot(roundStarted);
    const scheduledDelay = timers.nextDelay();
    assert.notEqual(scheduledDelay, null);
    assert.ok((scheduledDelay ?? 0) > 0 && (scheduledDelay ?? 0) <= 10_000);

    await timers.runNext();

    assert.equal(clockRefreshes, 1);
    assert.equal(latestRoundPhase, "completed");
    assert.equal(timers.nextDelay(), null);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("round 종료 GET이 같은 상태를 반환하면 bounded backoff로 다시 확인한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const roundStarted = createRoundStartedRoomSnapshot(snapshots.initial, 16, Date.now());
    let ready = false;
    let clockArmed = false;
    let clockRefreshes = 0;
    const fetchFixture: typeof fetch = async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      const isClockRefresh =
        clockArmed && (init?.method ?? "GET") === "GET" && !url.searchParams.has("afterRevision");

      if (isClockRefresh) {
        clockRefreshes += 1;
        return jsonResponse(roundStarted);
      }

      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && socket.subscriptions().length > 0);
    await flushAsyncWork();

    clockArmed = true;
    socket.pushSnapshot(roundStarted);
    assert.equal(timers.nextDelay(), 0);
    await timers.runNext();
    assert.equal(clockRefreshes, 1);
    assert.equal(timers.nextDelay(), 250);

    await timers.runNext();
    assert.equal(clockRefreshes, 2);
    assert.equal(timers.nextDelay(), 500);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("긴 round 대기는 30초로 제한되고 dispose는 stale callback도 무시한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const roundStarted = createRoundStartedRoomSnapshot(
      snapshots.initial,
      16,
      Date.now() + 120_000,
    );
    let ready = false;
    let clockArmed = false;
    let clockRefreshes = 0;
    const fetchFixture: typeof fetch = async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (
        clockArmed &&
        (init?.method ?? "GET") === "GET" &&
        !url.searchParams.has("afterRevision")
      ) {
        clockRefreshes += 1;
      }
      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && socket.subscriptions().length > 0);
    await flushAsyncWork();

    clockArmed = true;
    socket.pushSnapshot(roundStarted);
    assert.equal(timers.nextDelay(), 30_000);
    const staleCallback = timers.captureNextCallback();
    room.dispose();
    staleCallback();
    await flushAsyncWork();

    assert.equal(clockRefreshes, 0);
    assert.equal(timers.nextDelay(), null);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("응답 없는 server room fetch는 제한 시간 뒤 중단되고 재시도 대기 상태가 된다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const request = { signal: null as AbortSignal | null };
    const fetchFixture: typeof fetch = async (_input, init) => {
      request.signal = init?.signal ?? null;
      return await new Promise<Response>(() => {});
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      requestTimeoutMs: 25,
      socketFactory: () => createSocket(),
    });
    room.connect(createPlayerSnapshot());

    await waitFor(() => timers.nextDelay() === 25);
    await timers.runNext();

    assert.equal(request.signal?.aborted, true);
    assert.equal(timers.nextDelay(), 250);
    room.dispose();
    assert.equal(timers.nextDelay(), null);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("header 뒤 멈춘 response body도 같은 제한 시간으로 중단한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const request = { signal: null as AbortSignal | null };
    let bodyReadStarted = false;
    const stalledResponse = new Response(null, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    Object.defineProperty(stalledResponse, "text", {
      configurable: true,
      value: () => {
        bodyReadStarted = true;
        return new Promise<string>(() => {});
      },
    });
    const fetchFixture: typeof fetch = async (_input, init) => {
      request.signal = init?.signal ?? null;
      return stalledResponse;
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      requestTimeoutMs: 25,
      socketFactory: () => createSocket(),
    });
    room.connect(createPlayerSnapshot());

    await waitFor(() => bodyReadStarted && timers.nextDelay() === 25);
    await timers.runNext();

    assert.equal(request.signal?.aborted, true);
    assert.equal(timers.nextDelay(), 250);
    room.dispose();
    assert.equal(timers.nextDelay(), null);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("reconnect 뒤 clear된 queued recovery timer는 추가 GET을 dispatch하지 않는다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    let ready = false;
    let recoveryRequests = 0;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (url.searchParams.has("afterRevision")) {
        recoveryRequests += 1;
      }
      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && socket.subscriptions().length > 0 && recoveryRequests > 0);
    await flushAsyncWork();

    socket.disconnectFromServer();
    assert.equal(timers.nextDelay(), 250);
    const queuedRecoveryTimer = timers.captureNextCallback();
    const recoveryCountBeforeReconnect = recoveryRequests;

    socket.reconnectFromServer();
    await waitFor(() => recoveryRequests === recoveryCountBeforeReconnect + 1);
    await flushAsyncWork();
    const recoveryCountAfterReconnect = recoveryRequests;

    queuedRecoveryTimer();
    await flushAsyncWork();
    assert.equal(recoveryRequests, recoveryCountAfterReconnect);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("socket 미연결 recovery 성공은 polling backoff를 초기화하지 않는다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket(false);
    const snapshots = createRoomSnapshots();
    let ready = false;
    let recoveryRequests = 0;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (url.searchParams.has("afterRevision")) {
        recoveryRequests += 1;
      }
      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready);

    socket.failConnection();
    const expectedDelays = [250, 500, 1_000, 2_000, 4_000, 5_000];
    for (const [index, expectedDelay] of expectedDelays.entries()) {
      assert.equal(timers.nextDelay(), expectedDelay);
      await timers.runNext();
      await waitFor(() => recoveryRequests === index + 1);
    }
    assert.equal(recoveryRequests, expectedDelays.length);
    assert.equal(timers.nextDelay(), 5_000);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("8개 terminal transition 페이지는 cursor 전진 시 즉시 다음 페이지를 요청한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket(false);
    const snapshots = createRoomSnapshots();
    const pagedTransitions = createEightTerminalTransitionPage();
    let ready = false;
    let recoveryRequests = 0;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (!url.searchParams.has("afterRevision")) {
        return jsonResponse(snapshots.initial);
      }

      recoveryRequests += 1;
      if (recoveryRequests === 1) {
        return jsonResponse(pagedTransitions);
      }

      return new Promise<Response>(() => {});
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready);

    socket.failConnection();
    assert.equal(timers.nextDelay(), 250);
    await timers.runNext();
    await waitFor(() => recoveryRequests === 2);
    assert.equal(timers.nextDelay(), 10_000);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("외부 terminal recovery가 대기 중이면 8개 페이지도 backoff로 재시도한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket(false);
    const snapshots = createRoomSnapshots();
    const pagedTransitions = createEightTerminalTransitionPage();
    const mismatchedInitial = {
      ...snapshots.initial,
      participants: snapshots.initial.participants.map((participant, index) =>
        index === 0 ? { ...participant, connected: false } : participant,
      ),
    };
    let ready = false;
    let recoveryRequests = 0;
    let releaseFirstRecovery: (() => void) | undefined;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (!url.searchParams.has("afterRevision")) {
        return jsonResponse(snapshots.initial);
      }

      recoveryRequests += 1;
      if (recoveryRequests === 1) {
        return new Promise<Response>(resolve => {
          releaseFirstRecovery = () => resolve(jsonResponse(pagedTransitions));
        });
      }

      return jsonResponse(pagedTransitions);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready);

    socket.failConnection();
    await timers.runNext();
    await waitFor(() => releaseFirstRecovery !== undefined);
    socket.pushSnapshot(mismatchedInitial);
    releaseFirstRecovery?.();
    await flushAsyncWork();
    await waitFor(() => timers.nextDelay() === 500);

    assert.equal(recoveryRequests, 1);
    assert.equal(timers.nextDelay(), 500);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("persistent same-revision mismatch recovery는 즉시 재귀하지 않는다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const mismatched = {
      ...snapshots.initial,
      participants: snapshots.initial.participants.map((participant, index) =>
        index === 0 ? { ...participant, connected: false } : participant,
      ),
    };
    let ready = false;
    let initialRecoveryCompleted = false;
    let persistentMismatchEnabled = false;
    let mismatchRecoveryRequests = 0;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (!url.searchParams.has("afterRevision")) {
        return jsonResponse(snapshots.initial);
      }
      if (!persistentMismatchEnabled) {
        initialRecoveryCompleted = true;
        return jsonResponse(snapshots.initial);
      }

      mismatchRecoveryRequests += 1;
      if (mismatchRecoveryRequests === 1) {
        return jsonResponse(mismatched);
      }
      return new Promise<Response>(() => {});
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && initialRecoveryCompleted);
    await flushAsyncWork();

    persistentMismatchEnabled = true;
    socket.pushSnapshot(mismatched);
    await waitFor(() => mismatchRecoveryRequests >= 1);
    await flushAsyncWork();

    assert.equal(mismatchRecoveryRequests, 1);
    assert.equal(timers.nextDelay(), 250);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("E2E recovery failure diagnostics는 원인을 분류하고 안정화 시 초기화한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers("?e2e=1");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom, getServerRoomTransportDiagnosticsForE2e } =
      await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const mismatched = {
      ...snapshots.initial,
      participants: snapshots.initial.participants.map((participant, index) =>
        index === 0 ? { ...participant, connected: false } : participant,
      ),
    };
    let recoveryMode: "valid" | "hold" | "malformed" | "server-error" = "valid";
    let releaseRecovery: ((response: Response) => void) | undefined;
    let ready = false;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (!url.searchParams.has("afterRevision")) {
        return jsonResponse(snapshots.initial);
      }
      if (recoveryMode === "hold") {
        return new Promise<Response>(resolve => {
          releaseRecovery = resolve;
        });
      }
      if (recoveryMode === "malformed") {
        return jsonResponse({ malformed: true });
      }
      if (recoveryMode === "server-error") {
        return jsonResponse({}, 500);
      }
      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && socket.subscriptions().length > 0);
    await waitFor(() => {
      const diagnostics = getServerRoomTransportDiagnosticsForE2e(room ?? undefined);
      return diagnostics?.recoveryInFlight === false;
    });

    recoveryMode = "hold";
    socket.pushSnapshot(mismatched);
    await waitFor(
      () =>
        getServerRoomTransportDiagnosticsForE2e(room ?? undefined)?.lastRecoveryFailureKind ===
        "canonical_mismatch",
    );
    assert.equal(getServerRoomTransportDiagnosticsForE2e(room)?.subscriptionFailed, true);
    releaseRecovery?.(jsonResponse(snapshots.initial));
    recoveryMode = "valid";
    await waitFor(() => {
      const diagnostics = getServerRoomTransportDiagnosticsForE2e(room ?? undefined);
      return (
        diagnostics?.recoveryInFlight === false && diagnostics.lastRecoveryFailureKind === null
      );
    });

    recoveryMode = "malformed";
    socket.pushSnapshot(mismatched);
    await waitFor(
      () =>
        getServerRoomTransportDiagnosticsForE2e(room ?? undefined)?.lastRecoveryFailureKind ===
        "recovery_parse",
    );
    assert.equal(getServerRoomTransportDiagnosticsForE2e(room)?.subscriptionFailed, true);
    socket.pushSnapshot(snapshots.initial);
    await waitFor(
      () =>
        getServerRoomTransportDiagnosticsForE2e(room ?? undefined)?.lastRecoveryFailureKind ===
        null,
    );

    recoveryMode = "server-error";
    socket.pushSnapshot(mismatched);
    await waitFor(
      () =>
        getServerRoomTransportDiagnosticsForE2e(room ?? undefined)?.lastRecoveryFailureKind ===
        "unknown",
    );
    socket.pushSnapshot(snapshots.initial);
    await waitFor(
      () =>
        getServerRoomTransportDiagnosticsForE2e(room ?? undefined)?.lastRecoveryFailureKind ===
        null,
    );

    const unsubscribe = room.on("COMPETITIVE_STATE", () => {
      throw new Error("forced-transition-failure");
    });
    recoveryMode = "hold";
    socket.pushSnapshot(snapshots.transitionLatest);
    await waitFor(
      () =>
        getServerRoomTransportDiagnosticsForE2e(room ?? undefined)?.lastRecoveryFailureKind ===
        "transition_merge",
    );
    unsubscribe();
    releaseRecovery?.(jsonResponse(snapshots.initial));
    recoveryMode = "valid";
    await waitFor(() => {
      const diagnostics = getServerRoomTransportDiagnosticsForE2e(room ?? undefined);
      return (
        diagnostics?.recoveryInFlight === false && diagnostics.lastRecoveryFailureKind === null
      );
    });

    const serializedDiagnostics = JSON.stringify(getServerRoomTransportDiagnosticsForE2e(room));
    for (const rawValue of [
      "ROOM01",
      "player-1",
      "session-1",
      "api.test",
      "forced-transition-failure",
    ]) {
      assert.equal(serializedDiagnostics.includes(rawValue), false);
    }
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("same-revision 중첩 record key 순서 차이는 recovery를 시작하지 않는다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers("?e2e=1");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom, getServerRoomTransportDiagnosticsForE2e } =
      await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const initial = {
      ...snapshots.initial,
      partySnapshots: {
        "player-1": {
          playerId: "player-1",
          displayName: "Player 1",
          updatedAtMs: 1,
        },
        "player-2": {
          playerId: "player-2",
          displayName: "Player 2",
          updatedAtMs: 2,
        },
      },
      tournament: {
        ...snapshots.initial.tournament,
        cumulativeScores: {
          "player-1": 0,
          "player-2": 0,
        },
      },
    };
    const reordered = reverseNestedObjectKeyOrder(initial);
    let ready = false;
    let recoveryRequests = 0;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (url.searchParams.has("afterRevision")) {
        recoveryRequests += 1;
      }
      return jsonResponse(initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && socket.subscriptions().length > 0 && recoveryRequests > 0);
    await waitFor(() => {
      const diagnostics = getServerRoomTransportDiagnosticsForE2e(room ?? undefined);
      return diagnostics?.recoveryInFlight === false;
    });

    const recoveryRequestsBeforeReorderedSnapshot = recoveryRequests;
    socket.pushSnapshot(reordered);
    await flushAsyncWork();

    const diagnostics = getServerRoomTransportDiagnosticsForE2e(room);
    assert.equal(recoveryRequests, recoveryRequestsBeforeReorderedSnapshot);
    assert.equal(timers.nextDelay(), null);
    assert.equal(diagnostics?.recoveryTimerScheduled, false);
    assert.equal(diagnostics?.subscriptionFailed, false);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("같은 room revision의 경쟁전 제출과 turn 전진을 정상 적용한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { href: "http://web.test/game", search: "" },
      setTimeout,
      clearTimeout,
    },
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    let ready = false;
    let recoveryRequests = 0;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (url.searchParams.has("afterRevision")) {
        recoveryRequests += 1;
      }
      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    const received: RoomEvent["COMPETITIVE_STATE"][] = [];
    room.on("COMPETITIVE_STATE", payload => received.push(payload));
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && socket.subscriptions().length > 0);
    await flushAsyncWork();

    socket.pushSnapshot(snapshots.activeOld);
    const recoveryRequestsBeforeAdvance = recoveryRequests;
    const submittedPlayerId = snapshots.activeOld.competitive!.playerIds[0];
    const submitted = {
      ...snapshots.activeOld,
      competitive: {
        ...snapshots.activeOld.competitive!,
        submittedPlayerIds: [submittedPlayerId],
      },
    };
    socket.pushSnapshot(submitted);
    socket.pushSnapshot({
      ...submitted,
      competitive: {
        ...submitted.competitive,
        currentTurn: 1,
        currentState: { ...submitted.competitive.currentState, turn: 1 },
        stateHash: "c".repeat(64),
        submittedPlayerIds: [],
      },
    });
    await flushAsyncWork();

    assert.deepEqual(
      received.map(({ projection }) => [projection.currentTurn, projection.submittedPlayerIds]),
      [
        [0, []],
        [0, [submittedPlayerId]],
        [1, []],
      ],
    );
    assert.equal(recoveryRequests, recoveryRequestsBeforeAdvance);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("지연된 경쟁전 projection은 최신 assignment와 turn 및 제출 상태를 덮지 않는다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { href: "http://web.test/game", search: "" },
      setTimeout,
      clearTimeout,
    },
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    let ready = false;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready && socket.subscriptions().length > 0);

    const turnOne = {
      ...snapshots.activeOld,
      competitive: {
        ...snapshots.activeOld.competitive!,
        currentTurn: 1,
        currentState: { ...snapshots.activeOld.competitive!.currentState, turn: 1 },
        stateHash: "c".repeat(64),
        submittedPlayerIds: [],
      },
    };
    const turnOneSubmitted = {
      ...turnOne,
      competitive: {
        ...turnOne.competitive,
        submittedPlayerIds: [turnOne.competitive.playerIds[0]],
      },
    };
    socket.pushSnapshot(turnOne);
    socket.pushSnapshot(turnOneSubmitted);

    const received: RoomEvent["COMPETITIVE_STATE"][] = [];
    const unsubscribe = room.on("COMPETITIVE_STATE", payload => received.push(payload));
    received.length = 0;

    const withoutCompetitive: Record<string, unknown> = { ...turnOneSubmitted };
    delete withoutCompetitive.competitive;
    socket.pushSnapshot(withoutCompetitive);
    socket.pushSnapshot(turnOne);
    socket.pushSnapshot({
      ...turnOneSubmitted,
      competitive: {
        ...turnOneSubmitted.competitive,
        status: "pending" as const,
      },
    });
    socket.pushSnapshot({
      ...turnOneSubmitted,
      competitive: {
        ...turnOneSubmitted.competitive,
        stateHash: "e".repeat(64),
      },
    });
    socket.pushSnapshot(snapshots.activeOld);

    const nextAssignment = {
      ...turnOneSubmitted,
      competitive: {
        ...snapshots.activeOld.competitive!,
        matchId: "223e4567-e89b-42d3-a456-426614174000",
        assignmentRevision: 2,
        status: "pending" as const,
      },
    };
    socket.pushSnapshot(nextAssignment);
    socket.pushSnapshot({
      ...turnOneSubmitted,
      competitive: {
        ...turnOneSubmitted.competitive,
        currentTurn: 99,
        currentState: { ...turnOneSubmitted.competitive.currentState, turn: 99 },
        stateHash: "d".repeat(64),
      },
    });

    assert.deepEqual(
      received.map(({ projection }) => [
        projection.matchId,
        projection.assignmentRevision,
        projection.currentTurn,
        projection.status,
        projection.submittedPlayerIds,
      ]),
      [[nextAssignment.competitive.matchId, 2, 0, "pending", []]],
    );
    unsubscribe();

    const replayed: RoomEvent["COMPETITIVE_STATE"][] = [];
    room.on("COMPETITIVE_STATE", payload => replayed.push(payload));
    assert.deepEqual(
      replayed.map(({ projection }) => [
        projection.matchId,
        projection.assignmentRevision,
        projection.currentTurn,
      ]),
      [[nextAssignment.competitive.matchId, 2, 0]],
    );
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("BattleScene은 최신 snapshot을 적용하고 WorldScene 재구독에도 replay한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { href: "http://web.test/game", search: "" },
      setTimeout,
      clearTimeout,
    },
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const calls: string[] = [];
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      calls.push(url.pathname);

      return new Response(JSON.stringify(snapshots.initial), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    const store = createGameStateStore();
    const applyProjection = (payload: RoomEvent["TOURNAMENT_STATE"]) => {
      store.applyTournamentSnapshotFromRoom(payload, Date.now());
    };
    const unsubscribe = room.on("TOURNAMENT_STATE", applyProjection);

    room.connect({
      sessionId: "session-1",
      playerId: "player-1",
      displayName: "Player 1",
      map: "new-bark-town",
      x: 656,
      y: 1150,
      facing: "front",
    });
    await waitFor(() => calls.some(path => path.endsWith("/ready")));
    assert.equal(store.getState().tournament.serverProjection?.revision, 15);
    assert.equal(store.getState().tournament.serverProjection?.roomCode, "ROOM01");
    assert.deepEqual(store.getState().tournament.serverProjection?.roomRound, {
      index: 1,
      phase: "tournament",
      durationMs: 300_000,
      startedAtMs: 1_000,
      endsAtMs: 301_000,
    });
    assert.deepEqual(store.getState().tournament.serverProjection?.participants[0], {
      playerId: "player-1",
      displayName: "Player 1",
      role: "participant",
      ready: true,
      connected: true,
      seed: 1,
    });
    assert.equal(store.getState().tournament.serverProjection?.competitionKind, "casual-unranked");

    const battleStore = createGameStateStore();
    const unsubscribeBattle = room.on("TOURNAMENT_STATE", payload => {
      battleStore.applyTournamentSnapshotFromRoom(payload, Date.now());
    });
    assert.equal(battleStore.getState().tournament.serverProjection?.revision, 15);

    unsubscribe();
    socket.pushSnapshot(snapshots.latest);
    assert.equal(store.getState().tournament.serverProjection?.revision, 15);
    assert.equal(battleStore.getState().tournament.serverProjection?.revision, 50);
    assert.equal(
      battleStore.getState().tournament.serverProjection?.competitionKind,
      "tournament-unranked",
    );
    unsubscribeBattle();

    room.on("TOURNAMENT_STATE", applyProjection);

    assert.equal(store.getState().tournament.serverProjection?.revision, 50);
    assert.equal(
      store.getState().tournament.session?.tournament.completedRounds.length,
      snapshots.latest.tournament.bracket.completedRounds.length,
    );

    const assignments: RoomEvent["COMPETITIVE_ASSIGNMENT"][] = [];
    const unsubscribeAssignment = room.on("COMPETITIVE_ASSIGNMENT", payload => {
      assignments.push(payload);
    });
    assert.equal(assignments.length, 1);
    assert.equal(
      assignments[0]?.projection.bracketMatchId,
      snapshots.latest.tournament.activeMatchId,
    );

    unsubscribeAssignment();
    socket.pushSnapshot(snapshots.completedLatest);
    const staleAssignments: RoomEvent["COMPETITIVE_ASSIGNMENT"][] = [];
    room.on("COMPETITIVE_ASSIGNMENT", payload => {
      staleAssignments.push(payload);
    });
    assert.equal(staleAssignments.length, 1);
    assert.equal(staleAssignments[0]?.projection.matchId, snapshots.latest.competitive?.matchId);
  } finally {
    room?.dispose();
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("listener가 없는 동안 terminal을 cache하고 terminal에서 current 순서로 replay한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { href: "http://web.test/game", search: "" },
      setTimeout,
      clearTimeout,
    },
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    let ready = false;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");

      return new Response(JSON.stringify(snapshots.initial), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready);

    socket.pushSnapshot(snapshots.transitionLatest);

    const replayed: RoomEvent["COMPETITIVE_STATE"][] = [];
    room.on("COMPETITIVE_STATE", payload => replayed.push(payload));

    assert.deepEqual(
      replayed.map(({ projection }) => [projection.matchId, projection.status]),
      [
        [snapshots.completedOldCompetitive.matchId, "completed"],
        [snapshots.latest.competitive?.matchId, "active"],
      ],
    );
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("completed bracket grace는 terminal cursor로 복구하고 lower snapshot terminal만 적용한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { href: "http://web.test/game", search: "" },
      setTimeout,
      clearTimeout,
    },
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const recoveryAfterRevisions: number[] = [];
    let ready = false;
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      const afterRevision = url.searchParams.get("afterRevision");
      if (afterRevision !== null) {
        recoveryAfterRevisions.push(Number(afterRevision));
      }

      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready);
    await waitFor(() => socket.subscriptions().length > 0);

    socket.pushSnapshot(snapshots.activeOld);
    const recoveryCountBeforeGrace = recoveryAfterRevisions.length;
    socket.pushSnapshot(snapshots.latest);
    await waitFor(() => recoveryAfterRevisions.length > recoveryCountBeforeGrace);
    assert.equal(recoveryAfterRevisions.at(-1), 15);

    const received: RoomEvent["COMPETITIVE_STATE"][] = [];
    room.on("COMPETITIVE_STATE", payload => received.push(payload));
    assert.equal(received.at(-1)?.projection.matchId, snapshots.latest.competitive?.matchId);
    received.length = 0;

    const lowerProjection = {
      ...snapshots.completedOldCompetitive,
      terminalEventId: "terminal-event-room01-revision-49",
      terminalRoomRevision: 49,
    };
    socket.pushSnapshot({
      ...snapshots.transitionLatest,
      revision: 49,
      competitiveTransitions: [
        {
          terminalEventId: lowerProjection.terminalEventId,
          terminalRoomRevision: lowerProjection.terminalRoomRevision,
          projection: lowerProjection,
        },
      ],
    });
    assert.deepEqual(
      received.map(({ projection }) => [projection.matchId, projection.status]),
      [[snapshots.completedOldCompetitive.matchId, "completed"]],
    );

    const mismatchedDuplicateProjection = {
      ...snapshots.completedOldCompetitive,
      terminalEventId: "terminal-event-room01-revision-51",
      terminalRoomRevision: 51,
    };
    socket.pushSnapshot({
      ...snapshots.transitionLatest,
      revision: 51,
      competitiveTransitions: [
        {
          terminalEventId: mismatchedDuplicateProjection.terminalEventId,
          terminalRoomRevision: mismatchedDuplicateProjection.terminalRoomRevision,
          projection: mismatchedDuplicateProjection,
        },
      ],
    });

    const replayed: RoomEvent["COMPETITIVE_STATE"][] = [];
    room.on("COMPETITIVE_STATE", payload => replayed.push(payload));
    assert.deepEqual(
      replayed.map(({ projection }) => [projection.matchId, projection.status]),
      [
        [snapshots.completedOldCompetitive.matchId, "completed"],
        [snapshots.latest.competitive?.matchId, "active"],
      ],
    );

    socket.disconnectFromServer();
    socket.reconnectFromServer();
    assert.equal(socket.subscriptions().at(-1)?.afterRevision, 49);

    socket.pushSnapshot({
      ...snapshots.transitionLatest,
      revision: 52,
      competitiveTransitions: [
        {
          ...snapshots.terminalTransition,
          terminalEventId: "mismatched-outer-event",
        },
      ],
    });
    socket.disconnectFromServer();
    socket.reconnectFromServer();
    assert.equal(socket.subscriptions().at(-1)?.afterRevision, 49);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

for (const deliveryOrder of ["rest-first", "socket-first"] as const) {
  test(`${deliveryOrder} terminal delivery는 event ID로 dedup하고 current assignment를 보존한다`, async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: { href: "http://web.test/game", search: "" },
        setTimeout,
        clearTimeout,
      },
    });
    let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

    try {
      const { createServerRoom } = await import("./serverRoom");
      const socket = createSocket();
      const snapshots = createRoomSnapshots();
      let actionRequests = 0;
      let ready = false;
      const fetchFixture: typeof fetch = async input => {
        const url = new URL(typeof input === "string" ? input : input.toString());
        ready ||= url.pathname.endsWith("/ready");
        if (url.pathname.endsWith("/competitive-seat")) {
          return jsonResponse(null, 201);
        }
        if (url.pathname.includes("/actions")) {
          actionRequests += 1;
          return jsonResponse(snapshots.completedOldCompetitive, 201);
        }

        return jsonResponse(snapshots.initial);
      };
      room = createServerRoom({
        roomId: "ROOM01",
        playerId: "player-1",
        sessionId: "session-1",
        fetch: fetchFixture,
        idToken: "id-token",
        socketFactory: () => socket,
      });
      const received: RoomEvent["COMPETITIVE_STATE"][] = [];
      room.on("COMPETITIVE_STATE", payload => received.push(payload));
      room.connect(createPlayerSnapshot());
      await waitFor(() => ready);

      const submit = () =>
        room?.send("COMPETITIVE_ACTION", {
          matchId: snapshots.completedOldCompetitive.matchId,
          assignmentRevision: snapshots.completedOldCompetitive.assignmentRevision,
          turn: 0,
          clientCommandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          action: { kind: "move", moveId: "steady-strike" },
        });

      if (deliveryOrder === "rest-first") {
        submit();
        await waitFor(() => actionRequests === 1);
        await new Promise(resolve => setTimeout(resolve, 0));
        socket.pushSnapshot(snapshots.transitionLatest);
      } else {
        socket.pushSnapshot(snapshots.transitionLatest);
        submit();
        await waitFor(() => actionRequests === 1);
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      assert.deepEqual(
        received.map(({ projection }) => projection.matchId),
        [snapshots.completedOldCompetitive.matchId, snapshots.latest.competitive?.matchId],
      );
    } finally {
      room?.dispose();
      restoreWindow(originalWindow);
    }
  });
}

for (const delayedSource of ["action", "seat"] as const) {
  test(`Socket next assignment 이후 지연된 old ${delayedSource} projection은 current를 덮지 않는다`, async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://api.test";
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: { href: "http://web.test/game", search: "" },
        setTimeout,
        clearTimeout,
      },
    });
    let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

    try {
      const { createServerRoom } = await import("./serverRoom");
      const socket = createSocket();
      const snapshots = createRoomSnapshots();
      let delayedRequestStarted = false;
      const delayedResponseGate: { release?: () => void } = {};
      let ready = false;
      const fetchFixture: typeof fetch = async input => {
        const url = new URL(typeof input === "string" ? input : input.toString());
        ready ||= url.pathname.endsWith("/ready");

        if (url.pathname.endsWith("/competitive-seat")) {
          if (delayedSource === "seat") {
            delayedRequestStarted = true;
            return new Promise<Response>(resolve => {
              delayedResponseGate.release = () =>
                resolve(jsonResponse(snapshots.activeOld.competitive, 201));
            });
          }
          return jsonResponse(null, 201);
        }
        if (url.pathname.includes("/actions")) {
          delayedRequestStarted = true;
          return new Promise<Response>(resolve => {
            delayedResponseGate.release = () =>
              resolve(jsonResponse(snapshots.activeOld.competitive, 201));
          });
        }

        return jsonResponse(snapshots.initial);
      };
      room = createServerRoom({
        roomId: "ROOM01",
        playerId: "player-1",
        sessionId: "session-1",
        fetch: fetchFixture,
        idToken: "id-token",
        socketFactory: () => socket,
      });
      room.connect(createPlayerSnapshot());

      if (delayedSource === "action") {
        await waitFor(() => ready);
        socket.pushSnapshot(snapshots.activeOld);
        room.send("COMPETITIVE_ACTION", {
          matchId: snapshots.activeOld.competitive!.matchId,
          assignmentRevision: snapshots.activeOld.competitive!.assignmentRevision,
          turn: snapshots.activeOld.competitive!.currentTurn,
          clientCommandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          action: { kind: "move", moveId: "steady-strike" },
        });
      }

      await waitFor(() => delayedRequestStarted && delayedResponseGate.release !== undefined);
      socket.pushSnapshot(snapshots.transitionLatest);
      delayedResponseGate.release?.();
      await new Promise(resolve => setTimeout(resolve, 10));

      const replayed: RoomEvent["COMPETITIVE_STATE"][] = [];
      room.on("COMPETITIVE_STATE", payload => replayed.push(payload));
      assert.deepEqual(
        replayed.map(({ projection }) => [projection.matchId, projection.status]),
        [
          [snapshots.completedOldCompetitive.matchId, "completed"],
          [snapshots.latest.competitive?.matchId, "active"],
        ],
      );
    } finally {
      room?.dispose();
      restoreWindow(originalWindow);
    }
  });
}

test("legacy terminal metadata 응답은 current cache를 덮지 않고 room recovery로 수렴한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { href: "http://web.test/game", search: "" },
      setTimeout,
      clearTimeout,
    },
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    let actionRequests = 0;
    let recoveryRequests = 0;
    let legacyActionReturned = false;
    let ready = false;
    const metadataRecoveryGate: { release?: () => void } = {};
    const fetchFixture: typeof fetch = async input => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (url.pathname.endsWith("/competitive-seat")) {
        return jsonResponse(null, 201);
      }
      if (url.pathname.includes("/actions")) {
        actionRequests += 1;
        const legacy = { ...snapshots.completedOldCompetitive } as Record<string, unknown>;
        delete legacy.terminalEventId;
        delete legacy.terminalRoomRevision;
        legacyActionReturned = true;
        return jsonResponse(legacy, 201);
      }
      if (url.searchParams.has("afterRevision")) {
        recoveryRequests += 1;
        if (legacyActionReturned) {
          return new Promise<Response>(resolve => {
            metadataRecoveryGate.release = () => resolve(jsonResponse(snapshots.transitionLatest));
          });
        }
        return jsonResponse(snapshots.initial);
      }

      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      idToken: "id-token",
      socketFactory: () => socket,
    });
    room.connect(createPlayerSnapshot());
    await waitFor(() => ready);
    await waitFor(() => recoveryRequests > 0);
    const recoveryRequestsBeforeAction = recoveryRequests;
    socket.pushSnapshot(snapshots.latest);
    const received: RoomEvent["COMPETITIVE_STATE"][] = [];
    room.on("COMPETITIVE_STATE", payload => received.push(payload));
    assert.deepEqual(
      received.map(({ projection }) => [projection.matchId, projection.status]),
      [[snapshots.latest.competitive?.matchId, "active"]],
    );
    received.length = 0;

    room.send("COMPETITIVE_ACTION", {
      matchId: snapshots.completedOldCompetitive.matchId,
      assignmentRevision: snapshots.completedOldCompetitive.assignmentRevision,
      turn: 0,
      clientCommandId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      action: { kind: "move", moveId: "steady-strike" },
    });
    await waitFor(() => actionRequests === 1);
    await waitFor(() => metadataRecoveryGate.release !== undefined);
    assert.equal(recoveryRequests, recoveryRequestsBeforeAction + 1);
    assert.equal(received.length, 0);

    const cachedBeforeRecovery: RoomEvent["COMPETITIVE_STATE"][] = [];
    const unsubscribeCacheProbe = room.on("COMPETITIVE_STATE", payload =>
      cachedBeforeRecovery.push(payload),
    );
    assert.deepEqual(
      cachedBeforeRecovery.map(({ projection }) => [projection.matchId, projection.status]),
      [[snapshots.latest.competitive?.matchId, "active"]],
    );
    unsubscribeCacheProbe();

    metadataRecoveryGate.release?.();
    await waitFor(() => received.length === 2);
    assert.deepEqual(
      received.map(({ projection }) => [projection.matchId, projection.status]),
      [
        [snapshots.completedOldCompetitive.matchId, "completed"],
        [snapshots.latest.competitive?.matchId, "active"],
      ],
    );
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("초기 ready revision conflict 뒤 단계 workflow를 재개한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const readyIdempotencyKeys: string[] = [];
    let readyRequests = 0;
    const fetchFixture: typeof fetch = async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      if (!url.pathname.endsWith("/ready")) {
        return jsonResponse(snapshots.initial);
      }

      readyRequests += 1;
      readyIdempotencyKeys.push(new Headers(init?.headers).get("X-Idempotency-Key") ?? "");
      if (readyRequests === 1) {
        return jsonResponse(
          {
            statusCode: 409,
            code: "POKE_LOUNGE_REVISION_CONFLICT",
            message: "revision conflict",
            snapshot: snapshots.initial,
          },
          409,
        );
      }

      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });

    room.connect(createPlayerSnapshot());
    await waitFor(() => readyRequests === 1);
    assert.equal(timers.nextDelay(), 250);

    await timers.runNext();
    await waitFor(() => readyRequests === 2);

    assert.notEqual(readyIdempotencyKeys[0], "");
    assert.notEqual(readyIdempotencyKeys[1], "");
    assert.notEqual(readyIdempotencyKeys[0], readyIdempotencyKeys[1]);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("create 응답 전 transport 실패는 같은 idempotency key로 방 생성을 복구한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers("?create=1&network=server");
  const fixtureWindow = timers.window as typeof timers.window & {
    history: { state: null; replaceState(state: unknown, title: string, url?: string | URL): void };
  };
  fixtureWindow.history = {
    state: null,
    replaceState(_state, _title, url) {
      if (url) {
        fixtureWindow.location.href = String(url);
      }
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: fixtureWindow,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const createIdempotencyKeys: string[] = [];
    let createRequests = 0;
    let ready = false;
    const fetchFixture: typeof fetch = async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      if (url.pathname === "/poke-lounge/rooms") {
        createRequests += 1;
        createIdempotencyKeys.push(new Headers(init?.headers).get("X-Idempotency-Key") ?? "");
        if (createRequests <= 2) {
          throw new TypeError("connection reset after commit");
        }
      }
      ready ||= url.pathname.endsWith("/ready");
      return jsonResponse(snapshots.initial);
    };
    room = createServerRoom({
      createRoom: true,
      playerId: "player-1",
      sessionId: "session-1",
      fetch: fetchFixture,
      socketFactory: () => socket,
    });

    room.connect(createPlayerSnapshot());
    await waitFor(() => createRequests === 2);
    assert.equal(timers.nextDelay(), 250);

    await timers.runNext();
    await waitFor(() => createRequests === 3 && ready);

    assert.equal(new Set(createIdempotencyKeys).size, 1);
    assert.notEqual(createIdempotencyKeys[0], "");
    assert.equal(room.roomId, snapshots.initial.roomCode);
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

test("casual result 복구 재전송은 최초 body와 idempotency key를 그대로 재사용한다", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://api.test";
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const timers = createManualRecoveryTimers();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: timers.window,
  });
  let room: ReturnType<(typeof import("./serverRoom"))["createServerRoom"]> | null = null;

  try {
    const { createServerRoom } = await import("./serverRoom");
    const socket = createSocket();
    const snapshots = createRoomSnapshots();
    const activeMatch = getReadyTournamentMatches(snapshots.initial.tournament.bracket)[0];
    if (!activeMatch) {
      throw new Error("Expected an active casual match");
    }
    const [winnerPlayerId] = activeMatch.participantIds;
    const resultRequests: Array<{ body: string; idempotencyKey: string }> = [];
    let ready = false;
    const fetchFixture: typeof fetch = async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      ready ||= url.pathname.endsWith("/ready");
      if (!url.pathname.endsWith("/result")) {
        return jsonResponse(snapshots.initial);
      }

      resultRequests.push({
        body: typeof init?.body === "string" ? init.body : "",
        idempotencyKey: new Headers(init?.headers).get("X-Idempotency-Key") ?? "",
      });
      if (resultRequests.length <= 2) {
        throw new TypeError("result response lost");
      }

      return jsonResponse(snapshots.latest);
    };
    room = createServerRoom({
      roomId: "ROOM01",
      playerId: winnerPlayerId,
      sessionId: `session-${winnerPlayerId}`,
      fetch: fetchFixture,
      socketFactory: () => socket,
    });
    room.connect({
      ...createPlayerSnapshot(),
      playerId: winnerPlayerId,
      sessionId: `session-${winnerPlayerId}`,
    });
    await waitFor(() => ready);

    room.send("TOURNAMENT_MATCH_RESULT", {
      roundIndex: snapshots.initial.round.index,
      matchId: activeMatch.matchId,
      winnerPlayerId,
      reason: "faint",
    });
    await waitFor(() => resultRequests.length === 3);

    assert.equal(new Set(resultRequests.map(request => request.body)).size, 1);
    assert.equal(new Set(resultRequests.map(request => request.idempotencyKey)).size, 1);
    assert.notEqual(resultRequests[0]?.idempotencyKey, "");
  } finally {
    room?.dispose();
    restoreWindow(originalWindow);
  }
});

function createPlayerSnapshot() {
  return {
    sessionId: "session-1",
    playerId: "player-1",
    displayName: "Player 1",
    map: "new-bark-town",
    x: 656,
    y: 1150,
    facing: "front" as const,
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function restoreWindow(originalWindow: PropertyDescriptor | undefined): void {
  if (originalWindow) {
    Object.defineProperty(globalThis, "window", originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
}
