import notion from "@/service/notion";
import { parseToHtml } from "@/service/notion/parser";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  const { pageId } = req.query;

  if (!pageId?.toString()) {
    res.status(400).json({ message: "check page id" });
  }

  const blockData = await notion.blocks.retrieve({ block_id: pageId?.toString() ?? "" });
  const blockChildData = await notion.blocks.children.list({ block_id: pageId?.toString() ?? "" });

  const html = parseToHtml(blockChildData);

  res.status(200).json({ id: pageId, contents: html });
}
