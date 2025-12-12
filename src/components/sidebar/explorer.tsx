"use client";

import SidebarLayout from "./sidebar-layout";
import useExplorer from "@/hooks/use-explorer";
import ExplorerItem from "./explorer-item";

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
            return <ExplorerItem key={`tree_${item.id}`} {...item} tabClose={tabClose} />;
          })}
        </div>
      )}
    </SidebarLayout>
  );
};

export default Explorer;
