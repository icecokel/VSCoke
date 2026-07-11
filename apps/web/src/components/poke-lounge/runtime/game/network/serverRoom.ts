import { getApiBaseUrl } from "@/lib/constants";
import { io } from "socket.io-client";
import type {
  CompetitiveProjection,
  MultiplayerRoom,
  PlayerSnapshot,
  RoomEvent,
  RoomMessage,
} from "./localPreviewRoom";
import {
  CompetitiveProjectionSchemaError,
  parseCompetitiveProjection,
} from "./competitive-projection";

type Handler<T extends RoomMessage> = (payload: RoomEvent[T]) => void;

interface ServerParticipant {
  playerId: string;
  displayName?: string;
  role: "participant" | "spectator";
  connected: boolean;
  joinedAtMs: number;
}

interface ServerMatch {
  matchId: string;
  participantIds: [string, string];
  status: "pending" | "completed";
  winnerPlayerId?: string;
  loserPlayerId?: string;
  resultReason?: "faint" | "timeout" | "forfeit" | "run" | "capture";
}

interface ServerPartySnapshot {
  playerId: string;
  displayName?: string;
  representativePokemon?: {
    speciesId: number;
    name: string;
    level: number;
    currentHp: number;
    maxHp: number;
  };
  updatedAtMs: number;
}

interface ServerRoomState {
  roomCode: string;
  revision: number;
  expiresAtMs: number;
  status: "waiting" | "round-started" | "tournament" | "completed" | "closed";
  participants: ServerParticipant[];
  partySnapshots: Record<string, ServerPartySnapshot>;
  round: {
    index: number;
  };
  tournament: {
    matches: ServerMatch[];
    cumulativeScores: Record<string, number>;
  };
  finalStandings: Array<{
    playerId: string;
    rank: number;
    score: number;
  }>;
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

const SERVER_IDENTITY_STORAGE_KEY = "poke-lounge:server-room-identity";
const RECOVERY_INITIAL_DELAY_MS = 250;
const RECOVERY_MAX_DELAY_MS = 5000;
const CLIENT_FINAL_ROUND_INDEX = 3;
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
  let recoveryQueued = false;
  let competitiveActionRecoveryTimer: number | null = null;
  let competitiveActionRecoveryAttempt = 0;
  let competitiveActionRecoveryInFlight = false;
  let competitiveActionRecoveryMatchId: string | null = null;
  let latestState: ServerRoomState | null = null;
  let lastAppliedRevision = -1;
  let roomSocket: ServerRoomSocket | null = null;
  let socketConnected = false;
  let subscriptionFailed = false;
  let cursorRegression = false;
  let connectStarted = false;
  let mutationQueue: Promise<void> = Promise.resolve();
  let announcedTournament = false;
  let announcedCompletion = false;
  let announcedCompetitiveAssignmentKey: string | null = null;
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
      void runRecovery();
    }, delayMs);
  };

  const runRecovery = async () => {
    if (disposed || cursorRegression || activeRoomId === PENDING_ROOM_ID) {
      return;
    }

    if (recoveryInFlight) {
      recoveryQueued = true;
      return;
    }

    recoveryInFlight = true;
    try {
      const room = await requestRoom(
        `/poke-lounge/rooms/${activeRoomId}?afterRevision=${lastAppliedRevision}`,
      );
      applySnapshot(room);
    } catch {
      subscriptionFailed = socketConnected;
    } finally {
      recoveryInFlight = false;

      if (recoveryQueued) {
        recoveryQueued = false;
        void runRecovery();
        return;
      }

      scheduleRecovery();
    }
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
      afterRevision: lastAppliedRevision,
    });
    void runRecovery();
  };

  const handleSocketDisconnect = () => {
    socketConnected = false;
    scheduleRecovery();
  };

  const handleSocketConnectError = () => {
    socketConnected = false;
    subscriptionFailed = true;
    scheduleRecovery();
  };

  const handleSocketSnapshot = (event: unknown) => {
    let room: ServerRoomState;

    try {
      room = parseSocketRoomEvent(event);
    } catch {
      subscriptionFailed = true;
      scheduleRecovery();
      return;
    }

    const applied = applySnapshot(room);

    if (applied && socketConnected) {
      subscriptionFailed = false;
      clearRecoveryTimer();
    }
  };

  const handleSubscriptionError = () => {
    if (disposed || cursorRegression) {
      return;
    }

    subscriptionFailed = true;
    scheduleRecovery();
  };

  const handleRevisionConflict = (event: unknown) => {
    let room: ServerRoomState;

    try {
      room = parseSocketRoomEvent(event);
    } catch {
      return;
    }

    if (room.roomCode !== activeRoomId || room.revision >= lastAppliedRevision) {
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

    if (
      (!acceptsCreatedRoom && state.roomCode !== activeRoomId) ||
      state.revision < lastAppliedRevision
    ) {
      return false;
    }

    latestState = state;
    lastAppliedRevision = state.revision;
    activeRoomId = state.roomCode;
    emit("CURRENT_PLAYERS", {
      players: Object.fromEntries(
        state.participants
          .filter(participant => participant.connected)
          .map(participant => {
            const snapshot = toPlayerSnapshot(
              participant,
              serverPlayerId,
              sessionId,
              localPlayerId,
            );

            return [snapshot.sessionId, snapshot] as const;
          }),
      ),
    });

    if (state.competitive) {
      applyCompetitiveProjection(state.competitive);
    }

    if (!announcedTournament && (state.status === "tournament" || state.status === "completed")) {
      announcedTournament = true;
      emit("TOURNAMENT_STARTED", {
        roundIndex: state.round.index,
        hostPlayerId: getHostPlayerIdForLocalStore(state),
        participantIds: state.participants
          .filter(participant => participant.role === "participant")
          .map(participant => mapServerPlayerIdForLocalStore(participant.playerId)),
        matchIds: state.tournament.matches.map(match => match.matchId),
      });
    }

    if (!announcedCompletion && state.status === "completed" && state.finalStandings.length > 0) {
      announcedCompletion = true;
      const champion = state.finalStandings.find(standing => standing.rank === 1);

      if (champion) {
        emit("TOURNAMENT_COMPLETED", {
          roundIndex: Math.max(state.round.index, CLIENT_FINAL_ROUND_INDEX),
          hostPlayerId: getHostPlayerIdForLocalStore(state),
          championPlayerId: mapServerPlayerIdForLocalStore(champion.playerId),
          standings: state.finalStandings.map(standing => ({
            ...standing,
            playerId: mapServerPlayerIdForLocalStore(standing.playerId),
          })),
        });
      }
    }

    if (isTerminalState()) {
      clearRecoveryTimer();
      clearCompetitiveActionRecovery();
    }

    return true;
  };

  const applyCompetitiveProjection = (projection: CompetitiveProjection) => {
    clearCompetitiveActionRecovery();
    const payload = { projection, ownPlayerId: serverPlayerId };
    const assignmentKey = `${projection.matchId}:${projection.assignmentRevision}`;

    if (announcedCompetitiveAssignmentKey !== assignmentKey) {
      announcedCompetitiveAssignmentKey = assignmentKey;
      emit("COMPETITIVE_ASSIGNMENT", payload);
    }
    emit("COMPETITIVE_STATE", payload);
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
      const room = await requestRoom(`/poke-lounge/rooms/${activeRoomId}`);
      applySnapshot(room);
      recovered = room.competitive?.matchId === matchId;
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
    const send = async (): Promise<CompetitiveProjection> => {
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
      return parseCompetitiveProjection(responseBody);
    };

    try {
      applyCompetitiveProjection(await retryOneNetworkFailure(send));
    } catch (error) {
      emit("COMPETITIVE_ACTION_FAILED", {
        matchId: command.matchId,
        status: error instanceof ServerRoomRequestError ? error.status : null,
        message: "서버 상태를 다시 불러오는 중...",
      });
      scheduleCompetitiveActionRecovery(command.matchId);
    }
  };

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

      // Server rooms never accept client-asserted tournament results.
    },
    on(type, handler) {
      const typedHandler = handler as Handler<RoomMessage>;
      const nextHandlers = handlers.get(type) ?? new Set<Handler<RoomMessage>>();
      nextHandlers.add(typedHandler);
      handlers.set(type, nextHandlers);

      return () => {
        nextHandlers.delete(typedHandler);
      };
    },
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
            applyCompetitiveProjection(assignment);
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

  function getHostPlayerIdForLocalStore(state: ServerRoomState): string {
    const host = [...state.participants]
      .filter(participant => participant.connected)
      .sort(
        (left, right) =>
          left.joinedAtMs - right.joinedAtMs || left.playerId.localeCompare(right.playerId),
      )[0];

    return host ? mapServerPlayerIdForLocalStore(host.playerId) : localPlayerId;
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

  const parsed = value as ServerRoomState;
  if (parsed.competitive !== undefined) {
    parsed.competitive = parseCompetitiveProjection(parsed.competitive);
  }

  return parsed;
}

function parseSocketRoomEvent(value: unknown): ServerRoomState {
  if (!value || typeof value !== "object" || !("room" in value)) {
    throw new Error("Poke Lounge socket room event is malformed");
  }

  return parseServerRoomState((value as { room: unknown }).room);
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
