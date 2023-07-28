import { ITree } from "@/components/Sidebar/components/Explorer";
import { Client } from "@notionhq/client";
import type { NextApiRequest, NextApiResponse } from "next";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const database_id = process.env.NOTION_DATABASE_ID ?? "";
  if (!database_id) {
    res.status(400).json({ message: "check Env" });
  }
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
    return {
      id: post.properties.title.title[0].plain_text,
      label: post.properties.title.title[0].plain_text,
      path: post.url,
    };
  });

  res.status(200).json({ id: "blog", label: "blog", items: posts });
}
