"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useBoolean } from "@/hooks/use-boolean";

export interface IHistoryItem {
  title: string;
  path: string;
  isActive: boolean;
}

interface HistoryContextType {
  history: IHistoryItem[];
  setHistory: (history: IHistoryItem[] | ((prev: IHistoryItem[]) => IHistoryItem[])) => void;
  isHydrated: boolean;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

const STORAGE_KEY = "vscoke-history";

export const HistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [history, setHistory] = useState<IHistoryItem[]>([]);
  const hydrated = useBoolean(false);
  const isHydrated = hydrated.value;
  const { onTrue } = hydrated;

  // 초기 로드시 localStorage에서 데이터 가져오기
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
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
