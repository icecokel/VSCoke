import { getApiBaseUrl } from "@/lib/constants";
import type { MultiplayerRoom, PlayerSnapshot, RoomEvent, RoomMessage } from "./localPreviewRoom";

type Handler<T extends RoomMessage> = (payload: RoomEvent[T]) => void;

interface ServerParticipant {
  sessionId: string;
  playerId: string;
  displayName?: string;
  role: "participant" | "spectator";
  connected: boolean;
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
  let announcedTournament = false;
  let announcedCompletion = false;

  const emit = <T extends RoomMessage>(type: T, payload: RoomEvent[T]) => {
    for (const handler of handlers.get(type) ?? []) {
      handler(payload as RoomEvent[RoomMessage]);
    }
  };

  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Poke Lounge server room request failed: ${response.status}`);
    }

    return unwrapApiResponse<T>(await response.json());
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
      applyServerState(await request<ServerRoomState>(`/poke-lounge/rooms/${activeRoomId}`));
    } finally {
      if (!disposed && latestState?.status !== "completed" && latestState?.status !== "closed") {
        schedulePoll();
      }
    }
  };

  const applyServerState = (state: ServerRoomState) => {
    latestState = state;
    activeRoomId = state.roomCode;
    emit("CURRENT_PLAYERS", {
      players: Object.fromEntries(
        state.participants
          .filter(participant => participant.connected)
          .map(participant => [
            participant.sessionId,
            toPlayerSnapshot(participant, serverPlayerId, localPlayerId),
          ]),
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
    const match = latestState?.tournament.matches.find(row => row.matchId === payload.matchId);
    const loserPlayerId =
      payload.loserPlayerId ??
      match?.participantIds.find(candidate => candidate !== payload.winnerPlayerId);

    if (!loserPlayerId) {
      return;
    }

    const nextState = await request<ServerRoomState>(`/poke-lounge/rooms/${activeRoomId}/result`, {
      method: "POST",
      body: JSON.stringify({
        reportingPlayerId: serverPlayerId,
        matchId: payload.matchId,
        winnerPlayerId: payload.winnerPlayerId,
        loserPlayerId,
        reason: payload.reason ?? "faint",
      }),
    });
    applyServerState(nextState);
  };

  const submitPartySnapshot = async (snapshot: PlayerSnapshot) => {
    const nextState = await request<ServerRoomState>(
      `/poke-lounge/rooms/${activeRoomId}/party-snapshot`,
      {
        method: "POST",
        body: JSON.stringify({
          playerId: serverPlayerId,
          displayName: snapshot.displayName,
          representativePokemon: toRepresentativePokemonSnapshot(snapshot),
        }),
      },
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
          request<ServerRoomState>(`/poke-lounge/rooms/${activeRoomId}/ready`, {
            method: "POST",
            body: JSON.stringify({
              playerId: serverPlayerId,
              ready: true,
            }),
          }),
        )
        .then(applyServerState)
        .then(poll)
        .catch(() => {
          schedulePoll();
        });
    },
    dispose() {
      disposed = true;
      if (pollTimer) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
      window.removeEventListener("poke-lounge:e2e-server-result", e2eResultHandler);
      void request<ServerRoomState>(`/poke-lounge/rooms/${activeRoomId}/leave`, {
        method: "POST",
        body: JSON.stringify({ playerId: serverPlayerId }),
      }).catch(() => {});
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
      return request<ServerRoomState>("/poke-lounge/rooms", {
        method: "POST",
        body,
      }).then(state => {
        applyCreatedRoomToLocation(state.roomCode);

        return state;
      });
    }

    return request<ServerRoomState>(`/poke-lounge/rooms/${activeRoomId}/join`, {
      method: "POST",
      body,
    });
  }

  function mapServerPlayerIdForLocalStore(playerId: string): string {
    return playerId === serverPlayerId ? localPlayerId : playerId;
  }

  function getHostPlayerIdForLocalStore(state: ServerRoomState): string {
    const host = [...state.participants]
      .filter(participant => participant.connected)
      .sort((left, right) =>
        left.sessionId.localeCompare(right.sessionId, undefined, { numeric: true }),
      )[0];

    return host ? mapServerPlayerIdForLocalStore(host.playerId) : localPlayerId;
  }
}

function toPlayerSnapshot(
  participant: ServerParticipant,
  serverPlayerId: string,
  localPlayerId: string,
): PlayerSnapshot {
  const local = participant.playerId === serverPlayerId;

  return {
    sessionId: participant.sessionId,
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
