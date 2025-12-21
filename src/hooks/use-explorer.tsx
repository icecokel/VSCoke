"use client";

import { sortByKey } from "@/lib/utils";
import { ExplorerContext } from "@/contexts/app-provider";
import { useContext, useEffect, useState } from "react";
import { useBoolean } from "./use-boolean";

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
  const loading = useBoolean(true);
  const explorer = useContext(ExplorerContext);

  const { onFalse } = loading;

  useEffect(() => {
    if (explorer) {
      setItemList(sortByKey([...explorer], "index"));
      onFalse();
    }
  }, [explorer, onFalse]);

  return {
    isLoading: loading.value,
    itemList,
  };
};
