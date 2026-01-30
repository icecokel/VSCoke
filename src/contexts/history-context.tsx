"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useBoolean } from "@/hooks/use-boolean";

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
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

const STORAGE_KEY = "vscoke-history";
// 7일(168시간) 만료
const HISTORY_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;

export const HistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [history, setHistory] = useState<IHistoryItem[]>([]);
  const hydrated = useBoolean(false);
  const isHydrated = hydrated.value;
  const { onTrue } = hydrated;

  // 기존 데이터 마이그레이션 (lastAccessedAt 없는 경우 처리)
  const migrateHistory = (items: IHistoryItem[]): IHistoryItem[] => {
    const now = Date.now();
    // 7일 만료 기준, 1일 유예를 주려면 6일 전에 접근한 것으로 설정
    const gracePeriodTimestamp = now - 6 * 24 * 60 * 60 * 1000;

    return items.map(item => ({
      ...item,
      // lastAccessedAt이 없으면 현재 시간 - 6일로 설정 (1일 유예)
      lastAccessedAt: item.lastAccessedAt ?? gracePeriodTimestamp,
    }));
  };

  // 만료된 항목 필터링
  const filterExpired = (items: IHistoryItem[]): IHistoryItem[] => {
    const now = Date.now();
    return items.filter(item => item.isActive || now - item.lastAccessedAt < HISTORY_EXPIRE_MS);
  };

  // 초기 로드시 localStorage에서 데이터 가져오기
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const migrated = migrateHistory(parsed); // 1. 마이그레이션
        const cleaned = filterExpired(migrated); // 2. 만료 정리
        setHistory(cleaned);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    onTrue();
  }, [onTrue]);

  // hydration 완료 후에만 localStorage에 저장
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }, [history, isHydrated]);

  return (
    <HistoryContext.Provider value={{ history, setHistory, isHydrated }}>
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
