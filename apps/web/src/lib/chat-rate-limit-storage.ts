// 채팅 남은 질문 수를 새로고침 뒤에도 보여주기 위해 마지막 응답 헤더 값을 저장한다.
// 서버 한도는 IP 기준이라 탭끼리 공유되도록 localStorage에 둔다.
export type ChatRateLimitChannel = "main" | "resume";

export type StoredChatRateLimit = {
  limit: number;
  remaining: number;
  resetAt: Date;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const createStorageKey = (channel: ChatRateLimitChannel) => `vscoke.chatRateLimit.${channel}`;

const getLocalStorage = (): StorageLike | undefined => {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

// resetAt은 가장 오래된 요청이 만료되는 시각이다. 그 전까지는 저장한 남은 횟수가 그대로 맞고,
// 지나면 횟수가 늘어났을 수 있어 버린다.
export const readStoredChatRateLimit = (
  channel: ChatRateLimitChannel,
  now = Date.now(),
  storage = getLocalStorage(),
): StoredChatRateLimit | undefined => {
  try {
    const raw = storage?.getItem(createStorageKey(channel));
    if (!raw) return undefined;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;

    const { limit, remaining, resetAt } = parsed as Record<string, unknown>;
    if (
      !isCount(limit) ||
      limit < 1 ||
      !isCount(remaining) ||
      remaining > limit ||
      !isCount(resetAt) ||
      resetAt <= now
    ) {
      storage?.removeItem(createStorageKey(channel));
      return undefined;
    }

    return { limit, remaining, resetAt: new Date(resetAt) };
  } catch {
    return undefined;
  }
};

export const storeChatRateLimit = (
  channel: ChatRateLimitChannel,
  rateLimit: StoredChatRateLimit,
  storage = getLocalStorage(),
): void => {
  try {
    storage?.setItem(
      createStorageKey(channel),
      JSON.stringify({
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt.getTime(),
      }),
    );
  } catch {
    /* 저장소가 막혀 있으면 이번 화면에서만 보여준다. */
  }
};
