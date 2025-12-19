import { ITree } from "@/hooks/use-explorer";
import { getPostsGroupedByCategory } from "@/lib/blog";
import { cache } from "react";

export const getExplorer = cache(async (): Promise<ITree[]> => {
  // 블로그 포스트들을 카테고리별로 그룹화하여 트리 구조로 변환
  const categoryGroups = getPostsGroupedByCategory();

  const blogItems: ITree[] = categoryGroups.map((group, categoryIndex) => ({
    id: `${group.category}`,
    label: group.category,
    index: categoryIndex,
    items: group.posts.map((post, postIndex) => ({
      icon: "article",
      id: `blog-post-${post.slug}`,
      label: `${post.title}.mdx`,
      path: `/blog/${post.slug}`,
      index: postIndex,
    })),
  }));

  return [
    {
      index: 0,
      id: "profile",
      label: "profile",
      items: [
        {
          icon: "profile",
          id: "profile-index",
          label: "Iam.html",
          path: "/profile",
        },
      ],
    },
    {
      index: 1,
      id: "blog",
      label: "blog",
      items:
        blogItems.length > 0
          ? [
              {
                icon: "computer",
                id: "blog-dashboard",
                label: "dashboard.tsx",
                path: "/blog/dashboard",
                index: -1,
              },
              ...blogItems,
            ]
          : [
              {
                icon: "computer",
                id: "blog-dashboard",
                label: "dashboard.tsx",
                path: "/blog/dashboard",
                index: -1,
              },
              {
                icon: "article",
                id: "blog-empty",
                label: "(no posts)",
                path: "/blog",
              },
            ],
    },
    {
      index: 50,
      id: "games",
      label: "games",
      items: [
        {
          icon: "react",
          id: "game-dashboard",
          label: "index.tsx",
          path: "/game",
        },
      ],
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
