export const ROOM_CODE_LENGTH = 6;
export const ROOM_ROUND_DURATION_QUERY_PARAM = "roundMs";
export const ROOM_ROUND_DURATION_OPTIONS_MS = [180_000, 300_000, 600_000, 900_000] as const;

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type RoomEntryMode = "unset" | "solo" | "local-room" | "server-room" | "webrtc";
export type RoomRoundDurationMs = (typeof ROOM_ROUND_DURATION_OPTIONS_MS)[number];

// 서버 경쟁전 안정화가 끝날 때까지 공개 클라이언트의 새 방 생성·입장을 막는다.
// 서버 연동 회귀 검증은 계속해야 하므로 로컬 E2E URL에서만 예외로 허용한다.
export const SERVER_COMPETITIVE_ENTRY_ENABLED = false;

export interface RoomEntryIntent {
  mode: RoomEntryMode;
  roomCode: string | null;
  createRoom?: boolean;
}

export interface ServerRoomEntryCapability {
  enabled: boolean;
  disabledReason?: string;
}

export interface ResolvedServerRoomEntryCapability {
  enabled: boolean;
  disabledReason: string | null;
}

const DEFAULT_SERVER_ROOM_DISABLED_REASON = "로그인 후 서버 경쟁전을 이용할 수 있습니다.";

export const isServerCompetitiveEntryEnabled = (isLocalE2e: boolean): boolean =>
  SERVER_COMPETITIVE_ENTRY_ENABLED || isLocalE2e;

export function resolveServerRoomEntryCapability(
  capability?: ServerRoomEntryCapability,
): ResolvedServerRoomEntryCapability {
  if (capability?.enabled !== false) {
    return {
      enabled: true,
      disabledReason: null,
    };
  }

  return {
    enabled: false,
    disabledReason: capability.disabledReason?.trim() || DEFAULT_SERVER_ROOM_DISABLED_REASON,
  };
}

export function normalizeRoomCode(value: string): string | null {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH);

  return normalized.length > 0 ? normalized : null;
}

export function createRoomCode(random: () => number = Math.random): string {
  return Array.from({ length: ROOM_CODE_LENGTH }, () => {
    const index = Math.min(
      ROOM_CODE_ALPHABET.length - 1,
      Math.floor(Math.max(0, Math.min(0.999999, random())) * ROOM_CODE_ALPHABET.length),
    );

    return ROOM_CODE_ALPHABET[index];
  }).join("");
}

export function createInviteUrl(baseUrl: URL, roomCode: string, roundDurationMs?: number): URL {
  const url = new URL(baseUrl.href);
  url.searchParams.set("network", "local");
  url.searchParams.set("room", roomCode);
  applyRoomRoundDurationSearchParam(url, roundDurationMs);

  return url;
}

export function createServerInviteUrl(
  baseUrl: URL,
  roomCode: string,
  roundDurationMs?: number,
): URL {
  const url = new URL(baseUrl.href);
  url.searchParams.set("network", "server");
  url.searchParams.set("room", roomCode);
  applyRoomRoundDurationSearchParam(url, roundDurationMs);

  return url;
}

export function normalizeRoomRoundDurationMs(value: unknown): RoomRoundDurationMs | null {
  const numericValue = typeof value === "string" ? Number(value) : value;

  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) {
    return null;
  }

  const durationMs = Math.trunc(numericValue);

  return ROOM_ROUND_DURATION_OPTIONS_MS.find(option => option === durationMs) ?? null;
}

export function applyRoomRoundDurationSearchParam(url: URL, roundDurationMs?: number): void {
  const normalizedDurationMs = normalizeRoomRoundDurationMs(roundDurationMs);

  if (normalizedDurationMs === null) {
    url.searchParams.delete(ROOM_ROUND_DURATION_QUERY_PARAM);
    return;
  }

  url.searchParams.set(ROOM_ROUND_DURATION_QUERY_PARAM, String(normalizedDurationMs));
}

export function readRoomEntryFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): RoomEntryIntent {
  const network = searchParams.get("network");

  if (network === "webrtc") {
    return {
      mode: "webrtc",
      roomCode: null,
    };
  }

  const roomCode = normalizeRoomCode(searchParams.get("room") ?? "");

  if (network === "server" && roomCode) {
    return {
      mode: "server-room",
      roomCode,
    };
  }

  if (network === "server" && searchParams.get("create") === "1") {
    return {
      mode: "server-room",
      roomCode: null,
      createRoom: true,
    };
  }

  if (roomCode) {
    return {
      mode: "local-room",
      roomCode,
    };
  }

  return {
    mode: "unset",
    roomCode: null,
  };
}

export function readRoomEntryFromLocation(location: URL): RoomEntryIntent {
  return readRoomEntryFromSearchParams(location.searchParams);
}
