import { getApiBaseUrl } from "@/lib/constants";
import type { components } from "@/types/api";

type UsageEvent = components["schemas"]["UsageEventDto"];
type UsageSession = { id: string; lastSeenAt: number };

const visitorKey = "vscoke-usage-visitor";
const sessionKey = "vscoke-usage-session";
const sessionTimeoutMs = 30 * 60 * 1000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memoryVisitorId: string | undefined;
let memorySession: UsageSession | undefined;

const getVisitorId = (): string => {
  try {
    const stored = window.localStorage.getItem(visitorKey);
    const id = stored && uuidPattern.test(stored) ? stored : crypto.randomUUID();
    window.localStorage.setItem(visitorKey, id);
    memoryVisitorId = id;
    return id;
  } catch {
    return (memoryVisitorId ??= crypto.randomUUID());
  }
};

const getSessionId = (): string => {
  const now = Date.now();
  let session = memorySession;
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(sessionKey) ?? "null");
    if (
      stored &&
      typeof stored === "object" &&
      "id" in stored &&
      typeof stored.id === "string" &&
      uuidPattern.test(stored.id) &&
      "lastSeenAt" in stored &&
      typeof stored.lastSeenAt === "number" &&
      Number.isFinite(stored.lastSeenAt) &&
      stored.lastSeenAt >= 0 &&
      stored.lastSeenAt <= now &&
      (!session || stored.lastSeenAt > session.lastSeenAt)
    ) {
      session = { id: stored.id, lastSeenAt: stored.lastSeenAt };
    }
  } catch {
    // 저장소가 차단된 브라우저에서는 현재 문서가 살아 있는 동안 식별자를 유지한다.
  }
  memorySession = {
    id:
      session && now >= session.lastSeenAt && now - session.lastSeenAt < sessionTimeoutMs
        ? session.id
        : crypto.randomUUID(),
    lastSeenAt: now,
  };
  try {
    window.sessionStorage.setItem(sessionKey, JSON.stringify(memorySession));
  } catch {
    // 집계 저장 실패가 사용자의 기능 실행을 막지 않는다.
  }
  return memorySession.id;
};

export const getUsagePath = (pathname: string): string | undefined => {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/$/, "");
  const match = path.match(/^\/(ko-KR|en-US|ja-JP)(\/.*)?$/);
  if (!match) return undefined;

  const prefix = `/${match[1]}`;
  const route = match[2] ?? "";
  if (/^\/share\/[^/]+$/.test(route)) return `${prefix}/share/:id`;
  if (/^\/hobby\/espresso\/[^/]+$/.test(route)) return `${prefix}/hobby/espresso/:id`;
  if (route.startsWith("/blog/") && !["/blog/dashboard", "/blog/preview"].includes(route)) {
    return `${prefix}/blog/:slug`;
  }
  if (route.startsWith("/resume/") && !["/resume/question", "/resume/preview"].includes(route)) {
    return `${prefix}/resume/:slug`;
  }
  return [
    "",
    "/readme",
    "/package",
    "/blog",
    "/blog/dashboard",
    "/blog/preview",
    "/resume/question",
    "/resume/preview",
    "/game",
    "/game/sky-drop",
    "/game/wordle",
    "/game/beat-jev",
    "/game/poke-lounge",
    "/hobby/espresso",
    "/hobby/recipes",
  ].includes(route)
    ? path
    : undefined;
};

export const trackUsageEvent = async (
  eventName: UsageEvent["eventName"],
  feature?: UsageEvent["feature"],
  options: { path?: string; durationMs?: number } = {},
): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    const path = getUsagePath(options.path ?? window.location.pathname);
    if (!path) return;

    const event: UsageEvent = {
      eventId: crypto.randomUUID(),
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      eventName,
      path,
      feature,
      durationMs:
        options.durationMs !== undefined && Number.isFinite(options.durationMs)
          ? Math.min(3_600_000, Math.max(0, Math.round(options.durationMs)))
          : undefined,
    };
    const body = JSON.stringify(event);
    // 응답 유실 재시도에도 같은 eventId를 보내 서버의 중복 방지를 사용한다.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`${getApiBaseUrl()}/usage/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Request-Id": crypto.randomUUID() },
          body,
          keepalive: true,
          signal: AbortSignal.timeout(3000),
          credentials: "omit",
        });
        if (response.status < 500) return;
      } catch {
        // 전송 실패는 한 번 재시도하고 원래 사용자 흐름에 전파하지 않는다.
      }
    }
  } catch {
    // 잘못된 환경 설정이나 저장소 접근 실패도 원래 사용자 흐름에 전파하지 않는다.
  }
};
