"use client";

import Container from "@ui/Container";
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
        <BaseText type="h4" className="text-center text-red-400/90 border-b pb-4">
          페이지를 찾을 수 없습니다.
        </BaseText>
        <div className="bg-beige-400 py-2 px-4 rounded text-black">
          <div className="flex items-end">
            <BaseText type="body1" className="text-yellow-200 font-bold mx-[0.5em]">
              "{path}"
            </BaseText>
            <BaseText type="body2">주소 페이지는 찾을 수 없습니다.</BaseText>
          </div>
          <BaseText type="body2">
            파일 아이콘을 클릭해서 다른 페이지로 이동하거나 아래 버튼을 클릭해 메인 페이지로
            이동해주세요.
          </BaseText>
        </div>
        <button
          className="text-yellow-200 mt-4"
          onClick={() => {
            push("/");
          }}
        >
          메인으로 이동하기
        </button>
      </div>
    </Container>
  );
};

export default NotFound;
