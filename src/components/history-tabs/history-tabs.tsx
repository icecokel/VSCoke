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
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import { useTranslations } from "next-intl";

const HistoryTabs = ({ children }: TParentNode) => {
  const { history, change, remove, setHistory, add, isHydrated } = useHistory();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("historyTabs");

  const handleClickTab = change;

  const [dragStartPath, setDragStartPath] = useState<string>();
  const [dragEnterPath, setEnterPath] = useState<string>();

  const handleSmartClose = (e: React.MouseEvent | null, item: IHistoryItem) => {
    if (e) {
      e.stopPropagation();
    }

    // 현재 닫는 탭이 활성화 상태라면 이동할 경로 계산
    const isActiveTab = item.path === pathname;

    if (isActiveTab) {
      const currentIndex = history.findIndex(h => h.path === item.path);
      // 1. 오른쪽 탭 시도
      let nextTab = history[currentIndex + 1];
      // 2. 없으면 왼쪽 탭 시도
      if (!nextTab) {
        nextTab = history[currentIndex - 1];
      }

      // 이동 (URL 변경 -> useEffect가 감지하여 active 상태 업데이트)
      if (nextTab) {
        router.push(nextTab.path);
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
      setHistory([{ ...foundTab, isActive: true }]);
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

    // 현재 URL에 해당하는 탭이 있는지 확인
    const matchingTab = history.find(item => item.path === pathname);

    if (matchingTab) {
      if (!matchingTab.isActive) {
        // 탭은 있는데 활성화가 안 되어 있다면 활성화 (URL 변경 없음)
        setHistory(prev =>
          prev.map(item => ({
            ...item,
            isActive: item.path === pathname,
          })),
        );
      }
    } else {
      // 탭이 없다면 새로 추가 (URL 변경 없음)
      // 경로는 pathname 그대로 사용, 제목은 경로에서 유추하거나 기본값 사용
      // 주의: 루트 경로('/')는 보통 탭으로 표시하지 않거나 Home으로 표시할 수 있음.
      // 여기서는 일단 추가하는 로직 유지.
      const title = pathname === "/" ? "Home" : pathname.split("/").pop() || pathname;

      add({ path: pathname, title, isActive: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isHydrated]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-800">
      <div className="flex bg-gray-900 overflow-x-auto flex-shrink-0">
        {history.map(item => (
          <ContextMenu key={`tab_${item.path}`}>
            <ContextMenuTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    id={`${item.path}`}
                    className={twMerge(
                      "group border border-gray-300/60 border-l-0 h-8 truncate shrink-0",
                      item.isActive ? "bg-gray-800 border-b-0" : "hover:bg-gray-600",
                    )}
                    onClick={() => handleClickTab(item)}
                    onDragStart={handleDragStart}
                    onDragEnterCapture={handleDragEnter}
                    onDragEnd={handleDragEnd}
                    draggable
                  >
                    <BaseText
                      className={twMerge(
                        "text-gray-300/80 md:py-1.5 md:px-5 py-1 px-2 text-sm flex items-center",
                        item.isActive &&
                          "text-yellow-200/95 font-medium border-t pt-px border-t-blue-300 md:pt-[5px]",
                      )}
                    >
                      {item.title}
                      <span
                        className={twMerge(
                          "ml-1 -mr-1 md:ml-2 md:-mr-2 inline",
                          !item.isActive && "hidden group-hover:inline-block",
                        )}
                      >
                        <Icon
                          kind="close"
                          style={{ fontSize: "18px" }}
                          onClick={e => handleSmartClose(e, item)}
                        />
                      </span>
                    </BaseText>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 border-gray-700 text-white">
                  {`${item.path}/${item.title}`}
                </TooltipContent>
              </Tooltip>
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

      <Container className="overflow-y-auto flex-1 text-white p-0 sm:p-2 md:p-4">
        {children}
      </Container>
    </div>
  );
};

export default HistoryTabs;
