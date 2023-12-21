import { ITree } from "@/hooks/useExplorer";
import { allPosts } from "contentlayer/generated";
import { compareDesc } from "date-fns";
import { cache } from "react";

export const getPosts = cache(async () => {
  const result = allPosts.sort((a: any, b: any) => compareDesc(new Date(a.date), new Date(b.date)));
  const today = new Date();
  const posts: ITree[] = result
    .filter(item => new Date(item.date).getTime() <= today.getTime())
    .map(post => {
      return { id: post._raw.flattenedPath, label: post.title, path: post.url };
    });

  return { id: "blog", label: "blog", items: posts };
});
