"use client";

import { IHistoryItem } from "@/contexts/history-context";
import { useHistoryContext } from "@/contexts/history-context";
import { usePathname, useRouter } from "@/i18n/navigation";

export const useHistory = () => {
  const { history, setHistory, isHydrated } = useHistoryContext();
  const router = useRouter();
  const pathname = usePathname();

  const add = ({ path, title }: Pick<IHistoryItem, "path" | "title">) => {
    const now = Date.now();
    if (history.some((item: IHistoryItem) => item.path === path)) {
      change({ path, title, isActive: true, lastAccessedAt: now });
      return;
    }
    setHistory((prev: IHistoryItem[]) => {
      return [
        ...prev.map((item: IHistoryItem) => ({ ...item, isActive: false })),
        { isActive: true, path, title, lastAccessedAt: now },
      ];
    });
  };

  const remove = ({ path }: IHistoryItem) => {
    setHistory((prev: IHistoryItem[]) => {
      return [...prev].filter((item: IHistoryItem) => item.path !== path);
    });
  };

  const change = ({ path }: IHistoryItem) => {
    setHistory((prev: IHistoryItem[]) =>
      prev.map((item: IHistoryItem) => {
        if (item.path === path) {
          return { ...item, isActive: true, lastAccessedAt: Date.now() };
        }
        return { ...item, isActive: false };
      }),
    );

    if (pathname !== path) {
      router.push(path);
    }
  };

  const current = history.find((item: IHistoryItem) => item.isActive);

  return {
    current,
    history,
    setHistory,
    add,
    remove,
    change,
    isHydrated,
  };
};
