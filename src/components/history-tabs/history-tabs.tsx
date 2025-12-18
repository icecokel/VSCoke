"use client";

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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import { useTranslations } from "next-intl";

const HistoryTabs = ({ children }: TParentNode) => {
  const { history, change, remove, setHistory, current, add } = useHistory();
  const router = useRouter();
  const t = useTranslations("historyTabs");

  const handleClickTab = change;
  const handleClickClose = remove;

  const [dragStartPath, setDragStartPath] = useState<string>();
  const [dragEnterPath, setEnterPath] = useState<string>();

  const handleCloseTab = (tabPath: string) => {
    const foundTab = history.find(({ path }) => path === tabPath);
    if (foundTab) {
      remove(foundTab);
    }
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
      router.push(id);
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

  useEffect(() => {
    if (history.length === 0) {
      router.replace("/");
      return;
    }

    if (current) {
      router.replace(current.path);
      return;
    } else {
      add(history[0]);
    }
  }, [history, add, current, router]);

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
                      "border border-gray-300/60 border-l-0 h-8 truncate shrink-0",
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
                          !item.isActive && "hidden",
                        )}
                      >
                        <Icon
                          kind="close"
                          style={{ fontSize: "18px" }}
                          onClick={() => handleClickClose(item)}
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
              <ContextMenuItem onClick={() => handleCloseTab(item.path)}>
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

      <Container className="overflow-y-auto flex-1 text-white sm:p-2 md:p-5 xs:px-0 xs:py-3">
        {children}
      </Container>
    </div>
  );
};

export default HistoryTabs;
