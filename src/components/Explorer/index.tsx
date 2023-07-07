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
    id: "project",
    label: "project",
    children: [
      { id: "next-blog", label: "next-blog", path: "/profile/next-blog" },
      { id: "next-blog-2", label: "next-blog", path: "/profile/next-blog" },
      {
        id: "next-blog-3",
        label: "next-blog",
        path: "/profile/next-blog",
        children: [
          { id: "next-blog-4", label: "next-blog", path: "/profile/next-blog" },
          { id: "next-blog-5", label: "next-blog", path: "/profile/next-blog" },
        ],
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
    <Box className="bg-gray-900  text-gray-100 h-screen min-w-[250px] p-2 border-r-2 border-r-gray-500">
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
