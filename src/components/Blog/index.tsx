"use client";

import { ITag, convertToElement } from "@/service/notion/parser";
import Container from "@mui/material/Container";
import useSWR from "swr";

interface IBlogProps {
  id: string;
}

const Blog = ({ id }: IBlogProps) => {
  const { data, isLoading } = useSWR<{ id: string; contents: ITag[]; pageData: any }>(
    `/api/getPost?pageId=${id}`,
  );

  return (
    <>
      {isLoading && "loading"}

      <Container maxWidth="lg">
        {data?.contents.map((item, index) => {
          return <div key={`ele_${index}`}>{convertToElement(item)}</div>;
        })}
      </Container>
    </>
  );
};

export default Blog;
