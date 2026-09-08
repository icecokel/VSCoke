export interface PendingSkyDropScore {
  gameName: "sky-drop";
  score: number;
  timestamp: number;
  playTime?: number;
  requiresManualLogin?: boolean;
}

export const parsePendingSkyDropScore = (
  raw: string | null,
  now: number,
): PendingSkyDropScore | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const item = value as Record<string, unknown>;
    if (
      item.gameName !== "sky-drop" ||
      typeof item.score !== "number" ||
      !Number.isSafeInteger(item.score) ||
      item.score <= 0 ||
      item.score > 100000
    )
      return null;
    if (
      typeof item.timestamp !== "number" ||
      !Number.isFinite(item.timestamp) ||
      item.timestamp > now ||
      now - item.timestamp >= 300000
    )
      return null;
    if (
      item.playTime !== undefined &&
      (typeof item.playTime !== "number" ||
        !Number.isInteger(item.playTime) ||
        item.playTime < 1 ||
        item.playTime > 86400)
    )
      return null;
    if (item.requiresManualLogin !== undefined && typeof item.requiresManualLogin !== "boolean")
      return null;
    return {
      gameName: "sky-drop",
      score: item.score,
      timestamp: item.timestamp,
      playTime: item.playTime as number | undefined,
      requiresManualLogin: item.requiresManualLogin as boolean | undefined,
    };
  } catch {
    return null;
  }
};

export const clearSkyDropPendingScore = (): void => {
  try {
    localStorage.removeItem("pendingScore");
    localStorage.removeItem("pendingShare");
  } catch {
    // 저장소가 차단되어도 로컬 게임을 시작·재시작할 수 있어야 한다.
  }
};
