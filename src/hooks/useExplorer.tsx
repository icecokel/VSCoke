"use client";

import { BlogContext, ExplorerContext } from "@/contexts/AppProvider";
import { useContext, useEffect, useState } from "react";

export interface ITree {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  items?: ITree[];
}

const useExplorer = () => {
  const [itemList, setItemList] = useState<ITree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const explorer = useContext(ExplorerContext);
  const blog = useContext(BlogContext);

  useEffect(() => {
    if (explorer && blog && !itemList.some(item => item.label === blog.label)) {
      setItemList([...explorer, { ...blog }]);
      setIsLoading(false);
    }
  }, [explorer, blog]);

  return {
    isLoading,
    itemList,
  };
};

export default useExplorer;
