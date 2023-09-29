"use client";

import SidebarLayout from "./SidebarLayout";
import useExplorer from "@/hooks/useExplorer";
import { ITree } from "@/hooks/useExplorer";
import useHistory from "@/hooks/useHistory";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TreeItem from "@mui/lab/TreeItem";
import TreeView from "@mui/lab/TreeView";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "next/link";

interface ExplorerProps {
  isShowing: boolean;
  tabClose: () => void;
}

const Explorer = ({ isShowing, tabClose }: ExplorerProps) => {
  const { itemList, isLoading } = useExplorer();
  return (
    <SidebarLayout isShowing={isShowing}>
      {isLoading ? (
        <LinearProgress className="mt-5" />
      ) : (
        <TreeView
          aria-label="file system navigator"
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          sx={{ height: 240, flexGrow: 1, maxWidth: 400, overflowY: "auto" }}
        >
          {itemList.map(item => {
            return <Explorer.item key={`tree_${item.id}`} {...item} tabClose={tabClose} />;
          })}
        </TreeView>
      )}
    </SidebarLayout>
  );
};

export default Explorer;

interface IItemProps extends ITree {
  tabClose: () => void;
}

Explorer.item = ({ id, label, path, items, tabClose, icon }: IItemProps) => {
  const url = !items ? path ?? "" : "";

  const { add } = useHistory();

  const handleClickItem = () => {
    if (url) {
      add({ isAactive: true, path: url, title: label });
      tabClose();
    }
  };
  return (
    <Link href={url} onClick={handleClickItem}>
      <TreeItem nodeId={id} label={label} className="bg-gray-900" icon={icon}>
        {items?.map(item => {
          return <Explorer.item key={`tree_${item.id}`} {...item} tabClose={tabClose} />;
        })}
      </TreeItem>
    </Link>
  );
};
