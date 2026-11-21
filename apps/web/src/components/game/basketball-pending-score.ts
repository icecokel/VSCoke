const pendingKey = "vscoke-basketball-pending-score";

interface PendingBasketballScore {
  score: number;
  timestamp: number;
}

export const readPendingBasketballScore = (): PendingBasketballScore | null => {
  try {
    const raw = sessionStorage.getItem(pendingKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const { score, timestamp } = value as Record<string, unknown>;
    if (
      typeof score !== "number" ||
      !Number.isInteger(score) ||
      score < 1 ||
      score > 42 ||
      typeof timestamp !== "number" ||
      !Number.isFinite(timestamp) ||
      timestamp > Date.now() ||
      Date.now() - timestamp > 600_000
    )
      return null;
    return { score, timestamp };
  } catch {
    return null;
  }
};

export const savePendingBasketballScore = (score: number): boolean => {
  try {
    sessionStorage.setItem(pendingKey, JSON.stringify({ score, timestamp: Date.now() }));
    return true;
  } catch {
    return false;
  }
};

export const clearPendingBasketballScore = (): void => {
  try {
    sessionStorage.removeItem(pendingKey);
  } catch {
    // 결과 화면의 수동 제출은 저장소 사용 여부와 무관하게 동작한다.
  }
};
