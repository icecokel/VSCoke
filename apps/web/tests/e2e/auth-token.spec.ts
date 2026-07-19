import { expect, test } from "@playwright/test";
import {
  getJwtExpiresAt,
  getJwtSubject,
  getSessionApiAccountId,
  getSessionApiIdToken,
  isIdTokenUsable,
} from "../../src/lib/auth-token";

const encodeBase64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const createJwt = (payload: Record<string, unknown>) =>
  `${encodeBase64Url({ alg: "RS256", typ: "JWT" })}.${encodeBase64Url(payload)}.signature`;

test.describe("auth token contract", () => {
  test("JWT exp를 읽어 ID 토큰 만료 시각을 계산한다", () => {
    const token = createJwt({ exp: 12345 });

    expect(getJwtExpiresAt(token)).toBe(12345);
  });

  test("JWT sub를 계정별 저장 범위 식별자로 읽는다", () => {
    expect(getJwtSubject(createJwt({ sub: "account-a" }))).toBe("account-a");
    expect(getJwtSubject(createJwt({ sub: "" }))).toBeUndefined();
  });

  test("테스트·서버 세션은 user id를 계정 저장 범위 식별자로 사용할 수 있다", () => {
    expect(getSessionApiAccountId({ user: { id: "account-b" } }, "opaque-token")).toBe("account-b");
  });

  test("만료된 ID 토큰은 API 제출 토큰으로 사용하지 않는다", () => {
    const token = createJwt({ exp: 100 });

    expect(isIdTokenUsable(token, 100, 101_000)).toBe(false);
  });

  test("세션 API 제출 토큰은 유효한 ID 토큰만 반환한다", () => {
    const nowMs = 1_000_000;
    const token = createJwt({ exp: 2_000 });

    expect(
      getSessionApiIdToken(
        {
          idToken: token,
          idTokenExpiresAt: 2_000,
          accessToken: "access-token",
        },
        nowMs,
      ),
    ).toBe(token);
  });

  test("accessToken은 API 제출 토큰 fallback으로 사용하지 않는다", () => {
    expect(
      getSessionApiIdToken(
        {
          accessToken: "access-token",
        },
        1_000_000,
      ),
    ).toBeUndefined();
  });

  test("ID 토큰 갱신 오류가 있는 세션은 API 제출 토큰을 반환하지 않는다", () => {
    const token = createJwt({ exp: 2_000 });

    expect(
      getSessionApiIdToken(
        {
          idToken: token,
          idTokenExpiresAt: 2_000,
          error: "IdTokenUnavailable",
        },
        1_000_000,
      ),
    ).toBeUndefined();
  });
});
