export const AUTH_SESSION_ERRORS_REQUIRING_LOGIN = new Set([
  "RefreshAccessTokenError",
  "IdTokenUnavailable",
]);

const ID_TOKEN_EXPIRY_BUFFER_SECONDS = 60;

export type ApiTokenSession = {
  idToken?: unknown;
  idTokenExpiresAt?: unknown;
  accessToken?: unknown;
  error?: unknown;
};

const decodeBase64Url = (value: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return globalThis.atob(padded);
};

export const getJwtExpiresAt = (token?: unknown): number | undefined => {
  if (typeof token !== "string") return undefined;

  const [, payload] = token.split(".");
  if (!payload) return undefined;

  try {
    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp : undefined;
  } catch {
    return undefined;
  }
};

export const isIdTokenUsable = (
  idToken?: unknown,
  idTokenExpiresAt?: unknown,
  nowMs: number = Date.now(),
): idToken is string => {
  if (typeof idToken !== "string" || !idToken) return false;

  const expiresAt =
    typeof idTokenExpiresAt === "number" ? idTokenExpiresAt : getJwtExpiresAt(idToken);
  if (typeof expiresAt !== "number") return false;

  return nowMs < (expiresAt - ID_TOKEN_EXPIRY_BUFFER_SECONDS) * 1000;
};

export const isAuthSessionError = (error?: unknown): boolean =>
  typeof error === "string" && AUTH_SESSION_ERRORS_REQUIRING_LOGIN.has(error);

export const getSessionApiIdToken = (
  session?: ApiTokenSession | null,
  nowMs: number = Date.now(),
): string | undefined => {
  if (!session || isAuthSessionError(session.error)) return undefined;

  return isIdTokenUsable(session.idToken, session.idTokenExpiresAt, nowMs)
    ? session.idToken
    : undefined;
};
