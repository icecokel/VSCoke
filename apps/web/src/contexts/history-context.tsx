"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useBoolean } from "@/hooks/use-boolean";
import { getHistoryPath, getHistoryTabKey, parseHistoryUrl } from "@/lib/history-path";

// IHistoryItem 인터페이스에 lastAccessedAt 필드 추가
export interface IHistoryItem {
  title: string;
  path: string;
  isActive: boolean;
  lastAccessedAt: number; // Unix timestamp (ms)
}

interface HistoryContextType {
  history: IHistoryItem[];
  setHistory: (history: IHistoryItem[] | ((prev: IHistoryItem[]) => IHistoryItem[])) => void;
  isHydrated: boolean;
  recoverFromNotFound: (path: string) => string;
  syncCurrentPath: (path: string) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

const STORAGE_KEY = "vscoke-history";
const RECOVERY_TARGET_KEY = "vscoke-not-found-target";
// 3일(72시간) 만료
const HISTORY_EXPIRE_MS = 3 * 24 * 60 * 60 * 1000;

const persistHistory = (history: IHistoryItem[]): boolean => {
  const stored = JSON.stringify(history);
  try {
    localStorage.setItem(STORAGE_KEY, stored);
  } catch {
    try {
      // 문서 이동과 새로고침에서도 삭제 전 localStorage를 다시 읽지 않는다.
      sessionStorage.setItem(STORAGE_KEY, stored);
      return true;
    } catch {
      return false;
    }
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 세션 저장소가 차단되어도 localStorage 저장은 완료됐다.
  }
  return true;
};

export const HistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [history, setHistoryState] = useState<IHistoryItem[]>([]);
  const invalidPathRef = useRef<string | null>(null);
  const recoveryTargetRef = useRef<string | null>(null);
  const setHistory = useCallback<HistoryContextType["setHistory"]>(update => {
    setHistoryState(prev => {
      const next = typeof update === "function" ? update(prev) : update;
      return next.filter(item => item.path !== invalidPathRef.current);
    });
  }, []);

  const syncCurrentPath = useCallback((path: string) => {
    if (path !== invalidPathRef.current) {
      invalidPathRef.current = null;
      if (path !== recoveryTargetRef.current) recoveryTargetRef.current = null;
      try {
        sessionStorage.removeItem(RECOVERY_TARGET_KEY);
      } catch {
        // 저장소가 차단되면 현재 문서의 복구 상태만 사용한다.
      }
    }
  }, []);

  const recoverFromNotFound = (path: string): string => {
    const invalidIndex = history.findIndex(item => item.path === path);
    const nextTab = history[invalidIndex + 1] || history[invalidIndex - 1];
    let target =
      recoveryTargetRef.current === path || invalidIndex === -1 ? "/" : nextTab?.path || "/";
    invalidPathRef.current = path;
    const remaining = history.filter(item => item.path !== path);
    setHistory(remaining);
    // 둘 다 저장할 수 없으면 문서를 떠나지 않고 메모리의 정상 탭을 보존한다.
    if (!persistHistory(remaining)) target = "/";
    try {
      sessionStorage.setItem(RECOVERY_TARGET_KEY, target);
    } catch {
      // 문서 간 복구 상태를 전달할 수 없으면 같은 경로의 재시도 대신 홈으로 간다.
      if (target.split("?", 1)[0] === path.split("?", 1)[0]) target = "/";
    }
    recoveryTargetRef.current = target;
    return target;
  };
  const hydrated = useBoolean(false);
  const isHydrated = hydrated.value;
  const { onTrue } = hydrated;

  // 만료된 항목 필터링
  const filterExpired = (items: IHistoryItem[]): IHistoryItem[] => {
    const now = Date.now();
    const normalized = new Map<string, IHistoryItem>();
    for (const item of items) {
      if (
        typeof item?.path !== "string" ||
        !parseHistoryUrl(item.path) ||
        typeof item.title !== "string" ||
        typeof item.lastAccessedAt !== "number" ||
        !Number.isFinite(item.lastAccessedAt) ||
        now - item.lastAccessedAt >= HISTORY_EXPIRE_MS
      )
        continue;

      const path = getHistoryPath(item.path);
      const tabKey = getHistoryTabKey(path);
      const existing = normalized.get(tabKey);
      if (!existing || item.lastAccessedAt >= existing.lastAccessedAt) {
        normalized.set(tabKey, { ...item, path });
      }
    }
    return [...normalized.values()];
  };

  // 저장 실패 시 남긴 세션 기록이 삭제 전 localStorage보다 우선한다.
  useEffect(() => {
    for (const storage of ["sessionStorage", "localStorage"] as const) {
      try {
        const stored = window[storage].getItem(STORAGE_KEY);
        if (!stored) continue;
        const parsed = JSON.parse(stored);
        const cleaned = filterExpired(parsed);
        setHistory(cleaned);
        break;
      } catch {
        try {
          window[storage].removeItem(STORAGE_KEY);
        } catch {
          // 저장소가 차단되어도 나머지 저장소나 메모리의 탭은 유지한다.
        }
      }
    }
    try {
      recoveryTargetRef.current ??= sessionStorage.getItem(RECOVERY_TARGET_KEY);
      sessionStorage.removeItem(RECOVERY_TARGET_KEY);
    } catch {
      // 저장소가 차단되면 현재 문서의 복구 상태만 사용한다.
    }
    onTrue();
  }, [onTrue, setHistory]);

  // hydration 완료 후에만 localStorage에 저장
  useEffect(() => {
    if (isHydrated) {
      persistHistory(history.filter(item => item.path !== invalidPathRef.current));
    }
  }, [history, isHydrated]);

  return (
    <HistoryContext.Provider
      value={{ history, setHistory, isHydrated, recoverFromNotFound, syncCurrentPath }}
    >
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistoryContext = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistoryContext must be used within a HistoryProvider");
  }
  return context;
};
