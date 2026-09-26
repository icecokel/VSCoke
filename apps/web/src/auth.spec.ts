import assert from "node:assert/strict";
import { test } from "node:test";
import type { ApiTokenSession } from "./lib/auth-token";
import { authConfig } from "./auth";

const createIdToken = (expiresAt: number): string =>
  `header.${Buffer.from(JSON.stringify({ exp: expiresAt })).toString("base64url")}.signature`;

test("ID 토큰 만료 여유 시간에 들어오면 세션 생성 전에 갱신한다", async t => {
  const jwt = authConfig.callbacks?.jwt;
  const session = authConfig.callbacks?.session;
  assert.ok(jwt);
  assert.ok(session);

  const now = Math.floor(Date.now() / 1000);
  let refreshCount = 0;
  t.mock.method(globalThis, "fetch", async () => {
    refreshCount += 1;
    return Response.json({
      access_token: "new-access-token",
      id_token: createIdToken(now + 3600),
      expires_in: 3600,
    });
  });

  const refreshed = await jwt({
    token: {
      accessToken: "old-access-token",
      idToken: createIdToken(now + 30),
      idTokenExpiresAt: now + 30,
      expiresAt: now + 30,
      refreshToken: "refresh-token",
    },
    account: null,
    user: { id: "test-user" },
  } as Parameters<typeof jwt>[0]);
  assert.ok(refreshed);
  const result = await session({ session: { user: {} }, token: refreshed } as Parameters<
    typeof session
  >[0]);
  assert.ok(result);

  assert.equal(refreshCount, 1);
  assert.equal((result as ApiTokenSession).idToken, refreshed.idToken);
  assert.equal((result as ApiTokenSession).error, undefined);
});

test("갱신 실패 시 기존 인증 오류를 유지한다", async t => {
  const jwt = authConfig.callbacks?.jwt;
  assert.ok(jwt);
  const now = Math.floor(Date.now() / 1000);
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "invalid_grant" }, { status: 400 }),
  );

  const result = await jwt({
    token: {
      idToken: createIdToken(now + 30),
      idTokenExpiresAt: now + 30,
      expiresAt: now + 30,
      refreshToken: "invalid-refresh-token",
    },
    account: null,
    user: { id: "test-user" },
  } as Parameters<typeof jwt>[0]);

  assert.ok(result);
  assert.equal(result.error, "RefreshAccessTokenError");
});
