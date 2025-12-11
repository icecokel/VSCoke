"use client";

import useSortByKey from "./use-sort-by-key";
import { ExplorerContext } from "@/contexts/app-provider";
import { useContext, useEffect, useState } from "react";

export interface ITree {
  index?: number;
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

  useEffect(() => {
    if (explorer) {
      setItemList([...explorer]);
      setIsLoading(false);
    }
  }, [explorer]);

  const result = useSortByKey({ items: itemList, key: "index" });

  return {
    isLoading,
    itemList: result,
  };
};

export default useExplorer;
