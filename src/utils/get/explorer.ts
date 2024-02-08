import { ITree } from "@/hooks/useExplorer";
import { cache } from "react";

export const getExplorer = cache(async (): Promise<ITree[]> => {
  return [
    {
      index: 0,
      id: "profile",
      label: "profile",
      items: [{ icon: "profile", id: "profile-index", label: "Iam.html", path: "/profile" }],
    },
    {
      index: 98,
      id: "package.json",
      label: "package.json",
    },
    {
      index: 99,
      id: "readme",
      label: "README.md",
    },
  ];
});
