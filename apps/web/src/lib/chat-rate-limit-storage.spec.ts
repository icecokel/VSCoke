import assert from "node:assert/strict";
import { test } from "node:test";
import { readStoredChatRateLimit, storeChatRateLimit } from "./chat-rate-limit-storage";

const createMemoryStorage = () => {
  const values = new Map<string, string>();

  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};

const now = 1_700_000_000_000;

test("복구 시각 전에는 저장한 남은 횟수를 채널별로 돌려준다", () => {
  const storage = createMemoryStorage();
  const resetAt = new Date(now + 60_000);

  storeChatRateLimit("main", { limit: 30, remaining: 27, resetAt }, storage);

  assert.deepEqual(readStoredChatRateLimit("main", now, storage), {
    limit: 30,
    remaining: 27,
    resetAt,
  });
  assert.equal(readStoredChatRateLimit("resume", now, storage), undefined);
});

test("복구 시각이 지났거나 형식이 깨진 값은 지우고 무시한다", () => {
  const storage = createMemoryStorage();

  storeChatRateLimit("main", { limit: 30, remaining: 0, resetAt: new Date(now) }, storage);
  assert.equal(readStoredChatRateLimit("main", now, storage), undefined);
  assert.equal(storage.values.size, 0);

  storage.setItem("vscoke.chatRateLimit.resume", '{"limit":20,"remaining":21,"resetAt":1}');
  assert.equal(readStoredChatRateLimit("resume", 0, storage), undefined);

  storage.setItem("vscoke.chatRateLimit.resume", "not-json");
  assert.equal(readStoredChatRateLimit("resume", now, storage), undefined);
});
