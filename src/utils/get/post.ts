import { ITree } from "@/hooks/useExplorer";
import notion from "@/service/notion";
import { cache } from "react";

//

// export const revalidate = 3600;

export const getPost = cache(async (id: string) => {
  const data = await fetch(`https://notion-api.splitbee.io/v1/page/${id}`).then(res => res.json());

  return {
    blockMap: data,
  };
});

export const getPosts = cache(async () => {
  const database_id = process.env.NOTION_DATABASE_ID ?? "";
  const response = await notion.databases.query({
    database_id: database_id,
    filter: {
      or: [
        {
          property: "publicationAt",
          date: {
            equals: new Date().toISOString(),
          },
        },
        {
          property: "publicationAt",
          date: {
            before: new Date().toISOString(),
          },
        },
      ],
    },
  });

  const posts: ITree[] = response.results.map((post: any) => {
    const url: string = post.url.slice(post.url.lastIndexOf("/") + 1);
    return {
      id: url,
      label: post.properties.title.title[0].plain_text,
      path: `/blog/${url}`,
    };
  });

  return { id: "blog", label: "blog", items: posts };
});
