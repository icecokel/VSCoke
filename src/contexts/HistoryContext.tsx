"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface IHistoryItem {
  title: string;
  path: string;
  isActive: boolean;
}

interface HistoryContextType {
  history: IHistoryItem[];
  setHistory: (history: IHistoryItem[] | ((prev: IHistoryItem[]) => IHistoryItem[])) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<IHistoryItem[]>([]);

  useEffect(() => {
    // 초기 로드시 localStorage에서 데이터 가져오기
    const stored = localStorage.getItem("history");
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    // history가 변경될 때마다 localStorage에 저장
    localStorage.setItem("history", JSON.stringify(history));
  }, [history]);

  return (
    <HistoryContext.Provider value={{ history, setHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export const useHistoryContext = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistoryContext must be used within a HistoryProvider");
  }
  return context;
}; 