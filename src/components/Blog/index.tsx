"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { NotionRenderer } from "react-notion";
import useSWR from "swr";

interface IBlogProps {
  id: string;
}

// TODO 서버에서 호출 방안 고려
const Blog = ({ id }: IBlogProps) => {
  const { data, isLoading } = useSWR(`https://notion-api.splitbee.io/v1/page/${id}`);

  return (
    <Box className="bg-white p-5 md:p-10 rounded">
      {isLoading ? (
        <Stack justifyContent={"center"} alignItems={"center"} height={{ xs: 300, md: 500 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <NotionRenderer blockMap={data} />
      )}
    </Box>
  );
};

export default Blog;
