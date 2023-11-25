import { ITree } from "@/hooks/useExplorer";
import { allPosts } from "contentlayer/generated";
import { compareDesc } from "date-fns";
import { cache } from "react";

export const getPosts = cache(async () => {
  const result = allPosts.sort((a: any, b: any) => compareDesc(new Date(a.date), new Date(b.date)));
  const posts: ITree[] = result.map(post => {
    return { id: post._raw.flattenedPath, label: post.title, path: post.url };
  });

  return { id: "blog", label: "blog", items: posts };
});
