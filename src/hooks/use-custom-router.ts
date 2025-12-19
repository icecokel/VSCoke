"use client";

import { useRouter } from "@/i18n/navigation";
import { useHistory } from "./use-history";

interface NavigateOptions {
  title?: string;
}

export const useCustomRouter = () => {
  const router = useRouter();
  const { history, setHistory, add, change, remove, current } = useHistory();

  const push = (path: string, options?: NavigateOptions) => {
    const title = options?.title || path;
    const existingItem = history.find(item => item.path === path);

    if (existingItem) {
      change(existingItem);
    } else {
      add({ path, title, isActive: true });
      router.push(path);
    }
  };

  const replace = (path: string, options?: NavigateOptions) => {
    const title = options?.title || path;

    if (current) {
      setHistory(prev =>
        prev.map(item =>
          item.path === current.path
            ? { path, title, isActive: true }
            : { ...item, isActive: false },
        ),
      );
    } else {
      setHistory([{ path, title, isActive: true }]);
    }
    router.replace(path);
  };

  const back = () => {
    if (current) {
      remove(current);

      const currentIndex = history.findIndex(item => item.path === current.path);
      if (currentIndex > 0) {
        const prevPath = history[currentIndex - 1].path;
        setHistory(prev => prev.map(item => ({ ...item, isActive: item.path === prevPath })));
      }
    }
    router.back();
  };

  return {
    ...router,
    push,
    replace,
    back,
  };
};
