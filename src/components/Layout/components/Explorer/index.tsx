"use client";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TreeItem from "@mui/lab/TreeItem";
import TreeView from "@mui/lab/TreeView";
import Box from "@mui/material/Box";
import Link from "next/link";

interface ITree {
  id: string;
  label: string;
  path?: string;
  children?: ITree[];
}

const sample: ITree[] = [
  {
    id: "profile",
    label: "profile",
    children: [{ id: "profile-index", label: "index.html", path: "/profile" }],
  },
  {
    id: "projects",
    label: "projects",
    children: [
      {
        id: "VSCoke",
        label: "VSCoke",
        path: "/profile/VSCoke",
      },
      { id: "Next-blog", label: "Next-blog", path: "/profile/Next-blog" },
      {
        id: "MVC-Spring-Project",
        label: "MVC-Spring-Project",
        path: "/profile/MVC-Spring-Project",
      },
    ],
  },
  {
    id: "blog",
    label: "blog",
    children: [{ id: "blog", label: "index.html" }],
  },
];

const Explorer = () => {
  return (
    <Box className="hi hidden h-screen border-r-2 border-r-gray-500 bg-gray-900 p-2 text-gray-100 xl:block xl:w-[250px]">
      <TreeView
        aria-label="file system navigator"
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        sx={{ height: 240, flexGrow: 1, maxWidth: 400, overflowY: "auto" }}
      >
        {sample.map((item) => {
          return <Explorer.item key={`tree_${item.id}`} {...item} />;
        })}
      </TreeView>
    </Box>
  );
};

export default Explorer;

Explorer.item = ({ id, label, path, children }: ITree) => {
  const url = !children ? path ?? "" : "";
  return (
    <Link href={url}>
      <TreeItem nodeId={id} label={label} className="bg-gray-900">
        {children?.map((item) => {
          return <Explorer.item key={`tree_${item.id}`} {...item} />;
        })}
      </TreeItem>
    </Link>
  );
};
