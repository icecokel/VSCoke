import { getData } from "@/service/firebase/service";
import { cache } from "react";

export const getExplorer = cache(async () => {
  const data = await getData("vscoke", "explorer");

  if (!data) {
    return [];
  }

  return data.tree;
});
