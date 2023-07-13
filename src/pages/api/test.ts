// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Client } from "@notionhq/client";
import type { NextApiRequest, NextApiResponse } from "next";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const databaseId = "4e781252909b4ab694f2988282aba05f";
  const response = await notion.databases.retrieve({ database_id: databaseId });

  const response2 = await notion.databases.query({
    database_id: databaseId,
    // filter: {
    //   and: [
    //     {

    //     }
    //   ]

    // }
  });
  response2.results.forEach((row: any) => {
    console.log(row.properties["상품 명"].title[0].plain_text);
  });

  res.status(200).json({ name: "John Doe" });
}
