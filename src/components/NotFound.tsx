"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
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
      <div className="mt-20 gap-[10px] flex flex-col">
        <Typography variant="h5" align="center">
          페이지를 찾을 수 없습니다.
        </Typography>
        <Alert severity="error">
          <div className="flex items-end">
            <Typography variant="body1" fontWeight={700}>
              {path}
            </Typography>
            <Typography variant="body2">을 페이지는 찾을 수 없습니다.</Typography>
          </div>
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
      </div>
    </Container>
  );
};

export default NotFound;
