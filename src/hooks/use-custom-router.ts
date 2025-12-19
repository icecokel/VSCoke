"use client";

import { useRouter } from "next/navigation";
import { useHistoryContext } from "@/contexts/history-context";

interface NavigateOptions {
  title?: string;
}

export const useCustomRouter = () => {
  const router = useRouter();
  const { history, setHistory } = useHistoryContext();

  /**
   * 새 경로로 이동하며 history 탭을 추가합니다.
   */
  const push = (path: string, options?: NavigateOptions) => {
    const title = options?.title || path;
    const existingItem = history.find(item => item.path === path);

    if (existingItem) {
      // 이미 존재하면 해당 탭 활성화
      setHistory(prev => prev.map(item => ({ ...item, isActive: item.path === path })));
    } else {
      // 새 탭 추가
      setHistory(prev => [
        ...prev.map(item => ({ ...item, isActive: false })),
        { path, title, isActive: true },
      ]);
    }
    router.push(path);
  };

  /**
   * 현재 탭을 새 경로로 교체합니다 (탭 수 유지).
   */
  const replace = (path: string, options?: NavigateOptions) => {
    const title = options?.title || path;
    const currentIndex = history.findIndex(item => item.isActive);

    if (currentIndex !== -1) {
      // 현재 활성 탭을 새 경로로 교체
      setHistory(prev =>
        prev.map((item, index) =>
          index === currentIndex ? { path, title, isActive: true } : { ...item, isActive: false },
        ),
      );
    } else {
      // 활성 탭이 없으면 새로 추가
      setHistory([{ path, title, isActive: true }]);
    }
    router.replace(path);
  };

  /**
   * 이전 페이지로 이동하며 해당 탭을 활성화합니다.
   */
  const back = () => {
    const currentIndex = history.findIndex(item => item.isActive);

    if (currentIndex > 0) {
      // 이전 탭 활성화
      const prevPath = history[currentIndex - 1].path;
      setHistory(prev => prev.map(item => ({ ...item, isActive: item.path === prevPath })));
    }
    router.back();
  };

  /**
   * 앞으로 이동
   */
  const forward = () => {
    router.forward();
  };

  /**
   * 새로고침
   */
  const refresh = () => {
    router.refresh();
  };

  /**
   * prefetch
   */
  const prefetch = (href: string) => {
    router.prefetch(href);
  };

  return {
    push,
    replace,
    back,
    forward,
    refresh,
    prefetch,
  };
};
