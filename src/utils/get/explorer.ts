import { ITree } from "@/hooks/use-explorer";
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
      path: "/package",
    },
    {
      index: 99,
      id: "readme",
      label: "README.md",
      path: "/readme",
    },
  ];
});
