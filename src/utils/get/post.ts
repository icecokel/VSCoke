import { ITree } from "@/hooks/useExplorer";
import { allPosts } from "contentlayer/generated";
import { compareDesc } from "date-fns";
import { cache } from "react";

export const getPosts = cache(async (): Promise<ITree> => {
  const result = allPosts.sort((a: any, b: any) => compareDesc(new Date(a.date), new Date(b.date)));
  const today = new Date();

  const posts: ITree[] = [];
  result
    .filter(item => {
      return !!item.published && new Date(item.date).getTime() <= today.getTime();
    })
    .forEach(post => {
      let foundIndex = posts.findIndex(
        ({ label }) => label === post._raw.flattenedPath.split("/")[0],
      );

      if (foundIndex === -1) {
        const newCategory: ITree = {
          id: post._raw.flattenedPath.split("/")[0],
          label: post._raw.flattenedPath.split("/")[0],
          items: [],
        };
        posts.push(newCategory);
        foundIndex = posts.length - 1;
      }

      posts[foundIndex]?.items?.push({
        id: post._raw.flattenedPath,
        label: post.title,
        path: post.url,
        icon: "blog",
      });
    });

  return { index: 1, id: "blog", label: "blog", items: posts };
});

export interface IResult {
  title: string;
  path: string;
}

export const searchPost = (keyword: string): IResult[] => {
  const result = allPosts.sort((a: any, b: any) => compareDesc(new Date(a.date), new Date(b.date)));
  const searched: IResult[] = result
    .filter(post => {
      if (post.title.toLowerCase().indexOf(keyword.toLowerCase()) >= 0) {
        return post;
      }
    })
    .map(post => {
      return { title: post.title, path: post.url };
    });

  return searched;
};
