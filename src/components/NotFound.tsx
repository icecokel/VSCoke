"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NotFound = () => {
  const path = usePathname();
  const { push } = useRouter();
  useEffect(() => {
    localStorage.clear();
  }, []);

  return (
    <Container maxWidth="sm">
      <Stack direction={"column"} gap={10} sx={{ marginTop: "80px" }}>
        <Typography variant="h5" align="center">
          페이지를 찾을 수 없습니다.
        </Typography>
        <Alert severity="error">
          <Stack direction={"row"} alignItems={"flex-end"}>
            <Typography variant="body1" fontWeight={700}>
              {path}
            </Typography>
            <Typography variant="body2">을 페이지는 찾을 수 없습니다.</Typography>
          </Stack>
          <Typography variant="body2">
            파일 아이콘을 클릭해서 다른 페이지로 이동하거나 아래 버튼을 클릭해 메인 페이지로
            이동해주세요.
          </Typography>
        </Alert>
        <Button
          variant="text"
          onClick={() => {
            push("/");
          }}
        >
          메인으로 이동하기
        </Button>
      </Stack>
    </Container>
  );
};

export default NotFound;
