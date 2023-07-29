"use client";

import SidebarLayout from "./SidebarLayout";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TreeItem from "@mui/lab/TreeItem";
import TreeView from "@mui/lab/TreeView";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "next/link";
import { useState } from "react";
import useSWR, { preload } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

preload("/api/getPosts", fetcher);

export interface ITree {
  id: string;
  label: string;
  path?: string;
  items?: ITree[];
}

const defaultData: ITree[] = [
  {
    id: "profile",
    label: "profile",
    items: [{ id: "profile-index", label: "index.html", path: "/profile" }],
  },
];

interface ExplorerProps {
  isShowing: boolean;
}

const Explorer = ({ isShowing }: ExplorerProps) => {
  const [itemList, setItemList] = useState<ITree[]>(defaultData);

  const { isLoading } = useSWR("/api/getPosts", fetcher, {
    onSuccess: (blog) => {
      if (!itemList.some((item) => item.label === blog.label)) {
        setItemList((prev) => [...prev, blog]);
      }
    },
  });

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
          {itemList.map((item) => {
            return <Explorer.item key={`tree_${item.id}`} {...item} />;
          })}
        </TreeView>
      )}
    </SidebarLayout>
  );
};

export default Explorer;

Explorer.item = ({ id, label, path, items }: ITree) => {
  const url = !items ? path ?? "" : "";
  return (
    <Link href={url}>
      <TreeItem nodeId={id} label={label} className="bg-gray-900">
        {items?.map((item) => {
          return <Explorer.item key={`tree_${item.id}`} {...item} />;
        })}
      </TreeItem>
    </Link>
  );
};
