// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export const getDatabaseById = async (id: string) => {
  const response = await notion.databases.retrieve({ database_id: id });

  // TODO 데이터 파싱
  return response;
};
