"use client";

import { ITag, convertToElement } from "@/service/notion/parser";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
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
      {isLoading && (
        <Stack justifyContent={"center"} alignItems={"center"} height={{ xs: 300, md: 500 }}>
          <CircularProgress />
        </Stack>
      )}

      <Container maxWidth="lg">
        {data?.contents.map((item, index) => {
          return <div key={`ele_${index}`}>{convertToElement(item)}</div>;
        })}
      </Container>
    </>
  );
};

export default Blog;
