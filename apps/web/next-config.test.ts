import assert from "node:assert/strict";
import test from "node:test";
import { createConnectSources, createProductionDomainRedirects } from "./next.config";

test("API HTTP URL은 path와 credential 없이 origin만 CSP에 추가한다", () => {
  const apiUrl = "http://user:password@127.0.0.1:46001/api/test?token=opaque-token";
  const connectSources = createConnectSources(apiUrl);

  assert.ok(connectSources.includes("http://127.0.0.1:46001"));
  for (const forbiddenValue of ["user", "password", "/api", "opaque-token"]) {
    assert.equal(connectSources.includes(forbiddenValue), false);
  }
});

test("HTTPS API와 production fallback은 정확한 HTTP origin만 유지한다", () => {
  const httpsSources = createConnectSources("https://api.example.test:8443/path?query=value");

  assert.ok(httpsSources.includes("https://api.example.test:8443"));

  for (const invalidApiUrl of [undefined, "not-a-url", "ws://api.example.test/path"]) {
    const fallbackSources = createConnectSources(invalidApiUrl);
    assert.ok(fallbackSources.includes("https://api.icecoke.kr"));
  }
});

test("기존 Vercel 도메인은 경로를 유지해 운영 도메인으로 영구 리디렉션한다", () => {
  assert.deepEqual(createProductionDomainRedirects(), [
    {
      source: "/:path*",
      has: [{ type: "host", value: "vscoke.vercel.app" }],
      destination: "https://vscoke.icecoke.kr/:path*",
      permanent: true,
    },
  ]);
});
