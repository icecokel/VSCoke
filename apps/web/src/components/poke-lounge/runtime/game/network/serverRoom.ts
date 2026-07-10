import { getApiBaseUrl } from "@/lib/constants";
import type { MultiplayerRoom, PlayerSnapshot, RoomEvent, RoomMessage } from "./localPreviewRoom";

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
}

export interface ServerRoomOptions {
  roomId?: string;
  sessionId?: string;
  playerId?: string;
  createRoom?: boolean;
  pollIntervalMs?: number;
}

const SERVER_IDENTITY_STORAGE_KEY = "poke-lounge:server-room-identity";
const DEFAULT_POLL_INTERVAL_MS = 750;
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

export function createServerRoom(options: ServerRoomOptions): MultiplayerRoom {
  const identity = resolveServerIdentity(options);
  const sessionId = identity.sessionId;
  const serverPlayerId = identity.playerId;
  let localPlayerId = serverPlayerId;
  let activeRoomId = options.roomId ?? PENDING_ROOM_ID;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const handlers = new Map<RoomMessage, Set<Handler<RoomMessage>>>();
  let disposed = false;
  let pollTimer: number | null = null;
  let latestState: ServerRoomState | null = null;
  let mutationQueue: Promise<void> = Promise.resolve();
  let announcedTournament = false;
  let announcedCompletion = false;

  const emit = <T extends RoomMessage>(type: T, payload: RoomEvent[T]) => {
    for (const handler of handlers.get(type) ?? []) {
      handler(payload as RoomEvent[RoomMessage]);
    }
  };

  const requestRoom = async (path: string, init?: RequestInit): Promise<ServerRoomState> => {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    const responseBody = await response.json();
    const unwrapped = unwrapApiResponse<unknown>(responseBody);

    if (!response.ok) {
      throw new ServerRoomRequestError(response.status, unwrapped);
    }

    return parseServerRoomState(unwrapped);
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
      let expectedRevision = await revisionResolver();
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

        applyServerState(conflict.snapshot);

        if (conflict.code === IDEMPOTENCY_CONFLICT_CODE) {
          throw error;
        }

        expectedRevision = conflict.snapshot.revision;

        try {
          return await retryOneNetworkFailure(() => send(expectedRevision));
        } catch (retryError) {
          const retryConflict = getServerRoomConflict(retryError);

          if (retryConflict) {
            applyServerState(retryConflict.snapshot);
          }

          throw retryError;
        }
      }
    });
  };

  const schedulePoll = () => {
    if (disposed || pollTimer) {
      return;
    }

    pollTimer = window.setTimeout(() => {
      pollTimer = null;
      void poll();
    }, pollIntervalMs);
  };

  const poll = async () => {
    if (disposed) {
      return;
    }

    try {
      applyServerState(await requestRoom(`/poke-lounge/rooms/${activeRoomId}`));
    } finally {
      if (!disposed && latestState?.status !== "completed" && latestState?.status !== "closed") {
        schedulePoll();
      }
    }
  };

  const applyServerState = (state: ServerRoomState) => {
    if (latestState?.roomCode === state.roomCode && state.revision < latestState.revision) {
      return;
    }

    latestState = state;
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

      if (!champion) {
        return;
      }

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
  };

  const submitMatchResult = async (payload: {
    matchId: string;
    winnerPlayerId: string;
    loserPlayerId?: string;
    reason?: "faint" | "timeout" | "forfeit" | "run" | "capture";
  }) => {
    const nextState = await mutateRoom(
      `/poke-lounge/rooms/${activeRoomId}/result`,
      () => {
        const match = latestState?.tournament.matches.find(row => row.matchId === payload.matchId);
        const winnerPlayerId = mapLocalPlayerIdForServer(payload.winnerPlayerId);
        const loserPlayerId =
          (payload.loserPlayerId ? mapLocalPlayerIdForServer(payload.loserPlayerId) : undefined) ??
          match?.participantIds.find(candidate => candidate !== winnerPlayerId);

        if (!loserPlayerId) {
          throw new Error("Poke Lounge server match opponent is unavailable");
        }

        return {
          reportingPlayerId: serverPlayerId,
          reportingSessionId: sessionId,
          matchId: payload.matchId,
          winnerPlayerId,
          loserPlayerId,
          reason: payload.reason ?? "faint",
        };
      },
      getLatestRevision,
    );
    applyServerState(nextState);
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

    applyServerState(nextState);
  };

  const e2eResultHandler = (event: Event) => {
    if (!isE2eEnabled()) {
      return;
    }

    const detail = (event as CustomEvent<unknown>).detail;

    if (!isResultDetail(detail)) {
      return;
    }

    void submitMatchResult(detail).catch(() => {});
  };

  if (typeof window !== "undefined") {
    window.addEventListener("poke-lounge:e2e-server-result", e2eResultHandler);
  }

  return {
    get roomId() {
      return activeRoomId;
    },
    sessionId,
    connect(initialSnapshot) {
      if (disposed) {
        return;
      }

      const snapshot = initialSnapshot ?? createDefaultSnapshot(sessionId, localPlayerId);
      localPlayerId = snapshot.playerId?.trim() || localPlayerId;
      void openServerRoom(snapshot)
        .then(state => {
          applyServerState(state);
          return submitPartySnapshot(snapshot);
        })
        .then(() =>
          mutateRoom(
            `/poke-lounge/rooms/${activeRoomId}/ready`,
            {
              playerId: serverPlayerId,
              sessionId,
              ready: true,
            },
            getLatestRevision,
          ),
        )
        .then(applyServerState)
        .then(poll)
        .catch(() => {
          schedulePoll();
        });
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      if (pollTimer) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
      window.removeEventListener("poke-lounge:e2e-server-result", e2eResultHandler);
      void mutateRoom(
        `/poke-lounge/rooms/${activeRoomId}/leave`,
        { playerId: serverPlayerId, sessionId },
        getLatestRevision,
      ).catch(() => {});
      handlers.clear();
    },
    send(type, payload) {
      if (type === "PLAYER_CHANGED_MAP") {
        void submitPartySnapshot(payload as PlayerSnapshot).catch(() => {});
        return;
      }

      if (type === "TOURNAMENT_MATCH_RESULT") {
        void submitMatchResult(payload as RoomEvent["TOURNAMENT_MATCH_RESULT"]).catch(() => {});
      }
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
        applyCreatedRoomToLocation(state.roomCode);

        return state;
      });
    }

    return mutateRoom(`/poke-lounge/rooms/${activeRoomId}/join`, JSON.parse(body), async () => {
      const current = await requestRoom(`/poke-lounge/rooms/${activeRoomId}`);
      applyServerState(current);

      return current.revision;
    });
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

  function mapLocalPlayerIdForServer(playerId: string): string {
    return playerId === localPlayerId ? serverPlayerId : playerId;
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

function isResultDetail(value: unknown): value is {
  matchId: string;
  winnerPlayerId: string;
  loserPlayerId?: string;
  reason?: "faint" | "timeout" | "forfeit" | "run" | "capture";
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return typeof record.matchId === "string" && typeof record.winnerPlayerId === "string";
}

function isE2eEnabled(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("e2e");
}

async function retryOneNetworkFailure<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ServerRoomRequestError) {
      throw error;
    }

    return operation();
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
    throw new Error("Poke Lounge room response is malformed");
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
    throw new Error("Poke Lounge room response is malformed");
  }

  return value as ServerRoomState;
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
