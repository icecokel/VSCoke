"use client";

import { IHistoryItem } from "@/contexts/history-context";
import { useHistoryContext } from "@/contexts/history-context";
import { useRouter } from "next/navigation";

const useHistory = () => {
  const { history, setHistory } = useHistoryContext();
  const router = useRouter();

  const add = ({ path, title }: IHistoryItem) => {
    if (history.some((item: IHistoryItem) => item.path === path)) {
      change({ path, title, isActive: true });
      return;
    }
    setHistory((prev: IHistoryItem[]) => {
      return [...prev.map((item: IHistoryItem) => ({ ...item, isActive: false })), { isActive: true, path, title }];
    });
  };

  const remove = ({ path }: IHistoryItem) => {
    setHistory((prev: IHistoryItem[]) => {
      return [...prev].filter((item: IHistoryItem) => item.path !== path);
    });
  };

  const change = ({ path }: IHistoryItem) => {
    setHistory((prev: IHistoryItem[]) => 
      prev.map((item: IHistoryItem) => ({ ...item, isActive: item.path === path }))
    );
    router.push(path);
  };

  const current = history.find((item: IHistoryItem) => item.isActive);

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
