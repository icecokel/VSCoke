import {
  PUBLIC_CHAT_REQUEST_LIMIT,
  PUBLIC_CHAT_REQUEST_WINDOW_MS,
  PublicChatRateLimitStore,
} from './public-chat-rate-limit';

describe('PublicChatRateLimitStore', () => {
  it('기본 한도까지 허용하고 다음 요청부터 차단한다', () => {
    const store = new PublicChatRateLimitStore();

    for (let count = 1; count <= PUBLIC_CHAT_REQUEST_LIMIT; count += 1) {
      expect(store.consume('198.51.100.1', 0)).toEqual({
        isAllowed: true,
        limit: PUBLIC_CHAT_REQUEST_LIMIT,
        remaining: PUBLIC_CHAT_REQUEST_LIMIT - count,
        nextRequestAvailableAt: PUBLIC_CHAT_REQUEST_WINDOW_MS,
      });
    }

    expect(store.consume('198.51.100.1', 0)).toEqual({
      isAllowed: false,
      limit: PUBLIC_CHAT_REQUEST_LIMIT,
      remaining: 0,
      nextRequestAvailableAt: PUBLIC_CHAT_REQUEST_WINDOW_MS,
    });
  });

  it('주입한 한도를 기본 한도와 독립적으로 적용한다', () => {
    const store = new PublicChatRateLimitStore(30);

    Array.from({ length: 30 }).forEach(() => {
      expect(store.consume('198.51.100.2', 0).isAllowed).toBe(true);
    });

    expect(store.consume('198.51.100.2', 0)).toMatchObject({
      isAllowed: false,
      limit: 30,
      remaining: 0,
    });
  });

  it('서로 다른 IP의 요청 횟수를 공유하지 않는다', () => {
    const store = new PublicChatRateLimitStore(1);

    expect(store.consume('198.51.100.3', 0).isAllowed).toBe(true);
    expect(store.consume('198.51.100.3', 0).isAllowed).toBe(false);
    expect(store.consume('198.51.100.4', 0)).toMatchObject({
      isAllowed: true,
      remaining: 0,
    });
  });

  it('정확히 1시간이 지난 요청을 제외하고 다음 복구 시각을 갱신한다', () => {
    const store = new PublicChatRateLimitStore(2);

    store.consume('198.51.100.5', 0);
    store.consume('198.51.100.5', 1_000);

    expect(
      store.consume('198.51.100.5', PUBLIC_CHAT_REQUEST_WINDOW_MS - 1),
    ).toMatchObject({
      isAllowed: false,
      nextRequestAvailableAt: PUBLIC_CHAT_REQUEST_WINDOW_MS,
    });
    expect(
      store.consume('198.51.100.5', PUBLIC_CHAT_REQUEST_WINDOW_MS),
    ).toEqual({
      isAllowed: true,
      limit: 2,
      remaining: 0,
      nextRequestAvailableAt: PUBLIC_CHAT_REQUEST_WINDOW_MS + 1_000,
    });
  });

  it('차단된 요청은 복구 시각을 뒤로 밀지 않는다', () => {
    const store = new PublicChatRateLimitStore(1);

    store.consume('198.51.100.6', 10_000);

    expect(store.consume('198.51.100.6', 20_000).nextRequestAvailableAt).toBe(
      PUBLIC_CHAT_REQUEST_WINDOW_MS + 10_000,
    );
    expect(store.consume('198.51.100.6', 30_000).nextRequestAvailableAt).toBe(
      PUBLIC_CHAT_REQUEST_WINDOW_MS + 10_000,
    );
  });
});
