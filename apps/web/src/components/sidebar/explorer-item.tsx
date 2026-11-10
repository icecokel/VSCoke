"use client";

import { ITree } from "@/hooks/use-explorer";
import { useCustomRouter } from "@/hooks/use-custom-router";
import Icon from "@/components/base-ui/icon";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExplorerItemProps extends ITree {
  tabClose: () => void;
  defaultOpen?: boolean;
}

const convertIcon = (icon?: string) => {
  switch (icon) {
    case "profile":
      return <Icon kind="account_box" size={22} className="text-yellow-200" />;
    case "backPacking":
      return <Icon kind="hiking" size={22} className="text-green-300" />;
    case "blog":
      return <Icon kind="article" size={22} className="text-blue-100" />;
    case "dashboard":
      return <Icon kind="view_column" size={22} className="text-purple-300" />;
    case "hard_drive":
      return <Icon kind="hard_drive" size={22} className="text-cyan-300" />;
    case "none":
      return null;
    default:
      return <Icon kind="content_paste_search" color="text-gray-100" />;
  }
};

// 폴더와 파일 행은 Tab 탐색과 Enter·Space 실행을 위해 기본 button으로 렌더링한다.
const explorerRowClassName =
  "flex w-full min-w-0 cursor-pointer items-center gap-x-1.5 rounded-xs text-left focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-inset focus-visible:outline-none";

const ExplorerItem = ({
  id,
  label,
  path,
  items,
  tabClose,
  icon,
  defaultOpen = false,
}: ExplorerItemProps) => {
  const [openedId, setOpenedId] = useState(defaultOpen && items ? id : "");
  const url = !items ? (path ?? "") : "";
  const router = useCustomRouter();

  const handleClickTree = () => {
    setOpenedId(prev => (prev === id ? "" : id));
  };

  const handleClickItem = () => {
    if (url) {
      router.push(url, { title: label });
      tabClose();
    }
  };

  const handlePrefetchItem = () => {
    if (url) {
      router.prefetch(url);
    }
  };

  // Helper for leaf nodes to render with tooltip
  const renderLeaf = () => {
    return (
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={explorerRowClassName}
              onClick={handleClickItem}
              onMouseEnter={handlePrefetchItem}
              onFocus={handlePrefetchItem}
            >
              <span className="shrink-0 flex items-center justify-center size-4">
                {convertIcon(icon)}
              </span>
              <span className="truncate text-sm">{label}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex flex-col gap-y-1.5 cursor-pointer select-none">
      <div className="flex items-center gap-x-1 hover:bg-blue-300/10 rounded-xs overflow-hidden">
        {items ? (
          <button
            type="button"
            aria-expanded={openedId === id}
            className={explorerRowClassName}
            onClick={handleClickTree}
          >
            <span className="shrink-0 flex items-center justify-center size-4">
              <Icon
                kind={openedId === id ? "keyboard_arrow_down" : "keyboard_arrow_right"}
                style={{ fontSize: "20px" }}
              />
            </span>
            <span className="truncate flex-1 text-base leading-6">{id}</span>
          </button>
        ) : (
          renderLeaf()
        )}
      </div>
      {openedId === id && items && (
        <div className="ml-[0.85rem] pl-2 border-l border-gray-700">
          {items?.map(item => {
            return <ExplorerItem key={`tree_${item.id}`} {...item} tabClose={tabClose} />;
          })}
        </div>
      )}
    </div>
  );
};

export default ExplorerItem;
