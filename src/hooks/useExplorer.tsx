"use client";

import { BlogContext } from "@/contexts/AppProvider";
import HikingRoundedIcon from "@mui/icons-material/HikingRounded";
import PortraitRoundedIcon from "@mui/icons-material/PortraitRounded";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import { ReactNode, useContext, useEffect, useState } from "react";

export interface ITree {
  id: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  items?: ITree[];
}

const iconMap = {
  profile: <PortraitRoundedIcon className="text-yellow-200" />,
  hobby: <HikingRoundedIcon className="text-green-300" />,
  blog: <TextSnippetOutlinedIcon className="text-blue-100" />,
};

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

const useExplorer = () => {
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

  return {
    isLoading,
    itemList,
  };
};

export default useExplorer;
