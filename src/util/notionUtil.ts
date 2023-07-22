// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export const getDatabaseById = async (id: string) => {
  const response = await notion.databases.retrieve({ database_id: id });

  // TODO 데이터 파싱
  return response;
};

export const getPageById = async (id: string) => {
  console.log(id);
  const response = await notion.pages.retrieve({ page_id: id });

  console.log(response);
  return response;
};

//https://www.notion.so/a2e9e58d2f6c4b23ac52d45e7cb17af1?pvs=4
