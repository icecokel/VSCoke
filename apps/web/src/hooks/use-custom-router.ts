"use client";

import { useRouter } from "@/i18n/navigation";
import { useHistory } from "./use-history";
import { useLoader } from "@/contexts/loader-context";
import { useCallback } from "react";
import { getHistoryPath } from "@/lib/history-path";

interface NavigateOptions {
  title?: string;
}

export const useCustomRouter = () => {
  const router = useRouter();
  const { history, setHistory, add, remove, current, currentPath } = useHistory();
  const { startLoader } = useLoader();

  const prefetch = useCallback(
    (path: string) => {
      void router.prefetch(path);
    },
    [router],
  );

  const push = useCallback(
    (path: string, options?: NavigateOptions) => {
      const title = options?.title || path;
      add({ path, title });
      if (currentPath !== getHistoryPath(path)) {
        prefetch(path);
        startLoader();
      }
      router.push(path);
    },
    [add, currentPath, prefetch, router, startLoader],
  );

  const replace = useCallback(
    (path: string, options?: NavigateOptions) => {
      const title = options?.title || path;
      const historyPath = getHistoryPath(path);
      setHistory(prev => {
        const existing = prev.find(item => item.path === historyPath);
        const currentIndex = prev.findIndex(item => item.path === currentPath);
        const next = prev.filter(item => item.path !== currentPath || item.path === historyPath);
        if (!existing) {
          next.splice(currentIndex < 0 ? next.length : currentIndex, 0, {
            path: historyPath,
            title,
            isActive: true,
            lastAccessedAt: Date.now(),
          });
        }
        return next.map(item => ({
          ...item,
          isActive: item.path === historyPath,
          lastAccessedAt: item.path === historyPath ? Date.now() : item.lastAccessedAt,
        }));
      });
      router.replace(path);
    },
    [currentPath, router, setHistory],
  );

  const back = useCallback(() => {
    if (current) {
      remove(current);

      const currentIndex = history.findIndex(item => item.path === current.path);
      if (currentIndex > 0) {
        const prevPath = history[currentIndex - 1].path;
        setHistory(prev =>
          prev.map(item =>
            item.path === prevPath
              ? { ...item, isActive: true, lastAccessedAt: Date.now() }
              : { ...item, isActive: false },
          ),
        );
      }
    }
    router.back();
  }, [current, history, remove, router, setHistory]);

  return {
    ...router,
    prefetch,
    push,
    replace,
    back,
  };
};
