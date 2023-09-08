import { ITree } from "@/components/Sidebar/components/Explorer";
import notion from "@/service/notion";
import { cache } from "react";

export const revalidate = 3600; // revalidate the data at most every hour

export const getPost = cache(async (id: string) => {
  const pageData = await notion.blocks.retrieve({ block_id: id?.toString() ?? "" });
  const blockChildData = await notion.blocks.children.list({ block_id: id?.toString() ?? "" });
  return { id, pageData, blockChildData };
});
