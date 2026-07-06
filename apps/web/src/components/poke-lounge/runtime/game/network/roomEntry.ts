export const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type RoomEntryMode = "unset" | "solo" | "local-room" | "server-room" | "webrtc";

export interface RoomEntryIntent {
  mode: RoomEntryMode;
  roomCode: string | null;
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

export function createInviteUrl(baseUrl: URL, roomCode: string): URL {
  const url = new URL(baseUrl.href);
  url.searchParams.set("network", "local");
  url.searchParams.set("room", roomCode);

  return url;
}

export function createServerInviteUrl(baseUrl: URL, roomCode: string): URL {
  const url = new URL(baseUrl.href);
  url.searchParams.set("network", "server");
  url.searchParams.set("room", roomCode);

  return url;
}

export function readRoomEntryFromLocation(location: URL): RoomEntryIntent {
  const network = location.searchParams.get("network");

  if (network === "webrtc") {
    return {
      mode: "webrtc",
      roomCode: null,
    };
  }

  const roomCode = normalizeRoomCode(location.searchParams.get("room") ?? "");

  if (network === "server" && roomCode) {
    return {
      mode: "server-room",
      roomCode,
    };
  }

  if (network === "server" && location.searchParams.get("create") === "1") {
    return {
      mode: "server-room",
      roomCode: null,
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
