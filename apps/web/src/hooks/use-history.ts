"use client";

import { IHistoryItem } from "@/contexts/history-context";
import { useHistoryContext } from "@/contexts/history-context";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { getHistoryPath } from "@/lib/history-path";

export const useHistory = () => {
  const { history, setHistory, isHydrated, recoverFromNotFound, syncCurrentPath } =
    useHistoryContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const currentPath = getHistoryPath(`${pathname}${query ? `?${query}` : ""}`);

  const add = ({ path, title }: Pick<IHistoryItem, "path" | "title">) => {
    const now = Date.now();
    const historyPath = getHistoryPath(path);
    setHistory((prev: IHistoryItem[]) => {
      if (prev.some(item => item.path === historyPath)) {
        return prev.map(item => ({
          ...item,
          isActive: item.path === historyPath,
          lastAccessedAt: item.path === historyPath ? now : item.lastAccessedAt,
        }));
      }
      return [
        ...prev.map((item: IHistoryItem) => ({ ...item, isActive: false })),
        { isActive: true, path: historyPath, title, lastAccessedAt: now },
      ];
    });
  };

  const remove = ({ path }: IHistoryItem) => {
    setHistory((prev: IHistoryItem[]) => {
      return prev.filter((item: IHistoryItem) => item.path !== getHistoryPath(path));
    });
  };

  const change = ({ path }: IHistoryItem) => {
    const historyPath = getHistoryPath(path);
    setHistory((prev: IHistoryItem[]) =>
      prev.map((item: IHistoryItem) => {
        if (item.path === historyPath) {
          return { ...item, isActive: true, lastAccessedAt: Date.now() };
        }
        return { ...item, isActive: false };
      }),
    );

    if (currentPath !== historyPath) {
      router.push(path);
    }
  };

  const current = history.find((item: IHistoryItem) => item.path === currentPath);

  return {
    current,
    currentPath,
    history,
    setHistory,
    add,
    remove,
    change,
    isHydrated,
    recoverFromNotFound,
    syncCurrentPath,
  };
};
