import { Client } from "@notionhq/client";
import type { NextApiRequest, NextApiResponse } from "next";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const { id } = req.query;
  console.log(id);
  if (id?.toString() === undefined) {
    res.status(400).json({ name: "John Doe" });
  } else {
    const response = await notion.pages.retrieve({ page_id: id?.toString() });

    console.log(response.properties);

    res.status(200).json({ name: "John Doe" });
  }
}
