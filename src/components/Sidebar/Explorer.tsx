"use client";

import SidebarLayout from "./SidebarLayout";
import useExplorer, { ITree } from "@/hooks/useExplorer";
import useHistory from "@/hooks/useHistory";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ContentPasteSearchIcon from "@mui/icons-material/ContentPasteSearch";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HikingRoundedIcon from "@mui/icons-material/HikingRounded";
import PortraitRoundedIcon from "@mui/icons-material/PortraitRounded";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import TreeItem from "@mui/lab/TreeItem";
import TreeView from "@mui/lab/TreeView";
import LinearProgress from "@mui/material/LinearProgress";

interface ExplorerProps {
  isShowing: boolean;
  tabClose: () => void;
}

const Explorer = ({ isShowing, tabClose }: ExplorerProps) => {
  const { itemList, isLoading } = useExplorer();

  const handleRightClick: React.MouseEventHandler<HTMLDivElement> = event => {
    event.preventDefault();
  };

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
      add({ isActive: true, path: url, title: label });
      tabClose();
    }
  };

  const convertIcon = () => {
    switch (icon) {
      case "profile":
        return <PortraitRoundedIcon className="text-yellow-200" />;
      case "backPacking":
        return <HikingRoundedIcon className="text-green-300" />;
      case "blog":
        return <TextSnippetOutlinedIcon className="text-blue-100" />;
      default:
        <ContentPasteSearchIcon className="text-gray-100" />;
    }
  };

  return (
    <div onClick={handleClickItem}>
      <TreeItem nodeId={id} label={label} className="bg-gray-900" icon={convertIcon()}>
        {items?.map(item => {
          return <Explorer.item key={`tree_${item.id}`} {...item} tabClose={tabClose} />;
        })}
      </TreeItem>
    </div>
  );
};
