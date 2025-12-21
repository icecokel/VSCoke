"use client";

import { ITree } from "@/hooks/use-explorer";
import { useCustomRouter } from "@/hooks/use-custom-router";
import Icon from "@/components/base-ui/icon";
import BaseText from "@/components/base-ui/text";
import { MouseEvent, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExplorerItemProps extends ITree {
  tabClose: () => void;
}

const convertIcon = (icon?: string) => {
  switch (icon) {
    case "profile":
      return <Icon kind="account_box" size={22} className="text-yellow-200" />;
    case "backPacking":
      return <Icon kind="hiking" size={22} className="text-green-300" />;
    case "blog":
      return <Icon kind="article" size={22} className="text-blue-100" />;
    default:
      return <Icon kind="content_paste_search" color="text-gray-100" />;
  }
};

const ExplorerItem = ({ id, label, path, items, tabClose, icon }: ExplorerItemProps) => {
  const [openedId, setOpenedId] = useState("");
  const url = !items ? (path ?? "") : "";
  const router = useCustomRouter();

  const handleClickTree = ({ currentTarget: { ariaValueText } }: MouseEvent<HTMLDivElement>) => {
    setOpenedId(prev => {
      if (!ariaValueText) return "";

      return prev === ariaValueText ? "" : ariaValueText;
    });
  };

  const handleClickItem = () => {
    if (url) {
      router.push(url, { title: label });
      tabClose();
    }
  };

  // Helper for leaf nodes to render with tooltip
  const renderLeaf = () => {
    return (
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-x-1 min-w-0" onClick={handleClickItem}>
              {convertIcon(icon)}
              <span className="truncate text-sm">{label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex flex-col gap-y-1 cursor-pointer select-none">
      <div
        className="flex items-center gap-x-1 hover:bg-blue-300/10 rounded-xs overflow-hidden"
        aria-valuetext={id}
        onClick={items ? handleClickTree : undefined}
      >
        {items ? (
          <>
            <Icon
              kind={openedId === id ? "keyboard_arrow_down" : "keyboard_arrow_right"}
              style={{ fontSize: "20px" }}
            />

            <BaseText type="body1">{id}</BaseText>
          </>
        ) : (
          renderLeaf()
        )}
      </div>
      {openedId === id && items && (
        <div className="ml-[1em]">
          {items?.map(item => {
            return <ExplorerItem key={`tree_${item.id}`} {...item} tabClose={tabClose} />;
          })}
        </div>
      )}
    </div>
  );
};

export default ExplorerItem;
