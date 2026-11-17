import assert from "node:assert/strict";
import test from "node:test";
import {
  createConnectSources,
  createContentSecurityPolicy,
  createProductionDomainRedirects,
  securityHeaders,
} from "./next.config";

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

test("CSP는 연결 대상과 함께 클릭재킹·플러그인·base 주입을 막는다", () => {
  const policy = createContentSecurityPolicy(["'self'", "https://api.icecoke.kr"]);

  assert.equal(
    policy,
    "connect-src 'self' https://api.icecoke.kr; frame-ancestors 'none'; object-src 'none'; base-uri 'none';",
  );
});

test("보안 헤더는 frame-ancestors와 X-Frame-Options를 함께 보내고 보조 정책을 둔다", () => {
  const headers = Object.fromEntries(
    securityHeaders(["'self'"]).map(({ key, value }) => [key, value]),
  );

  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(headers["Permissions-Policy"], /camera=\(\), microphone=\(\)/);
  assert.doesNotMatch(headers["Permissions-Policy"], /web-share|clipboard/);
});
