"use client";

import { ITag, convertToElement } from "@/service/notion/parser";
import useSWR from "swr";

interface IBlogProps {
  id: string;
}

const Blog = ({ id }: IBlogProps) => {
  const { data, isLoading } = useSWR<{ id: string; contents: ITag[] }>(`/api/getPost?pageId=${id}`);

  return (
    <>
      {isLoading && "loading"}

      {data?.contents.map((item, index) => {
        return <div key={`ele_${index}`}>{convertToElement(item)}</div>;
      })}
    </>
  );
};

export default Blog;
