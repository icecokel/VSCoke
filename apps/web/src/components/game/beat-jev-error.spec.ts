import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@/lib/api-client";
import { resolveBeatJevErrorMessage } from "./beat-jev-error";

const messages = {
  requestFailed: "Could not continue",
  rateLimited: "Too many requests. Please try again later.",
};
const t = (key: keyof typeof messages): string => messages[key];

test("429 API 오류는 서버의 한국어 메시지 대신 로케일별 속도 제한 문구를 반환한다", () => {
  const error = new ApiError(429, "JEV 게임 요청은 IP당 1시간에 240회까지 사용할 수 있습니다.");

  assert.equal(resolveBeatJevErrorMessage(error, t), messages.rateLimited);
});

test("409 API 오류의 서버 메시지를 유지한다", () => {
  const error = new ApiError(409, "게임 상태가 변경되었습니다.");

  assert.equal(resolveBeatJevErrorMessage(error, t), error.message);
});

test("일반 오류의 메시지를 유지한다", () => {
  const error = new Error("Network failed");

  assert.equal(resolveBeatJevErrorMessage(error, t), error.message);
});

test("문자열이나 undefined 오류는 기본 실패 문구를 반환한다", () => {
  assert.equal(resolveBeatJevErrorMessage("오류", t), messages.requestFailed);
  assert.equal(resolveBeatJevErrorMessage(undefined, t), messages.requestFailed);
});
