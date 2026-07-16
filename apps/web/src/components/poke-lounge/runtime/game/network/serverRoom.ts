import { getApiBaseUrl } from "@/lib/constants";
import type { components } from "@/types/api";
import { io } from "socket.io-client";
import type {
  CompetitiveProjection,
  CompetitiveTerminalTransition,
  MultiplayerRoom,
  PlayerSnapshot,
  RoomEvent,
  RoomMessage,
} from "./localPreviewRoom";
import {
  CompetitiveProjectionSchemaError,
  parseCompetitiveProjection,
  parseCompetitiveProjectionContract,
  parseCompetitiveRoomSnapshotContract,
} from "./competitive-projection";
import {
  findCurrentMatch,
  mapServerTournamentPlayerIds,
  parseServerTournamentState,
  type ServerTournamentState,
  TournamentProjectionSchemaError,
  type TournamentStateRoomPayload,
} from "./tournament-projection";

type Handler<T extends RoomMessage> = (payload: RoomEvent[T]) => void;

type ApiServerRoom = components["schemas"]["PokeLoungeRoomResponseDto"];
type ServerParticipant = ApiServerRoom["participants"][number];
type ServerPartySnapshot = components["schemas"]["PokeLoungePartySnapshotDto"];

interface ServerRoomState {
  roomCode: string;
  revision: number;
  expiresAtMs: number;
  status: ApiServerRoom["status"];
  participants: ServerParticipant[];
  partySnapshots: Record<string, ServerPartySnapshot>;
  round: {
    index: number;
  };
  tournament: ServerTournamentState;
  finalStandings: ApiServerRoom["finalStandings"];
  competitiveTransitions: CompetitiveTerminalTransition[];
  competitive?: CompetitiveProjection;
}

export interface ServerRoomOptions {
  roomId?: string;
  sessionId?: string;
  playerId?: string;
  createRoom?: boolean;
  fetch?: typeof fetch;
  idToken?: string;
  onTransportError?: (error: Error) => void;
  socketFactory?: ServerRoomSocketFactory;
}

export const POKE_LOUNGE_FRESH_SESSION_REQUIRED_EVENT =
  "poke-lounge:server-room-fresh-session-required";

interface ServerRoomSocket {
  readonly connected: boolean;
  on(eventName: string, listener: ServerRoomSocketListener): ServerRoomSocket;
  off(eventName: string, listener: ServerRoomSocketListener): ServerRoomSocket;
  emit(eventName: string, payload: unknown): ServerRoomSocket;
  disconnect(): ServerRoomSocket;
}

type ServerRoomSocketListener = (() => void) | ((event: unknown) => void);

type ServerRoomSocketFactory = (
  url: string,
  options: {
    path: "/socket.io";
    transports: ["websocket"];
    reconnection: true;
  },
) => ServerRoomSocket;

export type ServerRoomTransportDiagnostics = {
  socketConnected: boolean;
  transportState: "not-created" | "connected" | "disconnected";
  recoveryAttempt: number;
  recoveryInFlight: boolean;
  recoveryTimerScheduled: boolean;
  subscriptionFailed: boolean;
  lastAppliedTerminalRevision: number | null;
  lastSocketErrorKind:
    | "connect_error"
    | "disconnect"
    | "subscription_error"
    | "invalid_snapshot"
    | null;
  lastSocketConnectErrorClass:
    | "websocket_error"
    | "timeout"
    | "server_reject"
    | "cors"
    | "unknown"
    | null;
  lastRecoveryFailureKind:
    | "canonical_mismatch"
    | "transition_merge"
    | "recovery_parse"
    | "unknown"
    | null;
};

type RecoveryFailureKind = NonNullable<ServerRoomTransportDiagnostics["lastRecoveryFailureKind"]>;

interface ServerRoomE2eDiagnosticsReader {
  getRoomTransportDiagnosticsForE2e?(): ServerRoomTransportDiagnostics;
}

export function getServerRoomTransportDiagnosticsForE2e(
  room: MultiplayerRoom | undefined,
): ServerRoomTransportDiagnostics | null {
  if (!isE2eEnabled()) {
    return null;
  }

  const reader = room as (MultiplayerRoom & ServerRoomE2eDiagnosticsReader) | undefined;

  return reader?.getRoomTransportDiagnosticsForE2e?.() ?? null;
}

const SERVER_IDENTITY_STORAGE_KEY = "poke-lounge:server-room-identity";
const RECOVERY_INITIAL_DELAY_MS = 250;
const RECOVERY_MAX_DELAY_MS = 5000;
const MAX_RECENT_TERMINAL_PROJECTIONS = 8;
const PENDING_ROOM_ID = "server-pending";
const REVISION_CONFLICT_CODE = "POKE_LOUNGE_REVISION_CONFLICT";
const IDEMPOTENCY_CONFLICT_CODE = "POKE_LOUNGE_IDEMPOTENCY_CONFLICT";

interface ServerRoomConflictResponse {
  statusCode: 409;
  code: typeof REVISION_CONFLICT_CODE | typeof IDEMPOTENCY_CONFLICT_CODE;
  message: string;
  snapshot: ServerRoomState;
}

class ServerRoomRequestError extends Error {
  constructor(
    readonly status: number,
    readonly responseBody: unknown,
  ) {
    super(`Poke Lounge server room request failed: ${status}`);
  }
}

class ServerRoomTransportError extends Error {
  constructor(readonly transportCause: unknown) {
    super("Poke Lounge server room transport failed");
  }
}

class ServerRoomFetchError extends ServerRoomTransportError {}

class ServerRoomBodyReadError extends ServerRoomTransportError {}

class ServerRoomJsonParseError extends Error {
  constructor(readonly parseCause: unknown) {
    super("Poke Lounge server room response JSON is malformed");
  }
}

class ServerRoomSchemaError extends Error {
  constructor() {
    super("Poke Lounge room response is malformed");
  }
}

export function createServerRoom(options: ServerRoomOptions): MultiplayerRoom {
  const identity = resolveServerIdentity(options);
  const sessionId = identity.sessionId;
  const serverPlayerId = identity.playerId;
  let localPlayerId = serverPlayerId;
  let activeRoomId = options.roomId ?? PENDING_ROOM_ID;
  const fetchImpl = options.fetch ?? fetch;
  const socketFactory = options.socketFactory ?? resolveServerRoomSocketFactory();
  const handlers = new Map<RoomMessage, Set<Handler<RoomMessage>>>();
  let disposed = false;
  let recoveryTimer: number | null = null;
  let recoveryAttempt = 0;
  let recoveryInFlight = false;
  let recoveryRetryQueued = false;
  let recoveryDrainQueued = false;
  let competitiveActionRecoveryTimer: number | null = null;
  let competitiveActionRecoveryAttempt = 0;
  let competitiveActionRecoveryInFlight = false;
  let competitiveActionRecoveryMatchId: string | null = null;
  let latestState: ServerRoomState | null = null;
  let currentAssignmentProjection: CompetitiveProjection | null = null;
  let recentTerminalProjections: CompetitiveTerminalTransition[] = [];
  const terminalEventIds = new Set<string>();
  const terminalMatchIds = new Set<string>();
  const completedBracketRecoveryMatchIds = new Set<string>();
  let lastAppliedRoomRevision = -1;
  let lastAppliedTerminalRevision = -1;
  let freshTerminalBaselineInitialized = false;
  let roomSocket: ServerRoomSocket | null = null;
  let socketConnected = false;
  let subscriptionFailed = false;
  let lastSocketErrorKind: ServerRoomTransportDiagnostics["lastSocketErrorKind"] = null;
  let lastSocketConnectErrorClass: ServerRoomTransportDiagnostics["lastSocketConnectErrorClass"] =
    null;
  let lastRecoveryFailureKind: ServerRoomTransportDiagnostics["lastRecoveryFailureKind"] = null;
  let cursorRegression = false;
  let connectStarted = false;
  let mutationQueue: Promise<void> = Promise.resolve();
  let announcedCompetitiveAssignmentKey: string | null = null;
  let resultSync: TournamentStateRoomPayload["resultSync"] = {
    matchId: null,
    status: "idle",
  };
  let leaveSent = false;
  let leavePromise: Promise<void> | null = null;

  const emit = <T extends RoomMessage>(type: T, payload: RoomEvent[T]) => {
    for (const handler of handlers.get(type) ?? []) {
      handler(payload as RoomEvent[RoomMessage]);
    }
  };

  const reportTransportError = (error: Error) => {
    if (options.onTransportError) {
      options.onTransportError(error);
    } else {
      console.error(error);
    }

    window.dispatchEvent(
      new CustomEvent("poke-lounge:server-room-error", {
        detail: { code: "CURSOR_REGRESSION", message: error.message },
      }),
    );
  };

  const requestRoom = async (path: string, init?: RequestInit): Promise<ServerRoomState> => {
    let response: Response;

    try {
      response = await fetchImpl(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });
    } catch (error) {
      throw new ServerRoomFetchError(error);
    }
    const responseText = await readResponseBody(response);
    const responseBody = parseResponseJson(responseText);
    const unwrapped = unwrapApiResponse<unknown>(responseBody);

    if (!response.ok) {
      throw new ServerRoomRequestError(response.status, unwrapped);
    }

    return parseServerRoomState(unwrapped);
  };

  const requestCompetitiveSeat = async (): Promise<CompetitiveProjection | null> => {
    if (!options.idToken) {
      return null;
    }

    let response: Response;
    try {
      response = await fetchImpl(
        `${getApiBaseUrl()}/poke-lounge/rooms/${activeRoomId}/competitive-seat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        },
      );
    } catch (error) {
      throw new ServerRoomFetchError(error);
    }

    const responseBody = unwrapApiResponse<unknown>(
      parseResponseJson(await readResponseBody(response)),
    );
    if (!response.ok) {
      throw new ServerRoomRequestError(response.status, responseBody);
    }
    if (responseBody === null) {
      return null;
    }

    return parseCompetitiveProjection(responseBody);
  };

  const enqueueMutation = <T>(operation: () => Promise<T>): Promise<T> => {
    const pending = mutationQueue.then(operation);
    mutationQueue = pending.then(
      () => undefined,
      () => undefined,
    );

    return pending;
  };

  const mutateRoom = (
    path: string,
    body: unknown | (() => unknown | Promise<unknown>),
    revisionResolver: () => number | Promise<number>,
  ): Promise<ServerRoomState> => {
    const idempotencyKey = createIdempotencyKey();

    return enqueueMutation(async () => {
      const resolvedBody = typeof body === "function" ? await body() : body;
      const expectedRevision = await revisionResolver();
      const send = (revision: number) =>
        requestRoom(path, {
          method: "POST",
          headers: {
            "X-Idempotency-Key": idempotencyKey,
            "If-Match-Revision": String(revision),
          },
          body: JSON.stringify(resolvedBody),
        });

      try {
        return await retryOneNetworkFailure(() => send(expectedRevision));
      } catch (error) {
        const conflict = getServerRoomConflict(error);

        if (!conflict) {
          throw error;
        }

        applySnapshot(conflict.snapshot);

        throw error;
      }
    });
  };

  const clearRecoveryTimer = (resetAttempt = true) => {
    if (recoveryTimer !== null) {
      window.clearTimeout(recoveryTimer);
      recoveryTimer = null;
    }

    if (resetAttempt) {
      recoveryAttempt = 0;
    }
  };

  const clearCompetitiveActionRecovery = () => {
    if (competitiveActionRecoveryTimer !== null) {
      window.clearTimeout(competitiveActionRecoveryTimer);
      competitiveActionRecoveryTimer = null;
    }

    competitiveActionRecoveryAttempt = 0;
    competitiveActionRecoveryMatchId = null;
  };

  const isTerminalState = () =>
    latestState?.status === "completed" || latestState?.status === "closed";

  const shouldContinueRecovery = () =>
    !disposed &&
    !cursorRegression &&
    !isTerminalState() &&
    (!socketConnected || subscriptionFailed);

  const scheduleRecovery = () => {
    if (!shouldContinueRecovery() || recoveryTimer !== null || recoveryInFlight) {
      return;
    }

    const delayMs = Math.min(
      RECOVERY_INITIAL_DELAY_MS * 2 ** recoveryAttempt,
      RECOVERY_MAX_DELAY_MS,
    );
    recoveryAttempt += 1;
    recoveryTimer = window.setTimeout(() => {
      recoveryTimer = null;
      if (!shouldContinueRecovery()) {
        return;
      }
      void runRecovery();
    }, delayMs);
  };

  const runRecovery = async () => {
    if (disposed || cursorRegression || activeRoomId === PENDING_ROOM_ID) {
      return;
    }

    if (recoveryInFlight) {
      recoveryRetryQueued = true;
      return;
    }

    recoveryInFlight = true;
    try {
      const terminalRevisionBeforeRecovery = lastAppliedTerminalRevision;
      const room = await requestRoom(
        `/poke-lounge/rooms/${activeRoomId}?afterRevision=${Math.max(0, lastAppliedTerminalRevision)}`,
      );
      const applied = applySnapshot(room);
      const terminalCursorAdvanced = lastAppliedTerminalRevision > terminalRevisionBeforeRecovery;

      if ((applied || terminalCursorAdvanced) && !recoveryRetryQueued) {
        subscriptionFailed = false;
        lastRecoveryFailureKind = null;
        if (!shouldContinueRecovery()) {
          clearRecoveryTimer();
        }
      }
      if (
        !recoveryRetryQueued &&
        room.competitiveTransitions.length === MAX_RECENT_TERMINAL_PROJECTIONS &&
        terminalCursorAdvanced
      ) {
        recoveryDrainQueued = true;
      }
    } catch (error) {
      lastRecoveryFailureKind = classifyRecoveryFailure(error);
      subscriptionFailed = socketConnected;
    } finally {
      recoveryInFlight = false;

      if (recoveryDrainQueued) {
        recoveryDrainQueued = false;
        void runRecovery();
        return;
      }

      if (recoveryRetryQueued) {
        recoveryRetryQueued = false;
      }

      scheduleRecovery();
    }
  };

  const requestTerminalRecovery = (failureKind: RecoveryFailureKind = "unknown") => {
    if (disposed || cursorRegression || activeRoomId === PENDING_ROOM_ID) {
      return;
    }

    lastRecoveryFailureKind = failureKind;
    subscriptionFailed = true;
    if (recoveryInFlight) {
      recoveryRetryQueued = true;
      return;
    }
    void runRecovery();
  };

  const handleSocketConnect = () => {
    if (disposed || cursorRegression || !roomSocket || activeRoomId === PENDING_ROOM_ID) {
      return;
    }

    socketConnected = true;
    subscriptionFailed = false;
    clearRecoveryTimer();
    roomSocket.emit("room.subscribe", {
      roomCode: activeRoomId,
      playerId: serverPlayerId,
      sessionId,
      afterRevision: Math.max(0, lastAppliedTerminalRevision),
    });
    void runRecovery();
  };

  const handleSocketDisconnect = () => {
    socketConnected = false;
    lastSocketErrorKind = "disconnect";
    scheduleRecovery();
  };

  const handleSocketConnectError = (error: unknown) => {
    socketConnected = false;
    subscriptionFailed = true;
    lastSocketErrorKind = "connect_error";
    lastSocketConnectErrorClass = classifySocketConnectError(error);
    scheduleRecovery();
  };

  const handleSocketSnapshot = (event: unknown) => {
    let room: ServerRoomState;

    try {
      room = parseSocketRoomEvent(event);
    } catch {
      subscriptionFailed = true;
      lastSocketErrorKind = "invalid_snapshot";
      scheduleRecovery();
      return;
    }

    const terminalRevisionBeforeSnapshot = lastAppliedTerminalRevision;
    const applied = applySnapshot(room);

    if (
      socketConnected &&
      (applied || lastAppliedTerminalRevision > terminalRevisionBeforeSnapshot)
    ) {
      subscriptionFailed = false;
      lastRecoveryFailureKind = null;
      clearRecoveryTimer();
    }
  };

  const handleSubscriptionError = () => {
    if (disposed || cursorRegression) {
      return;
    }

    subscriptionFailed = true;
    lastSocketErrorKind = "subscription_error";
    scheduleRecovery();
  };

  const handleRevisionConflict = (event: unknown) => {
    let room: ServerRoomState;

    try {
      room = parseSocketRoomEvent(event);
    } catch {
      return;
    }

    if (room.roomCode !== activeRoomId || room.revision >= lastAppliedRoomRevision) {
      return;
    }

    cursorRegression = true;
    subscriptionFailed = false;
    clearRecoveryTimer();
    roomSocket?.disconnect();
    clearStoredServerIdentity();
    reportTransportError(
      new Error("Poke Lounge room cursor regressed; a fresh room session is required"),
    );
    window.dispatchEvent(
      new CustomEvent(POKE_LOUNGE_FRESH_SESSION_REQUIRED_EVENT, {
        detail: { roomCode: activeRoomId },
      }),
    );
    void requestLeave();
  };

  const ensureSocket = () => {
    if (roomSocket || disposed || cursorRegression || activeRoomId === PENDING_ROOM_ID) {
      return;
    }

    roomSocket = socketFactory(`${getApiBaseUrl().replace(/\/$/, "")}/poke-lounge`, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
    });
    roomSocket.on("connect", handleSocketConnect);
    roomSocket.on("connect_error", handleSocketConnectError);
    roomSocket.on("disconnect", handleSocketDisconnect);
    roomSocket.on("room.snapshot", handleSocketSnapshot);
    roomSocket.on("room.subscription-error", handleSubscriptionError);
    roomSocket.on("room.revision-conflict", handleRevisionConflict);

    if (roomSocket.connected) {
      handleSocketConnect();
    }
  };

  const applySnapshot = (state: ServerRoomState): boolean => {
    const acceptsCreatedRoom = activeRoomId === PENDING_ROOM_ID;

    if (!acceptsCreatedRoom && state.roomCode !== activeRoomId) {
      return false;
    }

    if (
      latestState &&
      state.revision === lastAppliedRoomRevision &&
      !hasSameCanonicalRoomProjection(latestState, state)
    ) {
      requestTerminalRecovery("canonical_mismatch");
      return false;
    }

    if (!freshTerminalBaselineInitialized) {
      lastAppliedTerminalRevision = state.revision;
      freshTerminalBaselineInitialized = true;
    }

    try {
      applyTerminalTransitions(state.competitiveTransitions);
    } catch {
      requestTerminalRecovery("transition_merge");
      return false;
    }

    if (state.revision < lastAppliedRoomRevision) {
      return false;
    }

    const previousAssignment = currentAssignmentProjection;
    latestState = state;
    lastAppliedRoomRevision = state.revision;
    activeRoomId = state.roomCode;

    if (
      resultSync.matchId &&
      state.tournament.activeMatchId !== resultSync.matchId &&
      resultSync.status !== "error"
    ) {
      resultSync = { matchId: null, status: "idle" };
    }

    emit("CURRENT_PLAYERS", createCurrentPlayersPayload(state));

    if (state.competitive) {
      applyCurrentAssignmentProjection(state.competitive);
    } else {
      currentAssignmentProjection = null;
    }

    emitTournamentProjection(state);

    if (
      previousAssignment &&
      !terminalMatchIds.has(previousAssignment.matchId) &&
      hasCompletedBracketMatch(state, previousAssignment.bracketMatchId) &&
      !completedBracketRecoveryMatchIds.has(previousAssignment.matchId)
    ) {
      completedBracketRecoveryMatchIds.add(previousAssignment.matchId);
      requestTerminalRecovery();
    }

    if (isTerminalState()) {
      clearRecoveryTimer();
      clearCompetitiveActionRecovery();
    }

    return true;
  };

  const applyTerminalTransitions = (transitions: CompetitiveTerminalTransition[]) => {
    for (const transition of transitions) {
      if (transition.terminalRoomRevision <= lastAppliedTerminalRevision) {
        continue;
      }

      mergeTerminalTransition(transition);
      lastAppliedTerminalRevision = transition.terminalRoomRevision;
    }
  };

  const mergeTerminalTransition = (transition: CompetitiveTerminalTransition): boolean => {
    const cachedByEvent = recentTerminalProjections.find(
      cached => cached.terminalEventId === transition.terminalEventId,
    );
    const cachedByMatch = recentTerminalProjections.find(
      cached => cached.projection.matchId === transition.projection.matchId,
    );

    if (cachedByEvent || cachedByMatch) {
      if (
        cachedByEvent?.projection.matchId !== transition.projection.matchId ||
        cachedByMatch?.terminalEventId !== transition.terminalEventId
      ) {
        throw new CompetitiveProjectionSchemaError();
      }
      return false;
    }

    const previousCache = recentTerminalProjections;
    recentTerminalProjections = [...recentTerminalProjections, transition]
      .sort(compareTerminalTransitions)
      .slice(-MAX_RECENT_TERMINAL_PROJECTIONS);
    rebuildTerminalCacheKeys();

    try {
      emit("COMPETITIVE_STATE", createCompetitivePayload(transition.projection));
    } catch (error) {
      recentTerminalProjections = previousCache;
      rebuildTerminalCacheKeys();
      throw error;
    }

    if (competitiveActionRecoveryMatchId === transition.projection.matchId) {
      clearCompetitiveActionRecovery();
    }

    return true;
  };

  const rebuildTerminalCacheKeys = () => {
    terminalEventIds.clear();
    terminalMatchIds.clear();
    for (const transition of recentTerminalProjections) {
      terminalEventIds.add(transition.terminalEventId);
      terminalMatchIds.add(transition.projection.matchId);
    }
  };

  const createCurrentPlayersPayload = (state: ServerRoomState): RoomEvent["CURRENT_PLAYERS"] => ({
    players: Object.fromEntries(
      state.participants
        .filter(participant => participant.connected)
        .map(participant => {
          const snapshot = toPlayerSnapshot(participant, serverPlayerId, sessionId, localPlayerId);

          return [snapshot.sessionId, snapshot] as const;
        }),
    ),
  });

  const applyCurrentAssignmentProjection = (projection: CompetitiveProjection) => {
    if (!canApplyCurrentAssignmentProjection(projection)) {
      return;
    }

    clearCompetitiveActionRecovery();
    currentAssignmentProjection = projection;
    const payload = { projection, ownPlayerId: serverPlayerId };
    const assignmentKey = `${projection.matchId}:${projection.assignmentRevision}`;

    if (announcedCompetitiveAssignmentKey !== assignmentKey) {
      announcedCompetitiveAssignmentKey = assignmentKey;
      emit("COMPETITIVE_ASSIGNMENT", payload);
    }
    emit("COMPETITIVE_STATE", payload);
  };

  const canApplyCurrentAssignmentProjection = (projection: CompetitiveProjection): boolean =>
    projection.status !== "completed" &&
    latestState?.tournament.activeMatchAuthority === "server" &&
    latestState.tournament.activeMatchId === projection.bracketMatchId;

  const createTournamentProjectionPayload = (
    state: ServerRoomState,
  ): RoomEvent["TOURNAMENT_STATE"] => {
    const tournament = mapServerTournamentPlayerIds(
      state.tournament,
      mapServerPlayerIdForLocalStore,
    );
    const activeMatchTransport =
      tournament.activeMatchAuthority === "casual"
        ? "casual"
        : tournament.activeMatchAuthority === "server" &&
            state.competitive?.bracketMatchId === tournament.activeMatchId
          ? "authority"
          : "awaiting-authority";

    return {
      revision: state.revision,
      roundIndex: state.round.index,
      roomStatus: state.status,
      tournament,
      ownPlayerId: localPlayerId,
      activeMatchTransport,
      finalStandings: state.finalStandings.map(standing => ({
        ...standing,
        playerId: mapServerPlayerIdForLocalStore(standing.playerId),
      })),
      resultSync,
    };
  };

  const emitTournamentProjection = (state: ServerRoomState) => {
    emit("TOURNAMENT_STATE", createTournamentProjectionPayload(state));
  };

  const createCompetitivePayload = (
    projection: CompetitiveProjection,
  ): RoomEvent["COMPETITIVE_STATE"] => ({
    projection,
    ownPlayerId: serverPlayerId,
  });

  const canReplayCompetitiveAssignment = (projection: CompetitiveProjection): boolean =>
    projection.status !== "completed" &&
    latestState?.tournament.activeMatchAuthority === "server" &&
    latestState.tournament.activeMatchId === projection.bracketMatchId;

  const replayLatestEvent = (type: RoomMessage, handler: Handler<RoomMessage>) => {
    if (latestState && type === "CURRENT_PLAYERS") {
      handler(createCurrentPlayersPayload(latestState));
      return;
    }

    if (latestState && type === "TOURNAMENT_STATE") {
      handler(createTournamentProjectionPayload(latestState));
      return;
    }

    if (type === "COMPETITIVE_STATE") {
      for (const transition of recentTerminalProjections) {
        handler(createCompetitivePayload(transition.projection));
      }
      if (currentAssignmentProjection) {
        handler(createCompetitivePayload(currentAssignmentProjection));
      }
      return;
    }

    if (
      currentAssignmentProjection &&
      type === "COMPETITIVE_ASSIGNMENT" &&
      canReplayCompetitiveAssignment(currentAssignmentProjection)
    ) {
      handler(createCompetitivePayload(currentAssignmentProjection));
    }
  };

  const scheduleCompetitiveActionRecovery = (matchId: string) => {
    competitiveActionRecoveryMatchId = matchId;
    if (
      disposed ||
      isTerminalState() ||
      activeRoomId === PENDING_ROOM_ID ||
      competitiveActionRecoveryTimer !== null ||
      competitiveActionRecoveryInFlight
    ) {
      return;
    }

    const delayMs = Math.min(
      RECOVERY_INITIAL_DELAY_MS * 2 ** competitiveActionRecoveryAttempt,
      RECOVERY_MAX_DELAY_MS,
    );
    competitiveActionRecoveryAttempt += 1;
    competitiveActionRecoveryTimer = window.setTimeout(() => {
      competitiveActionRecoveryTimer = null;
      void runCompetitiveActionRecovery();
    }, delayMs);
  };

  const runCompetitiveActionRecovery = async () => {
    const matchId = competitiveActionRecoveryMatchId;
    if (disposed || !matchId || isTerminalState() || activeRoomId === PENDING_ROOM_ID) {
      return;
    }

    competitiveActionRecoveryInFlight = true;
    let recovered = false;
    try {
      const room = await requestRoom(
        `/poke-lounge/rooms/${activeRoomId}?afterRevision=${Math.max(0, lastAppliedTerminalRevision)}`,
      );
      applySnapshot(room);
      recovered = room.competitive?.matchId === matchId || terminalMatchIds.has(matchId);
    } catch {
      // Retry below with bounded backoff until a current projection is available.
    } finally {
      competitiveActionRecoveryInFlight = false;
      if (!recovered) {
        scheduleCompetitiveActionRecovery(matchId);
      }
    }
  };

  const submitPartySnapshot = async (snapshot: PlayerSnapshot) => {
    const nextState = await mutateRoom(
      `/poke-lounge/rooms/${activeRoomId}/party-snapshot`,
      {
        playerId: serverPlayerId,
        sessionId,
        displayName: snapshot.displayName,
        representativePokemon: toRepresentativePokemonSnapshot(snapshot),
      },
      getLatestRevision,
    );

    applySnapshot(nextState);
  };

  const submitCompetitiveAction = async (
    command: RoomEvent["COMPETITIVE_ACTION"],
  ): Promise<void> => {
    if (!options.idToken) {
      return;
    }

    const body = JSON.stringify({
      assignmentRevision: command.assignmentRevision,
      turn: command.turn,
      clientCommandId: command.clientCommandId,
      action: command.action,
    });
    const send = async () => {
      let response: Response;
      try {
        response = await fetchImpl(
          `${getApiBaseUrl()}/poke-lounge/rooms/${activeRoomId}/matches/${command.matchId}/actions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${options.idToken}`,
              "Content-Type": "application/json",
            },
            body,
          },
        );
      } catch (error) {
        throw new ServerRoomFetchError(error);
      }

      const responseBody = unwrapApiResponse<unknown>(
        parseResponseJson(await readResponseBody(response)),
      );
      if (!response.ok) {
        throw new ServerRoomRequestError(response.status, responseBody);
      }
      return parseCompetitiveProjectionContract(responseBody);
    };

    try {
      const parsed = await retryOneNetworkFailure(send);
      const projection = parsed.projection;

      if (
        projection.matchId !== command.matchId ||
        projection.assignmentRevision !== command.assignmentRevision
      ) {
        throw new CompetitiveProjectionSchemaError();
      }

      if (projection.status !== "completed") {
        applyCurrentAssignmentProjection(projection);
        return;
      }

      if (parsed.terminalMetadataState === "legacy-recovery-required") {
        requestTerminalRecovery();
        return;
      }

      if (
        parsed.terminalMetadataState !== "stable" ||
        typeof projection.terminalEventId !== "string" ||
        typeof projection.terminalRoomRevision !== "number"
      ) {
        throw new CompetitiveProjectionSchemaError();
      }

      mergeTerminalTransition({
        terminalEventId: projection.terminalEventId,
        terminalRoomRevision: projection.terminalRoomRevision,
        projection,
      });
      lastAppliedTerminalRevision = Math.max(
        lastAppliedTerminalRevision,
        projection.terminalRoomRevision,
      );
    } catch (error) {
      emit("COMPETITIVE_ACTION_FAILED", {
        matchId: command.matchId,
        status: error instanceof ServerRoomRequestError ? error.status : null,
        message: "서버 상태를 다시 불러오는 중...",
      });
      scheduleCompetitiveActionRecovery(command.matchId);
    }
  };

  const submitCasualTournamentResult = async (
    command: RoomEvent["TOURNAMENT_MATCH_RESULT"],
  ): Promise<void> => {
    const state = latestState;
    const activeMatch = findCurrentMatch(
      state?.tournament.bracket ?? null,
      state?.tournament.activeMatchId ?? null,
    );

    if (
      !state ||
      !activeMatch ||
      state.tournament.activeMatchAuthority !== "casual" ||
      command.matchId !== activeMatch.matchId ||
      !activeMatch.participantIds.includes(serverPlayerId)
    ) {
      return;
    }

    const winnerPlayerId =
      command.winnerPlayerId === localPlayerId ? serverPlayerId : command.winnerPlayerId;
    const loserPlayerId = activeMatch.participantIds.find(playerId => playerId !== winnerPlayerId);

    if (!activeMatch.participantIds.includes(winnerPlayerId) || !loserPlayerId) {
      return;
    }

    const body = {
      reportingPlayerId: serverPlayerId,
      reportingSessionId: sessionId,
      matchId: activeMatch.matchId,
      winnerPlayerId,
      loserPlayerId,
      reason: command.reason,
      nowMs: Date.now(),
    };
    resultSync = { matchId: activeMatch.matchId, status: "submitting" };
    emitTournamentProjection(state);

    try {
      const nextState = await mutateRoom(
        `/poke-lounge/rooms/${activeRoomId}/result`,
        body,
        getLatestRevision,
      );
      resultSync = { matchId: null, status: "idle" };
      applySnapshot(nextState);
    } catch (error) {
      resultSync = { matchId: activeMatch.matchId, status: "recovering" };
      if (latestState) {
        emitTournamentProjection(latestState);
      }

      try {
        const recovered = await requestRoom(`/poke-lounge/rooms/${activeRoomId}`);
        applySnapshot(recovered);
      } catch {
        scheduleRecovery();
      }

      const currentState = latestState;
      if (currentState?.tournament.activeMatchId === activeMatch.matchId) {
        resultSync = { matchId: activeMatch.matchId, status: "error" };
        emitTournamentProjection(currentState);
      }

      throw error;
    }
  };

  const getRoomTransportDiagnosticsForE2e = (): ServerRoomTransportDiagnostics => ({
    socketConnected,
    transportState:
      roomSocket === null ? "not-created" : socketConnected ? "connected" : "disconnected",
    recoveryAttempt,
    recoveryInFlight,
    recoveryTimerScheduled: recoveryTimer !== null,
    subscriptionFailed,
    lastAppliedTerminalRevision: freshTerminalBaselineInitialized
      ? lastAppliedTerminalRevision
      : null,
    lastSocketErrorKind,
    lastSocketConnectErrorClass,
    lastRecoveryFailureKind,
  });

  return {
    get roomId() {
      return activeRoomId;
    },
    sessionId,
    connect(initialSnapshot) {
      if (disposed || connectStarted) {
        return;
      }

      connectStarted = true;
      const snapshot = initialSnapshot ?? createDefaultSnapshot(sessionId, localPlayerId);
      localPlayerId = snapshot.playerId?.trim() || localPlayerId;
      void connectServerRoom(snapshot);
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      clearRecoveryTimer();
      clearCompetitiveActionRecovery();
      if (roomSocket) {
        roomSocket.off("connect", handleSocketConnect);
        roomSocket.off("connect_error", handleSocketConnectError);
        roomSocket.off("disconnect", handleSocketDisconnect);
        roomSocket.off("room.snapshot", handleSocketSnapshot);
        roomSocket.off("room.subscription-error", handleSubscriptionError);
        roomSocket.off("room.revision-conflict", handleRevisionConflict);
        roomSocket.disconnect();
        roomSocket = null;
      }
      void requestLeave();
      handlers.clear();
    },
    send(type, payload) {
      if (disposed) {
        return;
      }

      if (type === "PLAYER_CHANGED_MAP") {
        void submitPartySnapshot(payload as PlayerSnapshot).catch(() => {});
        return;
      }

      if (type === "COMPETITIVE_ACTION") {
        void submitCompetitiveAction(payload as RoomEvent["COMPETITIVE_ACTION"]).catch(error => {
          reportTransportError(
            error instanceof Error ? error : new ServerRoomTransportError(error),
          );
        });
        return;
      }

      if (type === "TOURNAMENT_MATCH_RESULT") {
        void submitCasualTournamentResult(payload as RoomEvent["TOURNAMENT_MATCH_RESULT"]).catch(
          error => {
            reportTransportError(
              error instanceof Error ? error : new ServerRoomTransportError(error),
            );
          },
        );
      }
    },
    on(type, handler) {
      const typedHandler = handler as Handler<RoomMessage>;
      const nextHandlers = handlers.get(type) ?? new Set<Handler<RoomMessage>>();
      nextHandlers.add(typedHandler);
      handlers.set(type, nextHandlers);
      replayLatestEvent(type, typedHandler);

      return () => {
        nextHandlers.delete(typedHandler);
      };
    },
    ...(isE2eEnabled() ? { getRoomTransportDiagnosticsForE2e } : {}),
  };

  function openServerRoom(snapshot: PlayerSnapshot): Promise<ServerRoomState> {
    const body = JSON.stringify({
      playerId: serverPlayerId,
      sessionId,
      displayName: snapshot.displayName,
    });

    if (options.createRoom) {
      return mutateRoom("/poke-lounge/rooms", JSON.parse(body), () => 0).then(state => {
        if (!disposed) {
          applyCreatedRoomToLocation(state.roomCode);
        }

        return state;
      });
    }

    return mutateRoom(`/poke-lounge/rooms/${activeRoomId}/join`, JSON.parse(body), async () => {
      const current = await requestRoom(`/poke-lounge/rooms/${activeRoomId}`);
      applySnapshot(current);

      return getLatestRevision();
    });
  }

  async function connectServerRoom(snapshot: PlayerSnapshot): Promise<void> {
    try {
      const opened = await openServerRoom(snapshot);
      applySnapshot(opened);

      if (disposed) {
        void requestLeave();
        return;
      }

      ensureSocket();

      if (options.idToken) {
        try {
          const assignment = await requestCompetitiveSeat();
          if (assignment) {
            applyCurrentAssignmentProjection(assignment);
          }
        } catch (error) {
          if (error instanceof CompetitiveProjectionSchemaError) {
            const recovered = await requestRoom(`/poke-lounge/rooms/${activeRoomId}`);
            applySnapshot(recovered);
          } else if (
            !(error instanceof ServerRoomRequestError) ||
            ![401, 403, 409].includes(error.status)
          ) {
            throw error;
          }
        }
      }

      await submitPartySnapshot(snapshot);

      if (disposed) {
        void requestLeave();
        return;
      }

      const ready = await mutateRoom(
        `/poke-lounge/rooms/${activeRoomId}/ready`,
        {
          playerId: serverPlayerId,
          sessionId,
          ready: true,
        },
        getLatestRevision,
      );
      applySnapshot(ready);

      if (disposed) {
        void requestLeave();
        return;
      }
    } catch {
      if (!disposed && activeRoomId !== PENDING_ROOM_ID) {
        scheduleRecovery();
      }
    }
  }

  function requestLeave(): Promise<void> {
    if (leaveSent || activeRoomId === PENDING_ROOM_ID || !latestState) {
      return leavePromise ?? Promise.resolve();
    }

    leaveSent = true;
    leavePromise = mutateRoom(
      `/poke-lounge/rooms/${activeRoomId}/leave`,
      { playerId: serverPlayerId, sessionId },
      getLatestRevision,
    ).then(
      () => undefined,
      () => undefined,
    );

    return leavePromise;
  }

  function getLatestRevision(): number {
    if (!latestState) {
      throw new Error("Poke Lounge room revision is unavailable");
    }

    return latestState.revision;
  }

  function mapServerPlayerIdForLocalStore(playerId: string): string {
    return playerId === serverPlayerId ? localPlayerId : playerId;
  }
}

function toPlayerSnapshot(
  participant: ServerParticipant,
  serverPlayerId: string,
  serverSessionId: string,
  localPlayerId: string,
): PlayerSnapshot {
  const local = participant.playerId === serverPlayerId;

  return {
    sessionId: local ? serverSessionId : participant.playerId,
    playerId: local ? localPlayerId : participant.playerId,
    displayName: participant.displayName,
    map: "new-bark-town",
    x: local ? 656 : 704,
    y: 1150,
    facing: "front",
  };
}

function createDefaultSnapshot(sessionId: string, playerId: string): PlayerSnapshot {
  return {
    sessionId,
    playerId,
    displayName: "Player 1",
    map: "new-bark-town",
    x: 656,
    y: 1150,
    facing: "front",
  };
}

function toRepresentativePokemonSnapshot(
  snapshot: PlayerSnapshot,
): ServerPartySnapshot["representativePokemon"] {
  const partyPokemon =
    snapshot.party?.find(slot => slot.slotIndex === snapshot.activePartySlotIndex)?.pokemon ??
    snapshot.party?.find(slot => slot.pokemon)?.pokemon;

  if (
    !partyPokemon ||
    !Number.isInteger(partyPokemon.speciesId) ||
    !Number.isInteger(partyPokemon.level) ||
    partyPokemon.currentHp === undefined ||
    partyPokemon.maxHp === undefined ||
    !Number.isInteger(partyPokemon.currentHp) ||
    !Number.isInteger(partyPokemon.maxHp)
  ) {
    return undefined;
  }

  const currentHp = partyPokemon.currentHp;
  const maxHp = partyPokemon.maxHp;

  return {
    speciesId: partyPokemon.speciesId,
    name: partyPokemon.name,
    level: partyPokemon.level,
    currentHp,
    maxHp,
  };
}

function isE2eEnabled(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("e2e");
}

function classifySocketConnectError(
  error: unknown,
): NonNullable<ServerRoomTransportDiagnostics["lastSocketConnectErrorClass"]> {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const details = [
    error instanceof Error ? error.name : undefined,
    error instanceof Error ? error.message : undefined,
    record?.name,
    record?.message,
    record?.description,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (details.includes("cors") || details.includes("cross-origin") || details.includes("origin")) {
    return "cors";
  }

  if (details.includes("timeout") || details.includes("timed out")) {
    return "timeout";
  }

  if (details.includes("websocket")) {
    return "websocket_error";
  }

  if (
    details.includes("reject") ||
    details.includes("forbidden") ||
    details.includes("unauthorized") ||
    details.includes("invalid namespace")
  ) {
    return "server_reject";
  }

  return "unknown";
}

function classifyRecoveryFailure(error: unknown): RecoveryFailureKind {
  if (
    error instanceof ServerRoomJsonParseError ||
    error instanceof ServerRoomSchemaError ||
    error instanceof TournamentProjectionSchemaError ||
    error instanceof CompetitiveProjectionSchemaError
  ) {
    return "recovery_parse";
  }

  return "unknown";
}

async function retryOneNetworkFailure<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!(error instanceof ServerRoomTransportError)) {
      throw error;
    }

    return operation();
  }
}

async function readResponseBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    throw new ServerRoomBodyReadError(error);
  }
}

function parseResponseJson(responseText: string): unknown {
  try {
    return JSON.parse(responseText) as unknown;
  } catch (error) {
    throw new ServerRoomJsonParseError(error);
  }
}

function clearStoredServerIdentity(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(SERVER_IDENTITY_STORAGE_KEY);
  } catch {
    // A fresh identity is still generated when storage is unavailable.
  }
}

function getServerRoomConflict(error: unknown): ServerRoomConflictResponse | null {
  if (!(error instanceof ServerRoomRequestError) || error.status !== 409) {
    return null;
  }

  const value = error.responseBody;

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    record.statusCode !== 409 ||
    (record.code !== REVISION_CONFLICT_CODE && record.code !== IDEMPOTENCY_CONFLICT_CODE) ||
    typeof record.message !== "string"
  ) {
    return null;
  }

  return {
    statusCode: 409,
    code: record.code,
    message: record.message,
    snapshot: parseServerRoomState(record.snapshot),
  };
}

function parseServerRoomState(value: unknown): ServerRoomState {
  if (!value || typeof value !== "object") {
    throw new ServerRoomSchemaError();
  }

  const room = value as Record<string, unknown>;

  if (
    typeof room.roomCode !== "string" ||
    !Number.isSafeInteger(room.revision) ||
    (room.revision as number) < 0 ||
    typeof room.expiresAtMs !== "number" ||
    !Number.isFinite(room.expiresAtMs) ||
    typeof room.status !== "string" ||
    !Array.isArray(room.participants) ||
    !room.partySnapshots ||
    typeof room.partySnapshots !== "object" ||
    !room.round ||
    typeof room.round !== "object" ||
    !room.tournament ||
    typeof room.tournament !== "object" ||
    !Array.isArray(room.finalStandings)
  ) {
    throw new ServerRoomSchemaError();
  }

  const tournament = parseServerTournamentState(
    room.tournament,
    (room.round as { index: number }).index,
  );
  const competitiveContract = parseCompetitiveRoomSnapshotContract(room);
  const parsed: ServerRoomState = {
    ...(value as ServerRoomState),
    tournament,
    competitiveTransitions: competitiveContract.competitiveTransitions,
  };

  if (competitiveContract.competitive) {
    parsed.competitive = competitiveContract.competitive;
  } else {
    delete parsed.competitive;
  }

  if (
    (parsed.competitive && !isCurrentAssignmentConsistentWithRoom(parsed)) ||
    parsed.competitiveTransitions.some(
      transition => !isTerminalTransitionConsistentWithRoom(parsed, transition),
    )
  ) {
    throw new ServerRoomSchemaError();
  }

  return parsed;
}

function parseSocketRoomEvent(value: unknown): ServerRoomState {
  if (!value || typeof value !== "object" || !("room" in value)) {
    throw new Error("Poke Lounge socket room event is malformed");
  }

  return parseServerRoomState((value as { room: unknown }).room);
}

function hasSameCanonicalRoomProjection(left: ServerRoomState, right: ServerRoomState): boolean {
  return (
    left.roomCode === right.roomCode &&
    left.status === right.status &&
    stableJsonStringify(left.participants) === stableJsonStringify(right.participants) &&
    stableJsonStringify(left.partySnapshots) === stableJsonStringify(right.partySnapshots) &&
    stableJsonStringify(left.round) === stableJsonStringify(right.round) &&
    stableJsonStringify(left.tournament) === stableJsonStringify(right.tournament) &&
    stableJsonStringify(left.finalStandings) === stableJsonStringify(right.finalStandings) &&
    stableJsonStringify(left.competitive) === stableJsonStringify(right.competitive)
  );
}

function stableJsonStringify(value: unknown): string | undefined {
  const sortedObjects = new WeakMap<object, Record<string, unknown>>();

  return JSON.stringify(value, (_key, nestedValue: unknown) => {
    if (!isPlainJsonObject(nestedValue)) {
      return nestedValue;
    }

    const existing = sortedObjects.get(nestedValue);
    if (existing) {
      return existing;
    }

    const sorted = Object.create(null) as Record<string, unknown>;
    sortedObjects.set(nestedValue, sorted);
    for (const key of Object.keys(nestedValue).sort()) {
      sorted[key] = nestedValue[key];
    }
    return sorted;
  });
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function compareTerminalTransitions(
  left: CompetitiveTerminalTransition,
  right: CompetitiveTerminalTransition,
): number {
  return (
    left.terminalRoomRevision - right.terminalRoomRevision ||
    left.terminalEventId.localeCompare(right.terminalEventId)
  );
}

function hasCompletedBracketMatch(state: ServerRoomState, bracketMatchId: string): boolean {
  return findBracketMatch(state, bracketMatchId)?.status === "completed";
}

function isCurrentAssignmentConsistentWithRoom(state: ServerRoomState): boolean {
  const projection = state.competitive;
  const activeMatch = findCurrentMatch(state.tournament.bracket, state.tournament.activeMatchId);

  return Boolean(
    projection &&
    state.tournament.activeMatchAuthority === "server" &&
    activeMatch &&
    projection.bracketMatchId === activeMatch.matchId &&
    hasSamePlayerIds(projection.playerIds, activeMatch.participantIds),
  );
}

function isTerminalTransitionConsistentWithRoom(
  state: ServerRoomState,
  transition: CompetitiveTerminalTransition,
): boolean {
  const projection = transition.projection;
  const terminal = projection.terminal;
  const bracketMatch = findBracketMatch(state, projection.bracketMatchId);

  return Boolean(
    terminal &&
    bracketMatch?.status === "completed" &&
    hasSamePlayerIds(projection.playerIds, bracketMatch.participantIds) &&
    terminal.winnerPlayerId === bracketMatch.winnerPlayerId &&
    terminal.loserPlayerId === bracketMatch.loserPlayerId &&
    terminal.reason === bracketMatch.resultReason,
  );
}

function findBracketMatch(state: ServerRoomState, bracketMatchId: string) {
  const bracket = state.tournament.bracket;

  return (
    bracket?.currentRound?.matches.find(match => match.matchId === bracketMatchId) ??
    bracket?.completedRounds
      .flatMap(round => round.matches)
      .find(match => match.matchId === bracketMatchId) ??
    null
  );
}

function hasSamePlayerIds(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  return (
    left.length === right.length &&
    left.every(playerId => right.includes(playerId)) &&
    right.every(playerId => left.includes(playerId))
  );
}

function resolveServerRoomSocketFactory(): ServerRoomSocketFactory {
  if (typeof window !== "undefined" && isE2eEnabled()) {
    const e2eFactory = (
      window as Window & {
        __POKE_LOUNGE_E2E_SOCKET_FACTORY__?: ServerRoomSocketFactory;
      }
    ).__POKE_LOUNGE_E2E_SOCKET_FACTORY__;

    if (e2eFactory) {
      return e2eFactory;
    }
  }

  return (url, options) => io(url, options) as unknown as ServerRoomSocket;
}

function createIdempotencyKey(): string {
  if (typeof crypto === "undefined" || !("randomUUID" in crypto)) {
    throw new Error("crypto.randomUUID is required for Poke Lounge room commands");
  }

  return crypto.randomUUID();
}

function unwrapApiResponse<T>(value: unknown): T {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data: T }).data;
  }

  return value as T;
}

function resolveServerIdentity(options: ServerRoomOptions): {
  sessionId: string;
  playerId: string;
} {
  const searchParams =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const sessionIdOverride = options.sessionId ?? searchParams?.get("serverSessionId") ?? undefined;
  const playerIdOverride = options.playerId ?? searchParams?.get("serverPlayerId") ?? undefined;

  if (sessionIdOverride && playerIdOverride) {
    return {
      sessionId: sessionIdOverride,
      playerId: playerIdOverride,
    };
  }

  const stored = readStoredIdentity();
  const identity = {
    sessionId: sessionIdOverride ?? stored?.sessionId ?? `server-session-${createIdentityToken()}`,
    playerId: playerIdOverride ?? stored?.playerId ?? `server-player-${createIdentityToken()}`,
  };

  writeStoredIdentity(identity);

  return identity;
}

function readStoredIdentity(): { sessionId: string; playerId: string } | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(SERVER_IDENTITY_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<{ sessionId: unknown; playerId: unknown }>;

    if (typeof parsed.sessionId === "string" && typeof parsed.playerId === "string") {
      return {
        sessionId: parsed.sessionId,
        playerId: parsed.playerId,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function writeStoredIdentity(identity: { sessionId: string; playerId: string }): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(SERVER_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // Ignore storage failures; generated identities still work for the current page lifetime.
  }
}

function createIdentityToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function applyCreatedRoomToLocation(roomCode: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("create");
  url.searchParams.set("network", "server");
  url.searchParams.set("room", roomCode);
  window.history.replaceState(window.history.state, "", url);
}
