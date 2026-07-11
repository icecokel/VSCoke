import { createLocalPreviewRoom, type MultiplayerRoom } from "./localPreviewRoom";
import { readRoomEntryFromSearchParams } from "./roomEntry";
import { createServerRoom } from "./serverRoom";

export interface MultiplayerRoomFactoryOptions {
  searchParams: Pick<URLSearchParams, "get">;
  createWebRtcRoom?: () => MultiplayerRoom;
  idToken?: string;
}

export function createMultiplayerRoom(options: MultiplayerRoomFactoryOptions): MultiplayerRoom {
  const roomEntry = readRoomEntryFromSearchParams(options.searchParams);

  if (roomEntry.mode === "webrtc") {
    if (!options.createWebRtcRoom) {
      throw new Error("Missing createWebRtcRoom dependency for ?network=webrtc.");
    }

    return options.createWebRtcRoom();
  }

  if (roomEntry.mode === "server-room") {
    return createServerRoom({
      roomId: roomEntry.roomCode ?? undefined,
      sessionId: options.searchParams.get("serverSessionId") ?? undefined,
      playerId: options.searchParams.get("serverPlayerId") ?? undefined,
      createRoom: roomEntry.createRoom === true,
      idToken: options.idToken,
    });
  }

  return createLocalPreviewRoom({
    roomId: roomEntry.roomCode ?? undefined,
  });
}
