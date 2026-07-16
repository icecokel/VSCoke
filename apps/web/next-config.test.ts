import assert from "node:assert/strict";
import test from "node:test";
import { createConnectSources, toWebSocketConnectSource } from "./next.config";

test("API HTTP origin은 path와 credential 없이 같은 host와 port의 WebSocket origin으로 변환한다", () => {
  const apiUrl = "http://user:password@127.0.0.1:46001/api/poke-lounge?token=opaque-token";
  const connectSources = createConnectSources(apiUrl);

  assert.equal(toWebSocketConnectSource(apiUrl), "ws://127.0.0.1:46001");
  assert.ok(connectSources.includes("http://127.0.0.1:46001"));
  assert.ok(connectSources.includes("ws://127.0.0.1:46001"));
  for (const forbiddenValue of ["user", "password", "/api", "opaque-token", "ws:", "wss:"]) {
    assert.equal(connectSources.includes(forbiddenValue), false);
  }
});

test("HTTPS API와 production fallback은 정확한 WSS origin만 유지한다", () => {
  const httpsSources = createConnectSources(
    "https://api.example.test:8443/socket.io?transport=websocket",
  );

  assert.equal(
    toWebSocketConnectSource("https://api.example.test:8443/socket.io"),
    "wss://api.example.test:8443",
  );
  assert.ok(httpsSources.includes("https://api.example.test:8443"));
  assert.ok(httpsSources.includes("wss://api.example.test:8443"));

  for (const invalidApiUrl of [undefined, "not-a-url", "ws://api.example.test/socket.io"]) {
    const fallbackSources = createConnectSources(invalidApiUrl);
    assert.ok(fallbackSources.includes("https://api.icecoke.kr"));
    assert.ok(fallbackSources.includes("wss://api.icecoke.kr"));
    assert.equal(fallbackSources.includes("ws:"), false);
    assert.equal(fallbackSources.includes("wss:"), false);
  }
});
