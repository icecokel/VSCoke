import assert from "node:assert/strict";
import test from "node:test";
import { resolveServerRoomEntryCapability } from "./roomEntry";
import { shouldResetRoomEntrySession } from "./roomEntryScreen";

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

test("서버 방 capability가 없으면 기존 서버 입장을 유지한다", () => {
  assert.deepEqual(resolveServerRoomEntryCapability(), {
    enabled: true,
    disabledReason: null,
  });
});

test("서버 방 capability가 차단되면 제공된 사유를 정리해 노출한다", () => {
  assert.deepEqual(
    resolveServerRoomEntryCapability({
      enabled: false,
      disabledReason: "  서버 경쟁전은 로그인 후 이용할 수 있습니다.  ",
    }),
    {
      enabled: false,
      disabledReason: "서버 경쟁전은 로그인 후 이용할 수 있습니다.",
    },
  );
});

test("서버 방 차단 사유가 비어 있으면 로그인 안내를 사용한다", () => {
  assert.deepEqual(resolveServerRoomEntryCapability({ enabled: false, disabledReason: " " }), {
    enabled: false,
    disabledReason: "로그인 후 서버 경쟁전을 이용할 수 있습니다.",
  });
});
