"use client";

import { IHistoryItem } from "@/contexts/history-context";
import { useHistory } from "@/hooks/use-history";
import { TParentNode } from "@/models/common";
import Container from "@/components/base-ui/container";
import Icon from "@/components/base-ui/icon";
import BaseText from "@/components/base-ui/text";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { useTranslations } from "next-intl";

const getTabTitle = (path: string, fallback: string): string =>
  /^\/share\/[^/]+$/.test(path) ? "share" : fallback;

export const HistoryTabs = ({ children }: TParentNode) => {
  const { history, change, remove, setHistory, isHydrated, currentPath } = useHistory();
  const router = useRouter();
  const t = useTranslations("historyTabs");
  const tabRailRef = useRef<HTMLDivElement>(null);
  const activeTabPath = history.find(item => item.isActive)?.path;

  const handleClickTab = change;

  const handleAuxClickTab = (event: React.MouseEvent<HTMLDivElement>, item: IHistoryItem) => {
    if (event.button !== 1) return;

    event.preventDefault();
    handleSmartClose(event, item);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 1) {
      event.preventDefault();
    }
  };

  const [dragStartPath, setDragStartPath] = useState<string>();
  const [dragEnterPath, setEnterPath] = useState<string>();

  const handleSmartClose = (e: React.MouseEvent | null, item: IHistoryItem) => {
    if (e) {
      e.stopPropagation();
    }

    // 현재 닫는 탭이 활성화 상태라면 이동할 경로 계산
    const isActiveTab = item.isActive || item.path === currentPath;

    if (isActiveTab) {
      const currentIndex = history.findIndex(h => h.path === item.path);
      // 1. 오른쪽 탭 시도
      let nextTab = history[currentIndex + 1];
      // 2. 없으면 왼쪽 탭 시도
      if (!nextTab) {
        nextTab = history[currentIndex - 1];
      }

      // 다음 탭을 활성화하고, 같은 경로에서도 대기 중인 이동을 무효화한다.
      if (nextTab) {
        change(nextTab);
        if (nextTab.path === currentPath) router.push(nextTab.path);
      } else {
        // 탭이 하나밖에 없는데 닫은 경우 (예: 홈으로 이동)
        router.push("/");
      }
    }

    // 탭 삭제
    remove(item);
  };

  const handleCloseOthers = (tabPath: string) => {
    const foundTab = history.find(({ path }) => path === tabPath);
    if (foundTab) {
      setHistory([{ ...foundTab, isActive: true, lastAccessedAt: Date.now() }]);
      router.push(foundTab.path);
    }
  };

  const handleCloseAll = () => {
    setHistory([]);
    router.push("/");
  };

  const handleDragStart = ({ currentTarget: { id } }: React.MouseEvent<HTMLDivElement>) => {
    const clickedTab = history.find(({ path }) => path === id);
    if (clickedTab) {
      setDragStartPath(id);
      change(clickedTab);
    }
  };

  const handleDragEnter = ({ currentTarget }: React.MouseEvent<HTMLDivElement>) => {
    const { id } = currentTarget;
    if (id && dragStartPath && dragStartPath !== id) {
      setEnterPath(id);
    }
  };

  const handleDragEnd = () => {
    if (dragStartPath && dragEnterPath && dragStartPath !== dragEnterPath) {
      const clickedTab = history.find(({ path }) => path == dragStartPath);
      const targetTabIndex = history.findIndex(({ path }) => path == dragEnterPath);
      if (clickedTab) {
        const historyToUpdate = [...history]
          .filter(({ path }) => path !== clickedTab?.path)
          .map(item => ({ ...item, isActive: false }));
        historyToUpdate.splice(targetTabIndex, 0, { ...clickedTab, isActive: true });
        setHistory(historyToUpdate);
      }
    }
  };

  // URL과 History 동기화 (URL이 진실의 원천)
  useEffect(() => {
    if (!isHydrated) return;

    setHistory(prev => {
      if (prev.some(item => item.path === currentPath)) {
        return prev.map(item => ({
          ...item,
          isActive: item.path === currentPath,
          lastAccessedAt: item.path === currentPath ? Date.now() : item.lastAccessedAt,
        }));
      }
      const pathname = currentPath.split("?", 1)[0];
      const fallbackTitle = pathname === "/" ? "Home" : pathname.split("/").pop() || pathname;
      return [
        ...prev.map(item => ({ ...item, isActive: false })),
        {
          isActive: true,
          path: currentPath,
          title: getTabTitle(currentPath, fallbackTitle),
          lastAccessedAt: Date.now(),
        },
      ];
    });
  }, [currentPath, isHydrated, setHistory]);

  // 탭이 많아 가로로 넘쳐도 방금 연 탭이 보이도록 탭 줄만 가로 스크롤한다.
  // scrollIntoView는 바깥 레이아웃 컨테이너까지 스크롤할 수 있어 쓰지 않는다.
  useEffect(() => {
    const rail = tabRailRef.current;
    if (!rail || !activeTabPath) return;
    const activeTab = Array.from(rail.children).find(
      (tab): tab is HTMLElement => tab instanceof HTMLElement && tab.id === activeTabPath,
    );
    if (!activeTab) return;

    const tabStart = activeTab.offsetLeft;
    const tabEnd = tabStart + activeTab.offsetWidth;
    if (tabStart < rail.scrollLeft) {
      rail.scrollLeft = tabStart;
    } else if (tabEnd > rail.scrollLeft + rail.clientWidth) {
      rail.scrollLeft = tabEnd - rail.clientWidth;
    }
  }, [activeTabPath, history.length]);

  return (
    <div className="flex flex-col h-full w-full bg-gray-800">
      <div
        ref={tabRailRef}
        data-testid="history-tab-rail"
        className="relative flex h-8 min-h-8 flex-shrink-0 overflow-x-auto bg-gray-900"
      >
        {history.map(item => (
          <ContextMenu key={`tab_${item.path}`}>
            <ContextMenuTrigger asChild>
              <div
                id={`${item.path}`}
                className={twMerge(
                  "group relative flex h-8 shrink-0 truncate border border-l-0 border-gray-300/60",
                  item.isActive ? "border-b-0 bg-gray-800" : "hover:bg-gray-600",
                )}
                onMouseDown={handleMouseDown}
                onAuxClick={event => handleAuxClickTab(event, item)}
                onDragStart={handleDragStart}
                onDragEnterCapture={handleDragEnter}
                onDragEnd={handleDragEnd}
                draggable
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-current={item.isActive ? "page" : undefined}
                      onClick={() => handleClickTab(item)}
                      className="h-full"
                    >
                      <BaseText
                        className={twMerge(
                          "flex items-center py-1 pr-7 pl-2 text-sm text-gray-300/80 md:px-9 md:py-1.5 md:pl-5",
                          item.isActive &&
                            "border-t border-t-blue-300 pt-px font-medium text-yellow-200/95 md:pt-[5px]",
                        )}
                      >
                        {getTabTitle(item.path, item.title)}
                      </BaseText>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    className="border-gray-700 bg-gray-900 text-white"
                    showArrow={false}
                  >
                    {item.path}
                  </TooltipContent>
                </Tooltip>
                <button
                  type="button"
                  aria-label={`${t("close")}: ${getTabTitle(item.path, item.title)}`}
                  className={twMerge(
                    "absolute top-1/2 right-1 inline-flex -translate-y-1/2 rounded-sm text-gray-300/80 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none",
                    !item.isActive && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                  )}
                  onClick={event => handleSmartClose(event, item)}
                >
                  <Icon kind="close" size={18} aria-hidden="true" />
                </button>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-gray-800 border-gray-700 text-white">
              <ContextMenuItem onClick={() => handleSmartClose(null, item)}>
                {t("close")}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCloseOthers(item.path)}>
                {t("closeOthers")}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleCloseAll()}>{t("closeAll")}</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      <Container
        id="main-scroll-container"
        className="overflow-y-auto flex-1 text-white p-0 sm:p-2 md:p-4"
      >
        {children}
      </Container>
    </div>
  );
};
