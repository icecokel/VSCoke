"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import { NotionRenderer } from "react-notion";
import useSWR from "swr";

interface IBlogProps {
  id: string;
}

const Blog = ({ id }: IBlogProps) => {
  const { data, isLoading } = useSWR(`https://notion-api.splitbee.io/v1/page/${id}`);

  return (
    <Container maxWidth="lg" className="bg-white p-5 md:p-10">
      {isLoading ? (
        <Stack justifyContent={"center"} alignItems={"center"} height={{ xs: 300, md: 500 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <NotionRenderer blockMap={data} />
      )}
    </Container>
  );
};

export default Blog;
