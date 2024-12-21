import { useEffect, useState } from "react";

type SortDirection = "ASC" | "DESC";

const sortByKey = <T>(items: T[], key: keyof T, direction: SortDirection = "ASC"): T[] => {
  return [...items].sort((a, b) => {
    const order = direction === "ASC" ? 1 : -1;
    if (a[key] > b[key]) return 1 * order;
    if (a[key] < b[key]) return -1 * order;
    return 0;
  });
};

type Item = {
  [key: string]: any;
};

type SortedData<T> = {
  items: T[];
  key: keyof T;
  direction?: SortDirection;
};

const useSortByKey = <T extends Item>({ items, key, direction }: SortedData<T>): T[] => {
  const [sortedData, setSortedData] = useState<T[]>(items);

  useEffect(() => {
    setSortedData(sortByKey(items, key, direction));
  }, [items]);

  return sortedData;
};

export default useSortByKey;
