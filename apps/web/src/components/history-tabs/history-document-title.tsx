"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useHistory } from "@/hooks/use-history";
import { getHistoryTitle } from "@/lib/history-title";

export const HistoryDocumentTitle = ({ path, title }: { path: string; title: string }) => {
  const { history, setHistory, isHydrated, currentPath } = useHistory();
  const t = useTranslations("historyTabs");
  const currentUrl = new URL(currentPath, "https://history.local");
  const documentUrl = new URL(path, "https://history.local");
  const isCurrentDocument =
    currentUrl.pathname === documentUrl.pathname &&
    (currentUrl.searchParams.get("resume") ?? "pe") ===
      (documentUrl.searchParams.get("resume") ?? "pe");
  const defaultTitle = getHistoryTitle(currentPath, t);
  const documentTitle = getHistoryTitle(currentPath, t, { documentTitle: title });

  useEffect(() => {
    if (!isHydrated || !isCurrentDocument || defaultTitle === documentTitle) return;
    if (!history.some(item => item.path === currentPath && item.title === defaultTitle)) return;

    // 닫힌 탭을 다시 추가하지 않고 URL 동기화 후 남은 slug 기본 제목만 갱신한다.
    setHistory(prev =>
      prev.map(item =>
        item.path === currentPath && item.title === defaultTitle
          ? { ...item, title: documentTitle }
          : item,
      ),
    );
  }, [
    currentPath,
    defaultTitle,
    documentTitle,
    history,
    isCurrentDocument,
    isHydrated,
    setHistory,
  ]);

  return null;
};
