import { cache } from "react";

export const getExplorer = cache(async () => {
  const data = {
    tree: [
      {
        id: "profile",
        label: "profile",
        items: [{ icon: "profile", id: "profile-index", label: "Iam.html", path: "/profile" }],
      },
    ],
  };

  if (!data) {
    return [];
  }

  return data.tree;
});
