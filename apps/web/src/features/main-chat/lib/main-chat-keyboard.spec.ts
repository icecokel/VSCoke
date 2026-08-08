import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldSubmitMainChatKey } from "./main-chat-keyboard";

test("Enter만 전송하고 Shift+Enter와 IME 조합 Enter는 전송하지 않는다", () => {
  assert.equal(
    shouldSubmitMainChatKey({ key: "Enter", shiftKey: false, isComposing: false }),
    true,
  );
  assert.equal(
    shouldSubmitMainChatKey({ key: "Enter", shiftKey: true, isComposing: false }),
    false,
  );
  assert.equal(
    shouldSubmitMainChatKey({ key: "Enter", shiftKey: false, isComposing: true }),
    false,
  );
});
