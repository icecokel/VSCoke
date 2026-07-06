import { createLocalPreviewRoom, type MultiplayerRoom } from "./localPreviewRoom";
import { createServerRoom } from "./serverRoom";

export interface MultiplayerRoomFactoryOptions {
  searchParams: Pick<URLSearchParams, "get">;
  createWebRtcRoom?: () => MultiplayerRoom;
}

export function createMultiplayerRoom(options: MultiplayerRoomFactoryOptions): MultiplayerRoom {
  if (options.searchParams.get("network") === "webrtc") {
    if (!options.createWebRtcRoom) {
      throw new Error("Missing createWebRtcRoom dependency for ?network=webrtc.");
    }

    return options.createWebRtcRoom();
  }

  if (options.searchParams.get("network") === "server") {
    return createServerRoom({
      roomId: readLocalRoomId(options.searchParams),
      sessionId: options.searchParams.get("serverSessionId") ?? undefined,
      playerId: options.searchParams.get("serverPlayerId") ?? undefined,
      createRoom: options.searchParams.get("create") === "1",
    });
  }

  return createLocalPreviewRoom({
    roomId: readLocalRoomId(options.searchParams),
  });
}

function readLocalRoomId(searchParams: Pick<URLSearchParams, "get">): string | undefined {
  const roomId = searchParams.get("room")?.trim();

  return roomId ? roomId : undefined;
}
