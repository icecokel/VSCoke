import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHAT_QUESTION_MAX_LENGTH,
  getChatComposerKeyAction,
  isChatQuestionSendable,
  isChatQuestionTooLong,
} from "./chat-composer";

const enter = { key: "Enter", shiftKey: false, isComposing: false, keyCode: 13 };

test("Enter는 전송하고 Shift+Enter와 다른 키는 기본 동작을 둔다", () => {
  assert.equal(getChatComposerKeyAction(enter), "submit");
  assert.equal(getChatComposerKeyAction({ ...enter, shiftKey: true }), null);
  assert.equal(getChatComposerKeyAction({ ...enter, key: "a", keyCode: 65 }), null);
});

test("IME 조합을 확정하는 Enter는 전송하지 않는다", () => {
  assert.equal(getChatComposerKeyAction({ ...enter, isComposing: true }), "composing");
  assert.equal(getChatComposerKeyAction({ ...enter, keyCode: 229 }), "composing");
});

test("앞뒤 공백을 뺀 질문이 2자 이상 1,000자 이하일 때만 보낼 수 있다", () => {
  assert.equal(isChatQuestionSendable(" 가 "), false);
  assert.equal(isChatQuestionSendable("가나"), true);
  assert.equal(isChatQuestionSendable("가".repeat(CHAT_QUESTION_MAX_LENGTH)), true);
  assert.equal(isChatQuestionSendable(`  ${"가".repeat(CHAT_QUESTION_MAX_LENGTH)}  `), true);
  assert.equal(isChatQuestionSendable("가".repeat(CHAT_QUESTION_MAX_LENGTH + 1)), false);
  assert.equal(isChatQuestionTooLong("가".repeat(CHAT_QUESTION_MAX_LENGTH + 1)), true);
  assert.equal(isChatQuestionTooLong("가".repeat(CHAT_QUESTION_MAX_LENGTH)), false);
});
