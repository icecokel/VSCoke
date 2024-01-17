"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import BaseText from "@ui/Text";
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
        <BaseText type="h5" className="text-center">
          페이지를 찾을 수 없습니다.
        </BaseText>
        <Alert severity="error">
          <div className="flex items-end">
            <BaseText type="body1">{path}</BaseText>
            <BaseText type="body2">을 페이지는 찾을 수 없습니다.</BaseText>
          </div>
          <BaseText type="body2">
            파일 아이콘을 클릭해서 다른 페이지로 이동하거나 아래 버튼을 클릭해 메인 페이지로
            이동해주세요.
          </BaseText>
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
