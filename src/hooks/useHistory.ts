"use client";


import { IHistoryItem, historyAtom } from "@/atom/history";
import { useAtom } from "jotai/react";
import { useRouter } from "next/navigation";

const useHistory = () => {
  const [history, setHistory] = useAtom(historyAtom);
  const router = useRouter();

  const add = ({ path, title }: IHistoryItem) => {
    if (history.some(item => item.path === path)) {
      change({ path, title, isActive: true });
      return;
    }
    setHistory(prev => {
      return [...prev.map(item => ({ ...item, isActive: false })), { isActive: true, path, title }];
    });
  };

  const remove = ({ path }: IHistoryItem) => {
    setHistory(prev => {
      return [...prev].filter(item => item.path !== path);
    });
  };

  const change = ({ path }: IHistoryItem) => {
    setHistory(prev => prev.map(item => ({ ...item, isActive: item.path === path })));
    router.push(path);
  };

  const current = history.find(item => item.isActive);

  return {
    current,
    history,
    setHistory,
    add,
    remove,
    change,
  };
};

export default useHistory;
