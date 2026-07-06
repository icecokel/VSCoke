import { createLocalPreviewRoom, type MultiplayerRoom } from "./localPreviewRoom";

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

  return createLocalPreviewRoom({
    roomId: readLocalRoomId(options.searchParams),
  });
}

function readLocalRoomId(searchParams: Pick<URLSearchParams, "get">): string | undefined {
  const roomId = searchParams.get("room")?.trim();

  return roomId ? roomId : undefined;
}
