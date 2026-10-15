import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNow = Date.now;
const requests: Array<{ url: string; init?: RequestInit }> = [];
let localStore: Map<string, string>;
let sessionStore: Map<string, string>;

const storage = (store: Map<string, string>) => ({
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
});

beforeEach(() => {
  requests.length = 0;
  localStore = new Map();
  sessionStore = new Map();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { pathname: "/ko-KR" },
      localStorage: storage(localStore),
      sessionStorage: storage(sessionStore),
    },
  });
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response(null, { status: 202 });
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

const payload = (index: number) =>
  JSON.parse(String(requests[index].init?.body)) as {
    eventId: string;
    visitorId: string;
    sessionId: string;
    path: string;
    durationMs?: number;
  };

test("전송 전에 쿼리·해시·동적 식별자를 제거하고 알려진 화면만 수집한다", async () => {
  const { getUsagePath, trackUsageEvent } = await import("./usage-analytics");
  assert.equal(getUsagePath("/ko-KR/share/private-id?token=secret#name"), "/ko-KR/share/:id");
  assert.equal(getUsagePath("/en-US/blog/dev/article"), "/en-US/blog/:slug");
  assert.equal(getUsagePath("/ja-JP/resume/company"), "/ja-JP/resume/:slug");
  assert.equal(getUsagePath("/ko-KR/hobby/espresso/123"), "/ko-KR/hobby/espresso/:id");
  assert.equal(getUsagePath("/ko-KR/blog/dashboard"), "/ko-KR/blog/dashboard");
  await trackUsageEvent("page_view", undefined, { path: "/unknown/person@example.com" });
  assert.equal(requests.length, 0);
  await trackUsageEvent("page_view", undefined, { path: "/ko-KR/share/private-id?token=secret" });
  assert.equal(payload(0).path, "/ko-KR/share/:id");
  assert.equal(String(requests[0].init?.body).includes("secret"), false);
  assert.equal(requests[0].init?.credentials, "omit");
});

test("방문자는 유지하고 30분 비활동 경계에서 세션을 교체한다", async () => {
  const { trackUsageEvent } = await import("./usage-analytics");
  let now = 1_800_000_000_000;
  Date.now = () => now;
  await trackUsageEvent("page_view");
  now += 29 * 60 * 1000;
  await trackUsageEvent("chat_submitted", "main_chat");
  now += 30 * 60 * 1000;
  await trackUsageEvent("chat_completed", "main_chat", { durationMs: 40.6 });
  assert.equal(payload(0).visitorId, payload(2).visitorId);
  assert.equal(payload(0).sessionId, payload(1).sessionId);
  assert.notEqual(payload(1).sessionId, payload(2).sessionId);
  assert.notEqual(payload(0).eventId, payload(1).eventId);
  assert.equal(payload(2).durationMs, 41);
});

test("응답 유실은 같은 이벤트 ID로 한 번 재시도하고 4xx는 재시도하지 않는다", async () => {
  const { trackUsageEvent } = await import("./usage-analytics");
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    if (requests.length === 1) throw new Error("connection lost");
    return new Response(null, { status: 202 });
  };
  await trackUsageEvent("page_view");
  assert.equal(requests.length, 2);
  assert.equal(payload(0).eventId, payload(1).eventId);
  requests.length = 0;
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response(null, { status: 429 });
  };
  await trackUsageEvent("page_view");
  assert.equal(requests.length, 1);
});

test("저장소 차단과 API 장애가 기능 실행으로 전파되지 않는다", async () => {
  const { trackUsageEvent } = await import("./usage-analytics");
  const blockedStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  window.localStorage = blockedStorage as unknown as Storage;
  window.sessionStorage = blockedStorage as unknown as Storage;
  await trackUsageEvent("game_started", "sky_drop");
  await trackUsageEvent("game_completed", "sky_drop");
  assert.equal(payload(0).visitorId, payload(1).visitorId);
  assert.equal(payload(0).sessionId, payload(1).sessionId);
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  await assert.doesNotReject(trackUsageEvent("page_view"));
});

test("세션 저장소 쓰기만 실패해도 메모리의 최근 활동 시각과 세션을 유지한다", async () => {
  const { trackUsageEvent } = await import("./usage-analytics");
  let now = 1_900_000_000_000;
  Date.now = () => now;
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    },
  });
  await trackUsageEvent("page_view");
  await trackUsageEvent("chat_submitted", "main_chat");
  assert.equal(payload(0).sessionId, payload(1).sessionId);

  const stale = JSON.stringify({ id: payload(0).sessionId, lastSeenAt: now });
  Object.defineProperty(window.sessionStorage, "getItem", { value: () => stale });
  now += 30 * 60 * 1000;
  await trackUsageEvent("page_view");
  assert.notEqual(payload(1).sessionId, payload(2).sessionId);
  now += 1000;
  await trackUsageEvent("page_view");
  assert.equal(payload(2).sessionId, payload(3).sessionId);
});
