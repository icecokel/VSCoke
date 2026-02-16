"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useHistory } from "./use-history";
import { useLoader } from "@/contexts/loader-context";
import { useCallback } from "react";

interface NavigateOptions {
  title?: string;
}

export const useCustomRouter = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { history, setHistory, add, change, remove, current } = useHistory();
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
      const existingItem = history.find(item => item.path === path);

      if (pathname === path) {
        if (existingItem && !existingItem.isActive) {
          change(existingItem);
        } else if (!existingItem) {
          add({ path, title });
        }
        return;
      }

      // 이동 직전 prefetch를 보강해서 체감 전환 속도를 높입니다.
      prefetch(path);
      startLoader();

      if (existingItem) {
        change(existingItem);
      } else {
        add({ path, title });
        router.push(path);
      }
    },
    [add, change, history, pathname, prefetch, router, startLoader],
  );

  const replace = useCallback(
    (path: string, options?: NavigateOptions) => {
      const title = options?.title || path;

      if (current) {
        setHistory(prev =>
          prev.map(item =>
            item.path === current.path
              ? { path, title, isActive: true, lastAccessedAt: Date.now() }
              : { ...item, isActive: false },
          ),
        );
      } else {
        setHistory([{ path, title, isActive: true, lastAccessedAt: Date.now() }]);
      }
      router.replace(path);
    },
    [current, router, setHistory],
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
