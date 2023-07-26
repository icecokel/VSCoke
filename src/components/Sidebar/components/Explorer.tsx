"use client";

import SidebarLayout from "./SidebarLayout";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TreeItem from "@mui/lab/TreeItem";
import TreeView from "@mui/lab/TreeView";
import Link from "next/link";
import { useEffect, useState } from "react";
import useSWRMutation from "swr/mutation";

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
  const fetcher = (resource: any, init: any) =>
    fetch(resource, init).then((res) => res.json());

  const { trigger } = useSWRMutation("/api/getPosts", fetcher, {
    onSuccess: (blog) => {
      if (!itemList.some((item) => item.label === blog.label)) {
        setItemList((prev) => [...prev, blog]);
      }
    },
  });

  useEffect(() => {
    trigger();
  }, []);
  return (
    <SidebarLayout isShowing={isShowing}>
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
