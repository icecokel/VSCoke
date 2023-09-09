"use client";

import SidebarLayout from "./SidebarLayout";
import { BlogContext } from "@/contexts/AppProvider";
import useHistory from "@/hooks/useHistory";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HikingRoundedIcon from "@mui/icons-material/HikingRounded";
import PortraitRoundedIcon from "@mui/icons-material/PortraitRounded";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import TreeItem from "@mui/lab/TreeItem";
import TreeView from "@mui/lab/TreeView";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "next/link";
import { ReactNode, useContext, useEffect, useState } from "react";

export interface ITree {
  id: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  items?: ITree[];
}

const defaultData: ITree[] = [
  {
    id: "profile",
    label: "profile",
    items: [
      {
        id: "profile-index",
        label: "Iam.html",
        path: "/profile",
        icon: <PortraitRoundedIcon className="text-yellow-200" />,
      },
    ],
  },
  {
    id: "hobby",
    label: "hobby",
    items: [
      {
        id: "hobby-index",
        label: "BackPacking.html",
        path: "/hobby/BackPacking",
        icon: <HikingRoundedIcon className="text-green-300" />,
      },
    ],
  },
];

interface ExplorerProps {
  isShowing: boolean;
  tabClose: () => void;
}

const Explorer = ({ isShowing, tabClose }: ExplorerProps) => {
  const [itemList, setItemList] = useState<ITree[]>(defaultData);
  const [isLoading, setIsLoading] = useState(true);

  const blog = useContext(BlogContext);

  useEffect(() => {
    if (blog && !itemList.some(item => item.label === blog.label)) {
      const addedIconBlog = { ...blog };
      if (blog.items)
        addedIconBlog.items = blog.items.map((item: ITree) => ({
          ...item,
          icon: <TextSnippetOutlinedIcon className="text-blue-100" />,
        }));
      setItemList(prev => [...prev, addedIconBlog]);
      setIsLoading(false);
    }
  }, [blog]);

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
