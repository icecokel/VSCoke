"use client";

import Icon from "../baseUi/Icon";
import BaseText from "../baseUi/Text";
import SidebarLayout from "./SidebarLayout";
import useExplorer, { ITree } from "@/hooks/useExplorer";
import useHistory from "@/hooks/useHistory";
import { MouseEvent, useState } from "react";

interface ExplorerProps {
  isShowing: boolean;
  tabClose: () => void;
}

const Explorer = ({ isShowing, tabClose }: ExplorerProps) => {
  const { itemList, isLoading } = useExplorer();

  return (
    <SidebarLayout isShowing={isShowing}>
      {!isLoading && (
        <div aria-label="file system navigator" className="flex flex-col gap-y-1">
          {itemList.map(item => {
            return <Explorer.item key={`tree_${item.id}`} {...item} tabClose={tabClose} />;
          })}
        </div>
      )}
    </SidebarLayout>
  );
};

export default Explorer;

interface IItemProps extends ITree {
  tabClose: () => void;
}

const convertIcon = (icon?: string) => {
  switch (icon) {
    case "profile":
      return <Icon kind="account_box" style={{ fontSize: "22px" }} className="text-yellow-200" />;
    case "backPacking":
      return <Icon kind="hiking" style={{ fontSize: "22px" }} className="text-green-300" />;
    case "blog":
      return <Icon kind="article" style={{ fontSize: "22px" }} className="text-blue-100" />;
    default:
      <Icon kind="content_paste_search" className="text-gray-100" />;
  }
};
Explorer.item = ({ id, label, path, items, tabClose, icon }: IItemProps) => {
  const [openedId, setOpenedId] = useState("");
  const url = !items ? path ?? "" : "";
  const { add } = useHistory();

  const handleClickTree = ({ currentTarget: { ariaValueText } }: MouseEvent<HTMLDivElement>) => {
    setOpenedId(prev => {
      if (!ariaValueText) return "";

      return prev === ariaValueText ? "" : ariaValueText;
    });
  };

  const handleClickItem = () => {
    if (url) {
      add({ isActive: true, path: url, title: label });
      tabClose();
    }
  };

  return (
    <div className="flex flex-col gap-y-1 cursor-pointer">
      <div
        className="flex items-center gap-x-1 hover:bg-blue-300/10 rounded-sm"
        aria-valuetext={id}
        onClick={handleClickTree}
      >
        {items ? (
          <>
            {openedId === id ? (
              <Icon kind="keyboard_arrow_down" style={{ fontSize: "20px" }} />
            ) : (
              <Icon kind="keyboard_arrow_right" style={{ fontSize: "20px" }} />
            )}
            <BaseText type="body1">{id}</BaseText>
          </>
        ) : (
          <div className="flex items-center gap-x-1" onClick={handleClickItem}>
            {convertIcon(icon)}
            {label}
          </div>
        )}
      </div>
      {openedId === id && (
        <div className="ml-[1em]">
          {items?.map(item => {
            return <Explorer.item key={`tree_${item.id}`} {...item} tabClose={tabClose} />;
          })}
        </div>
      )}
    </div>
  );
};
