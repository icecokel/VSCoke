"use client";

import { sortByKey } from "@/lib/utils";
import { ExplorerContext } from "@/contexts/app-provider";
import { useContext, useEffect, useState } from "react";
import { useBoolean } from "./use-boolean";
import { useTranslations } from "next-intl";

export interface ITree {
  index?: number;
  id: string;
  label: string;
  icon?: string;
  path?: string;
  items?: ITree[];
}

export const useExplorer = () => {
  const t = useTranslations("sidebar");
  const [itemList, setItemList] = useState<ITree[]>([]);
  const loading = useBoolean(true);
  const explorer = useContext(ExplorerContext);

  const { onFalse } = loading;

  useEffect(() => {
    if (explorer) {
      const limitItemsRecursively = (items: ITree[]): ITree[] => {
        const sorted = sortByKey([...items], "index");
        let result = sorted;

        if (sorted.length > 10) {
          const sliced = sorted.slice(0, 10);
          sliced.push({
            id: "(more)",
            label: t("more"),
            path: "/blog/dashboard",
            icon: "none",
          });
          result = sliced;
        }

        return result.map(item => {
          if (item.items) {
            return { ...item, items: limitItemsRecursively(item.items) };
          }
          return item;
        });
      };

      setItemList(limitItemsRecursively(explorer));
      onFalse();
    }
  }, [explorer, onFalse, t]);

  return {
    isLoading: loading.value,
    itemList,
  };
};
