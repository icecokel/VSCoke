"use client";

import useHistory from "@/hooks/use-history";
import { TParentNode } from "@/models/common";
import Container from "@/components/base-ui/container";
import Icon from "@/components/base-ui/icon";
import Menu from "@/components/base-ui/menu";
import BaseText from "@/components/base-ui/text";
import Tooltip from "@/components/base-ui/tooltip";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

const HistoryTabs = ({ children }: TParentNode) => {
  const [currentEl, setCurrentEl] = useState<null | HTMLElement>(null);
  const { history, change, remove, setHistory, current, add } = useHistory();
  const router = useRouter();

  const handleClickTab = change;
  const handleClickClose = remove;

  const handleRightClickTab: React.MouseEventHandler<HTMLDivElement> = event => {
    event.preventDefault();
    setCurrentEl(event.currentTarget);
  };

  const onClose = () => {
    setCurrentEl(null);
  };

  const [dragStartPath, setDragStartPath] = useState<string>();
  const [dragEnterPath, setEnterPath] = useState<string>();

  const onClickMenu =
    (menu: "close" | "closeOthers" | "closeAll") => (target: HTMLElement | null) => {
      if (target) {
        const foundTab = history.find(({ path }) => path === target.id);
        switch (menu) {
          case "close": {
            if (foundTab) {
              remove(foundTab);
            }
            break;
          }

          case "closeOthers": {
            if (foundTab) {
              setHistory(prev => [{ ...foundTab, isActive: true }]);
              router.push(foundTab.path);
            }
            break;
          }

          case "closeAll": {
            setHistory([]);
            router.push("/");
          }
        }
      }
      setCurrentEl(null);
    };

  const handleClickCloseMenu = onClickMenu("close");
  const handleClickCloseOuters = onClickMenu("closeOthers");
  const handleClickCloseAll = onClickMenu("closeAll");

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
  }, [history]);

  return (
    <div className="w-full bg-gray-800">
      <div className="flex bg-gray-900 overflow-x-auto">
        {history.map(item => (
          <Tooltip key={`tab_${item.path}`} text={`${item.path}/${item.title}`}>
            <div
              id={`${item.path}`}
              className={twMerge(
                "border border-gray-300/60 border-l-[0px] h-[32px] truncate",
                item.isActive ? "bg-gray-800 border-b-[0px]" : "hover:bg-gray-600",
              )}
              onClick={() => handleClickTab(item)}
              onContextMenu={handleRightClickTab}
              onDragStart={handleDragStart}
              onDragEnterCapture={handleDragEnter}
              onDragEnd={handleDragEnd}
              draggable
            >
              <BaseText
                className={twMerge(
                  "text-gray-300/80 md:py-[6px] md:px-[20px] py-[4px] px-[8px] text-sm flex items-center",
                  item.isActive &&
                    "text-yellow-200/95 font-medium border-t pt-[1px] border-t-blue-300 md:pt-[5px]",
                )}
              >
                {item.title}
                <span
                  className={twMerge(
                    "ml-[4px] mr-[-4px] md:ml-[8px] md:mr-[-8px] inline",
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
          </Tooltip>
        ))}
      </div>

      <Menu targetEl={currentEl} onClose={onClose}>
        <Menu.item onClick={() => handleClickCloseMenu(currentEl)}>닫기</Menu.item>
        <Menu.item onClick={() => handleClickCloseOuters(currentEl)}>나머지 닫기</Menu.item>
        <Menu.item onClick={() => handleClickCloseAll(currentEl)}>모두 닫기</Menu.item>
      </Menu>

      <Container className="min-h-screen flex-1 text-white sm:p-2 md:p-5 xs:px-0 xs:py-3">
        {children}
      </Container>
    </div>
  );
};

export default HistoryTabs;
