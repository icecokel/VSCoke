import assert from "node:assert/strict";
import test from "node:test";
import { readRoomEntryFromSearchParams, readRoomRoundDurationMs } from "./roomEntry";
import { normalizeMultiplayerDisplayName, shouldResetRoomEntrySession } from "./roomEntryScreen";

test("명시적으로 선택한 솔로 새 게임만 저장 세션을 초기화한다", () => {
  assert.equal(
    shouldResetRoomEntrySession({
      mode: "solo",
      roomCode: null,
      inviteUrl: null,
      resetSession: true,
    }),
    true,
  );
  assert.equal(
    shouldResetRoomEntrySession({
      mode: "solo",
      roomCode: null,
      inviteUrl: null,
    }),
    false,
  );
});

test("방 생성 선택에 초기화 플래그가 있어도 저장 세션을 유지한다", () => {
  for (const mode of ["local-room", "server-room", "webrtc"] as const) {
    assert.equal(
      shouldResetRoomEntrySession({
        mode,
        roomCode: "ABC123",
        inviteUrl: "https://example.com/room/ABC123",
        createRoom: true,
        resetSession: true,
      }),
      false,
    );
  }
});

test("서버 방 URL은 선택 화면 없이 생성과 코드 입장을 유지한다", () => {
  assert.deepEqual(readRoomEntryFromSearchParams(new URLSearchParams("network=server&create=1")), {
    mode: "server-room",
    roomCode: null,
    createRoom: true,
  });
  assert.deepEqual(
    readRoomEntryFromSearchParams(new URLSearchParams("network=server&room=ABC123")),
    {
      mode: "server-room",
      roomCode: "ABC123",
    },
  );
  assert.equal(readRoomRoundDurationMs(new URLSearchParams("roundMs=600000")), 600_000);
  assert.equal(readRoomRoundDurationMs(new URLSearchParams("roundMs=123")), null);
});

test("멀티플레이 닉네임은 공백을 제거하고 최대 12자로 정리한다", () => {
  assert.equal(normalizeMultiplayerDisplayName("  레드  "), "레드");
  assert.equal(normalizeMultiplayerDisplayName("abcdefghijklmn"), "abcdefghijkl");
});
