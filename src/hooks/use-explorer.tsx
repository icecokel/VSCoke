"use client";

import { sortByKey } from "@/lib/utils";
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

export const useExplorer = () => {
  const [itemList, setItemList] = useState<ITree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const explorer = useContext(ExplorerContext);

  useEffect(() => {
    if (explorer) {
      setItemList(sortByKey([...explorer], "index"));
      setIsLoading(false);
    }
  }, [explorer]);

  return {
    isLoading,
    itemList,
  };
};
